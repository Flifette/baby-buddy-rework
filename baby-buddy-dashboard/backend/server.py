import os
import json
import asyncio
import base64
import binascii
import hmac
import html
import logging
import uuid
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from time import monotonic

from anyio import CancelScope
from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
import httpx
from starlette.types import Receive, Scope, Send

# --- Configuration ---

def normalize_baby_buddy_url(value: str) -> str:
    """Return a URL accepted by httpx from an add-on option value."""
    value = str(value or "").strip().strip("\"'").rstrip("/")
    if value and not value.startswith(("http://", "https://")):
        value = f"https://{value}"
    return value


BABY_BUDDY_URL = normalize_baby_buddy_url(os.environ.get("BABY_BUDDY_URL", ""))
BABY_BUDDY_API_KEY = os.environ.get("BABY_BUDDY_API_KEY", "")
REFRESH_INTERVAL = int(os.environ.get("REFRESH_INTERVAL", "30"))
DEMO_MODE = os.environ.get("DEMO_MODE", "").lower() in ("true", "1", "yes")
UNIT_SYSTEM = os.environ.get("UNIT_SYSTEM", "metric").lower()
HA_ADDON_MODE = os.environ.get("HA_ADDON_MODE", "").lower() in ("true", "1", "yes")
DASHBOARD_USERNAME = os.environ.get("DASHBOARD_USERNAME", "")
DASHBOARD_PASSWORD = os.environ.get("DASHBOARD_PASSWORD", "")
MAX_REQUEST_BODY_BYTES = int(os.environ.get("MAX_REQUEST_BODY_BYTES", str(1024 * 1024)))
MAX_MILK_WASTE_ENTRIES = int(os.environ.get("MAX_MILK_WASTE_ENTRIES", "10000"))
MAX_MILK_WASTE_FILE_BYTES = int(
    os.environ.get("MAX_MILK_WASTE_FILE_BYTES", str(10 * 1024 * 1024))
)

# Fallback: read from HA add-on options.json
if not BABY_BUDDY_URL:
    options_path = Path("/data/options.json")
    if options_path.exists():
        opts = json.loads(options_path.read_text())
        BABY_BUDDY_URL = normalize_baby_buddy_url(opts.get("baby_buddy_url", ""))
        BABY_BUDDY_API_KEY = opts.get("baby_buddy_api_key", "")
        REFRESH_INTERVAL = opts.get("refresh_interval", 30)
        DEMO_MODE = DEMO_MODE or opts.get("demo_mode", False)
        UNIT_SYSTEM = opts.get("unit_system", UNIT_SYSTEM)

STATIC_DIR = Path(__file__).parent.parent / "static"
MILK_WASTE_FILE = Path(os.environ.get("MILK_WASTE_FILE", "/data/milk-waste.json"))
milk_waste_lock = asyncio.Lock()

logger = logging.getLogger("uvicorn.error.baby_buddy")
UPSTREAM_DEADLINE_SECONDS = 20
MAX_API_RESPONSE_BYTES = 16 * 1024 * 1024
UPSTREAM_RESOURCES = frozenset({
    "children", "feedings", "sleep", "changes", "tummy-times", "temperature",
    "weight", "height", "pumping", "notes", "timers",
})
WRITE_METHODS = frozenset({"POST", "PATCH", "PUT", "DELETE"})
UPSTREAM_ERROR_MESSAGES = {
    "baby_buddy_unavailable": "Cannot connect to Baby Buddy",
    "baby_buddy_timeout": "Baby Buddy request timed out",
    "baby_buddy_unconfirmed_write": "Baby Buddy did not confirm the change",
    "baby_buddy_invalid_response": "Baby Buddy sent an invalid or incomplete response",
}

# --- App lifecycle ---

http_client: httpx.AsyncClient | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global http_client
    if not HA_ADDON_MODE and (
        not DASHBOARD_USERNAME or len(DASHBOARD_PASSWORD) < 16
    ):
        raise RuntimeError(
            "Standalone mode requires DASHBOARD_USERNAME and a "
            "DASHBOARD_PASSWORD of at least 16 characters"
        )
    http_client = httpx.AsyncClient(
        base_url=BABY_BUDDY_URL,
        headers={
            "Authorization": f"Token {BABY_BUDDY_API_KEY}",
            "Content-Type": "application/json",
        },
        timeout=httpx.Timeout(15.0, connect=5.0, pool=5.0),
        limits=httpx.Limits(max_connections=10, max_keepalive_connections=5),
    )
    yield
    await http_client.aclose()


app = FastAPI(lifespan=lifespan)


# --- API routes ---


def valid_basic_auth(header: str, username: str, password: str) -> bool:
    if not header.startswith("Basic "):
        return False
    try:
        decoded = base64.b64decode(header[6:], validate=True).decode("utf-8")
        supplied_username, supplied_password = decoded.split(":", 1)
    except (binascii.Error, UnicodeDecodeError, ValueError):
        return False
    return hmac.compare_digest(supplied_username, username) and hmac.compare_digest(
        supplied_password, password
    )


@app.middleware("http")
async def require_standalone_authentication(request: Request, call_next):
    if HA_ADDON_MODE or request.url.path == "/healthz":
        return await call_next(request)
    if not valid_basic_auth(
        request.headers.get("authorization", ""),
        DASHBOARD_USERNAME,
        DASHBOARD_PASSWORD,
    ):
        return Response(
            status_code=401,
            headers={"WWW-Authenticate": 'Basic realm="Baby Buddy Dashboard"'},
        )
    return await call_next(request)


@app.get("/healthz")
async def healthcheck():
    return {"status": "ok"}


async def read_limited_body(request: Request) -> bytes:
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) > MAX_REQUEST_BODY_BYTES:
                raise HTTPException(413, "Request body too large")
        except ValueError as exc:
            raise HTTPException(400, "Invalid Content-Length header") from exc

    body = bytearray()
    async for chunk in request.stream():
        body.extend(chunk)
        if len(body) > MAX_REQUEST_BODY_BYTES:
            raise HTTPException(413, "Request body too large")
    return bytes(body)


async def read_json_object(request: Request) -> dict:
    try:
        payload = json.loads((await read_limited_body(request)).decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise HTTPException(400, "Invalid JSON body") from exc
    if not isinstance(payload, dict):
        raise HTTPException(422, "JSON body must be an object")
    return payload


def read_milk_waste_entries() -> list[dict]:
    if not MILK_WASTE_FILE.exists():
        return []
    try:
        if MILK_WASTE_FILE.stat().st_size > MAX_MILK_WASTE_FILE_BYTES:
            raise HTTPException(507, "Milk waste storage limit exceeded")
        data = json.loads(MILK_WASTE_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise HTTPException(500, "Unable to read milk waste data") from exc
    if not isinstance(data, list):
        raise HTTPException(500, "Invalid milk waste data")
    return data


def write_milk_waste_entries(entries: list[dict]) -> None:
    try:
        serialized = json.dumps(entries, ensure_ascii=False, indent=2) + "\n"
        if len(serialized.encode("utf-8")) > MAX_MILK_WASTE_FILE_BYTES:
            raise HTTPException(507, "Milk waste storage limit exceeded")
        MILK_WASTE_FILE.parent.mkdir(parents=True, exist_ok=True)
        temp_path = MILK_WASTE_FILE.with_suffix(".tmp")
        temp_path.write_text(serialized, encoding="utf-8")
        temp_path.replace(MILK_WASTE_FILE)
    except OSError as exc:
        raise HTTPException(500, "Unable to save milk waste data") from exc


def validate_milk_waste(payload: dict, existing_id: str | None = None) -> dict:
    try:
        child = int(payload.get("child"))
        amount = float(payload.get("amount"))
        time = str(payload.get("time", "")).strip()
        datetime.fromisoformat(time.replace("Z", "+00:00"))
    except (TypeError, ValueError) as exc:
        raise HTTPException(422, "Invalid milk waste occurrence") from exc
    if child <= 0 or amount <= 0 or amount > 5000:
        raise HTTPException(422, "Invalid milk waste occurrence")
    return {
        "id": existing_id or str(uuid.uuid4()),
        "child": child,
        "amount": round(amount, 1),
        "time": time,
        "note": str(payload.get("note", "")).strip()[:500],
    }


@app.get("/api/milk-waste")
async def get_milk_waste(child: int | None = None, start_min: str | None = None, start_max: str | None = None):
    entries = read_milk_waste_entries()
    if child is not None:
        entries = [entry for entry in entries if entry.get("child") == child]
    if start_min:
        entries = [entry for entry in entries if str(entry.get("time", "")) >= start_min]
    if start_max:
        entries = [entry for entry in entries if str(entry.get("time", "")) <= start_max]
    return sorted(entries, key=lambda entry: entry.get("time", ""), reverse=True)


@app.post("/api/milk-waste", status_code=201)
async def create_milk_waste(request: Request):
    entry = validate_milk_waste(await read_json_object(request))
    async with milk_waste_lock:
        entries = read_milk_waste_entries()
        if len(entries) >= MAX_MILK_WASTE_ENTRIES:
            raise HTTPException(507, "Milk waste occurrence limit exceeded")
        entries.append(entry)
        write_milk_waste_entries(entries)
    return entry


@app.patch("/api/milk-waste/{entry_id}")
async def update_milk_waste(entry_id: str, request: Request):
    payload = await read_json_object(request)
    async with milk_waste_lock:
        entries = read_milk_waste_entries()
        index = next((i for i, entry in enumerate(entries) if entry.get("id") == entry_id), None)
        if index is None:
            raise HTTPException(404, "Milk waste occurrence not found")
        entries[index] = validate_milk_waste(payload, entry_id)
        write_milk_waste_entries(entries)
        return entries[index]


@app.delete("/api/milk-waste/{entry_id}", status_code=204)
async def delete_milk_waste(entry_id: str):
    async with milk_waste_lock:
        entries = read_milk_waste_entries()
        filtered = [entry for entry in entries if entry.get("id") != entry_id]
        if len(filtered) == len(entries):
            raise HTTPException(404, "Milk waste occurrence not found")
        write_milk_waste_entries(filtered)
    return Response(status_code=204)


@app.get("/api/config")
async def get_config():
    return {"refresh_interval": REFRESH_INTERVAL, "demo_mode": DEMO_MODE, "unit_system": UNIT_SYSTEM}


def log_upstream_result(method, resource, phase, started, outcome, level=logging.WARNING):
    logger.log(
        level, "Baby Buddy method=%s resource=%s phase=%s outcome=%s elapsed_ms=%d",
        method, resource, phase, outcome, round((monotonic() - started) * 1000),
    )


def upstream_error(method, resource, phase, started, outcome, status, code, *, write_uncertain=False):
    log_upstream_result(method, resource, phase, started, outcome)
    if method in WRITE_METHODS and write_uncertain:
        code = "baby_buddy_unconfirmed_write"
    return HTTPException(status, {"code": code, "message": UPSTREAM_ERROR_MESSAGES[code]})


def upstream_transport_error(method, resource, phase, started, error):
    timed_out = isinstance(error, (httpx.TimeoutException, TimeoutError))
    known_unsent = isinstance(
        error, (httpx.ConnectError, httpx.ConnectTimeout, httpx.PoolTimeout, httpx.UnsupportedProtocol)
    )
    return upstream_error(
        method, resource, phase, started, type(error).__name__,
        504 if timed_out else 502,
        "baby_buddy_timeout" if timed_out else "baby_buddy_unavailable",
        write_uncertain=not known_unsent,
    )


async def fetch_baby_buddy_api(method, path, *, params=None, body=None):
    resource = path.partition("/")[0]
    if resource not in UPSTREAM_RESOURCES:
        resource = "other"
    started = monotonic()
    phase = "headers"
    content = bytearray()
    try:
        async with asyncio.timeout(UPSTREAM_DEADLINE_SECONDS):
            async with http_client.stream(
                method, f"/api/{path}", params=params, content=body,
            ) as response:
                if response.status_code == 408 or response.is_server_error:
                    timed_out = response.status_code in (408, 504)
                    raise upstream_error(
                        method, resource, phase, started, response.status_code,
                        504 if timed_out else 502,
                        "baby_buddy_timeout" if timed_out else "baby_buddy_unavailable",
                        write_uncertain=True,
                    )
                phase = "body"
                async for chunk in response.aiter_bytes():
                    if len(content) + len(chunk) > MAX_API_RESPONSE_BYTES:
                        raise upstream_error(
                            method, resource, phase, started, "response_too_large",
                            502, "baby_buddy_invalid_response", write_uncertain=True,
                        )
                    content.extend(chunk)
    except (httpx.RequestError, TimeoutError) as error:
        raise upstream_transport_error(method, resource, phase, started, error) from None

    payload = None
    if response.is_success and response.status_code not in (204, 205):
        try:
            payload = json.loads(content)
        except (UnicodeDecodeError, ValueError, RecursionError):
            raise upstream_error(
                method, resource, "body", started, "invalid_json",
                502, "baby_buddy_invalid_response", write_uncertain=True,
            ) from None
    if response.is_error or monotonic() - started >= 3:
        log_upstream_result(
            method, resource, "complete", started, response.status_code,
            logging.WARNING if response.is_error else logging.INFO,
        )
    return response, bytes(content), payload


@app.get("/api/ready", include_in_schema=False)
async def readiness():
    """Check connectivity and upstream credentials without returning child data."""
    status = "not_ready"
    if DEMO_MODE:
        status = "demo"
    elif BABY_BUDDY_URL and BABY_BUDDY_API_KEY:
        try:
            response, _, payload = await fetch_baby_buddy_api("GET", "children/", params={"limit": 1})
            if response.is_success and (
                isinstance(payload, list)
                or isinstance(payload, dict) and isinstance(payload.get("results"), list)
            ):
                status = "ready"
        except HTTPException:
            pass
    return JSONResponse(
        {"status": status}, status_code=503 if status == "not_ready" else 200,
        headers={"Cache-Control": "no-store"},
    )


@app.api_route(
    "/api/baby-buddy/{path:path}",
    methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
)
async def proxy_baby_buddy(path: str, request: Request):
    """Proxy requests to the remote Baby Buddy API."""
    body = None
    if request.method in ("POST", "PATCH", "PUT"):
        body = await read_limited_body(request)

    response, content, _ = await fetch_baby_buddy_api(
        request.method, path, params=dict(request.query_params), body=body,
    )

    excluded_headers = {"transfer-encoding", "content-encoding", "content-length", "connection", "server"}
    response_headers = {
        k: v
        for k, v in response.headers.items()
        if k.lower() not in excluded_headers
    }

    return Response(content, status_code=response.status_code, headers=response_headers)


class UpstreamMediaResponse(StreamingResponse):
    def __init__(self, upstream: httpx.Response):
        super().__init__(
            upstream.aiter_bytes(),
            headers={"Content-Type": upstream.headers.get("content-type", "application/octet-stream")},
        )
        self.upstream = upstream

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        started = monotonic()
        try:
            await super().__call__(scope, receive, send)
        except httpx.RequestError as error:
            log_upstream_result("GET", "media", "body", started, type(error).__name__)
            raise
        finally:
            with CancelScope(shield=True):
                await self.upstream.aclose()


@app.get("/api/media/{path:path}")
async def proxy_media(path: str):
    """Proxy media files (e.g. child photos) from Baby Buddy."""
    started = monotonic()
    try:
        upstream_request = http_client.build_request(
            "GET", f"/{path}", headers={"Accept": "*/*"}
        )
        response = await http_client.send(upstream_request, stream=True)
    except httpx.RequestError as error:
        raise upstream_transport_error("GET", "media", "headers", started, error) from None

    if response.status_code != 200:
        await response.aclose()
        raise HTTPException(response.status_code, "Media not found")

    return UpstreamMediaResponse(response)


# --- Static files (React SPA) ---


def resolve_static_file(path: str, static_dir: Path = STATIC_DIR) -> Path | None:
    root = static_dir.resolve()
    candidate = (root / path).resolve()
    if not candidate.is_relative_to(root) or not candidate.is_file():
        return None
    return candidate

if STATIC_DIR.exists():
    assets_dir = STATIC_DIR / "assets"
    if assets_dir.exists():
        app.mount(
            "/assets", StaticFiles(directory=str(assets_dir)), name="assets"
        )

    @app.get("/{path:path}")
    async def serve_spa(path: str, request: Request):
        file_path = resolve_static_file(path)
        if file_path is not None:
            return FileResponse(file_path)

        # Inject <base> tag with ingress path so relative URLs resolve correctly
        ingress_path = request.headers.get("X-Ingress-Path", "")
        index_html = (STATIC_DIR / "index.html").read_text(encoding="utf-8")
        if ingress_path:
            base_href = html.escape(ingress_path.rstrip("/") + "/", quote=True)
            index_html = index_html.replace("<head>", f'<head><base href="{base_href}">', 1)

        return Response(
            content=index_html,
            media_type="text/html",
            headers={"Cache-Control": "no-cache"},
        )
