import os
import json
import asyncio
import uuid
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import httpx

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

# --- App lifecycle ---

http_client: httpx.AsyncClient | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global http_client
    http_client = httpx.AsyncClient(
        base_url=BABY_BUDDY_URL,
        headers={
            "Authorization": f"Token {BABY_BUDDY_API_KEY}",
            "Content-Type": "application/json",
        },
        timeout=15.0,
        limits=httpx.Limits(max_connections=10, max_keepalive_connections=5),
    )
    yield
    await http_client.aclose()


app = FastAPI(lifespan=lifespan)


# --- API routes ---


def read_milk_waste_entries() -> list[dict]:
    if not MILK_WASTE_FILE.exists():
        return []
    try:
        data = json.loads(MILK_WASTE_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise HTTPException(500, "Unable to read milk waste data") from exc
    if not isinstance(data, list):
        raise HTTPException(500, "Invalid milk waste data")
    return data


def write_milk_waste_entries(entries: list[dict]) -> None:
    try:
        MILK_WASTE_FILE.parent.mkdir(parents=True, exist_ok=True)
        temp_path = MILK_WASTE_FILE.with_suffix(".tmp")
        temp_path.write_text(
            json.dumps(entries, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
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
    entry = validate_milk_waste(await request.json())
    async with milk_waste_lock:
        entries = read_milk_waste_entries()
        entries.append(entry)
        write_milk_waste_entries(entries)
    return entry


@app.patch("/api/milk-waste/{entry_id}")
async def update_milk_waste(entry_id: str, request: Request):
    async with milk_waste_lock:
        entries = read_milk_waste_entries()
        index = next((i for i, entry in enumerate(entries) if entry.get("id") == entry_id), None)
        if index is None:
            raise HTTPException(404, "Milk waste occurrence not found")
        entries[index] = validate_milk_waste(await request.json(), entry_id)
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


@app.api_route(
    "/api/baby-buddy/{path:path}",
    methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
)
async def proxy_baby_buddy(path: str, request: Request):
    """Proxy requests to the remote Baby Buddy API."""
    target_url = f"/api/{path}"
    params = dict(request.query_params)

    body = None
    content_type = request.headers.get("content-type", "")
    if request.method in ("POST", "PATCH", "PUT"):
        body = await request.body()

    try:
        headers = {}
        if body and "application/json" in content_type:
            headers["Content-Type"] = "application/json"

        response = await http_client.request(
            method=request.method,
            url=target_url,
            params=params,
            content=body,
            headers=headers,
        )
    except httpx.ConnectError:
        raise HTTPException(502, "Cannot connect to Baby Buddy")
    except httpx.TimeoutException:
        raise HTTPException(504, "Baby Buddy request timed out")

    excluded_headers = {"transfer-encoding", "content-encoding", "content-length", "connection", "server"}
    response_headers = {
        k: v
        for k, v in response.headers.items()
        if k.lower() not in excluded_headers
    }

    return Response(
        content=response.content,
        status_code=response.status_code,
        headers=response_headers,
    )


@app.get("/api/media/{path:path}")
async def proxy_media(path: str):
    """Proxy media files (e.g. child photos) from Baby Buddy."""
    try:
        response = await http_client.get(
            f"/{path}",
            headers={"Accept": "*/*"},
        )
    except httpx.ConnectError:
        raise HTTPException(502, "Cannot connect to Baby Buddy")
    except httpx.TimeoutException:
        raise HTTPException(504, "Baby Buddy request timed out")

    if response.status_code != 200:
        raise HTTPException(response.status_code, "Media not found")

    return Response(
        content=response.content,
        headers={"Content-Type": response.headers.get("content-type", "application/octet-stream")},
    )


# --- Static files (React SPA) ---

if STATIC_DIR.exists():
    assets_dir = STATIC_DIR / "assets"
    if assets_dir.exists():
        app.mount(
            "/assets", StaticFiles(directory=str(assets_dir)), name="assets"
        )

    @app.get("/{path:path}")
    async def serve_spa(path: str, request: Request):
        file_path = STATIC_DIR / path
        if file_path.is_file() and ".." not in path:
            return FileResponse(file_path)

        # Inject <base> tag with ingress path so relative URLs resolve correctly
        ingress_path = request.headers.get("X-Ingress-Path", "")
        index_html = (STATIC_DIR / "index.html").read_text()
        if ingress_path:
            base_href = ingress_path.rstrip("/") + "/"
            index_html = index_html.replace("<head>", f'<head><base href="{base_href}">', 1)

        return Response(
            content=index_html,
            media_type="text/html",
            headers={"Cache-Control": "no-cache"},
        )
