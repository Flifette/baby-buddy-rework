import asyncio
import os
import sys
import unittest
from contextlib import contextmanager
from pathlib import Path
from unittest.mock import patch

import httpx
from fastapi.testclient import TestClient
from starlette.requests import ClientDisconnect

os.environ.setdefault("HA_ADDON_MODE", "true")
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "baby-buddy-dashboard"))

from backend import server


class TrackedBody(httpx.AsyncByteStream):
    def __init__(self, *chunks, error=None):
        self.chunks = chunks
        self.error = error
        self.closed = False

    async def __aiter__(self):
        for chunk in self.chunks:
            yield chunk
        if self.error:
            raise self.error

    async def aclose(self):
        self.closed = True


class StalledBody(TrackedBody):
    async def __aiter__(self):
        yield b'{"partial":'
        await asyncio.Event().wait()


@contextmanager
def fake_upstream(handler, *, addon_mode=True):
    async_client = httpx.AsyncClient

    def make_client(**options):
        return async_client(**options, transport=httpx.MockTransport(handler))

    with (
        patch.object(server, "HA_ADDON_MODE", addon_mode),
        patch.object(server, "DEMO_MODE", False),
        patch.object(server, "DASHBOARD_USERNAME", "dashboard"),
        patch.object(server, "DASHBOARD_PASSWORD", "a-test-password-long-enough"),
        patch.object(server, "BABY_BUDDY_URL", "https://baby-buddy.invalid"),
        patch.object(server, "BABY_BUDDY_API_KEY", "test-token"),
        patch.object(server.httpx, "AsyncClient", make_client),
    ):
        with TestClient(server.app) as client:
            yield client


class ProxyReliabilityTests(unittest.TestCase):
    def test_response_interrupted_after_headers_returns_a_gateway_timeout(self):
        body = TrackedBody(b'{"results":', error=httpx.ReadTimeout("private error text"))
        with fake_upstream(lambda request: httpx.Response(200, stream=body)) as client:
            with self.assertLogs(server.logger, "WARNING") as logs:
                response = client.get("/api/baby-buddy/sleep/")

        self.assertEqual(response.status_code, 504)
        self.assertEqual(response.json()["detail"]["code"], "baby_buddy_timeout")
        self.assertTrue(body.closed)
        self.assertIn("resource=sleep phase=body", logs.output[0])
        self.assertNotIn("private error text", logs.output[0])

    def test_total_deadline_closes_a_stalled_body(self):
        body = StalledBody()
        with (
            patch.object(server, "UPSTREAM_DEADLINE_SECONDS", 0.01),
            fake_upstream(lambda request: httpx.Response(200, stream=body)) as client,
        ):
            response = client.get("/api/baby-buddy/children/")

        self.assertEqual(response.status_code, 504)
        self.assertTrue(body.closed)

    def test_interrupted_write_response_is_unconfirmed_without_retry(self):
        calls = []
        body = TrackedBody(b'{"id":', error=httpx.ReadTimeout("response lost"))

        def upstream(request):
            calls.append(request.method)
            return httpx.Response(201, stream=body)

        with fake_upstream(upstream) as client:
            response = client.post("/api/baby-buddy/sleep/", json={"child": 1})

        self.assertEqual(response.status_code, 504)
        self.assertEqual(response.json()["detail"]["code"], "baby_buddy_unconfirmed_write")
        self.assertEqual(calls, ["POST"])
        self.assertTrue(body.closed)

    def test_connect_failure_has_a_different_code_from_unconfirmed_write(self):
        def upstream(request):
            raise httpx.ConnectError("connection unavailable", request=request)

        with fake_upstream(upstream) as client:
            response = client.post("/api/baby-buddy/changes/", json={"child": 1})

        self.assertEqual(response.status_code, 502)
        self.assertEqual(response.json()["detail"]["code"], "baby_buddy_unavailable")

    def test_upstream_gateway_error_cannot_confirm_a_write(self):
        def upstream(request):
            return httpx.Response(502, text="private gateway error")

        with fake_upstream(upstream) as client:
            response = client.patch("/api/baby-buddy/feedings/1/", json={"amount": 40})

        self.assertEqual(response.status_code, 502)
        self.assertEqual(response.json()["detail"]["code"], "baby_buddy_unconfirmed_write")
        self.assertNotIn("private gateway error", response.text)

    def test_preserves_validation_errors_and_successful_empty_deletes(self):
        def upstream(request):
            if request.method == "DELETE":
                return httpx.Response(204)
            return httpx.Response(400, json={"start": ["An example validation error."]})

        with fake_upstream(upstream) as client:
            validation = client.post("/api/baby-buddy/sleep/", json={})
            delete = client.delete("/api/baby-buddy/sleep/1/")

        self.assertEqual(validation.status_code, 400)
        self.assertEqual(validation.json(), {"start": ["An example validation error."]})
        self.assertEqual(delete.status_code, 204)
        self.assertEqual(delete.content, b"")

    def test_invalid_or_oversized_successful_bodies_are_rejected_and_closed(self):
        for content, limit in ((b"<html>Unexpected login page</html>", 100), (b'{"count":1}', 5)):
            with self.subTest(limit=limit):
                body = TrackedBody(content)
                with (
                    patch.object(server, "MAX_API_RESPONSE_BYTES", limit),
                    fake_upstream(lambda request: httpx.Response(200, stream=body)) as client,
                ):
                    response = client.get("/api/baby-buddy/children/")

                self.assertEqual(response.status_code, 502)
                self.assertEqual(response.json()["detail"]["code"], "baby_buddy_invalid_response")
                self.assertTrue(body.closed)

    def test_media_can_still_be_served_as_a_stream_and_closed(self):
        body = TrackedBody(b"some ", b"image bytes")
        with fake_upstream(
            lambda request: httpx.Response(200, headers={"Content-Type": "image/png"}, stream=body)
        ) as client:
            response = client.get("/api/media/child.png")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["content-type"], "image/png")
        self.assertEqual(response.content, b"some image bytes")
        self.assertTrue(body.closed)


class MediaCleanupTests(unittest.IsolatedAsyncioTestCase):
    async def test_upstream_closes_if_the_client_disconnects_before_reading_media(self):
        body = TrackedBody(b"image")
        upstream = httpx.Response(
            200, stream=body, request=httpx.Request("GET", "https://baby-buddy.invalid/media/child.png"),
        )
        response = server.UpstreamMediaResponse(upstream)

        async def send(message):
            raise OSError("client disconnected")

        async def receive():
            self.fail("ASGI 2.4 surfaces disconnects through send")

        with self.assertRaises(ClientDisconnect):
            await response({"type": "http", "asgi": {"spec_version": "2.4"}}, receive, send)

        self.assertTrue(body.closed)


class ReadinessTests(unittest.TestCase):
    def test_readiness_checks_authenticated_api_and_returns_no_child_data(self):
        def upstream(request):
            self.assertEqual(request.method, "GET")
            self.assertEqual(request.url.path, "/api/children/")
            self.assertEqual(request.url.params.get("limit"), "1")
            self.assertEqual(request.headers["authorization"], "Token test-token")
            return httpx.Response(200, json={"results": [{"id": 1, "name": "private-data"}]})

        with fake_upstream(upstream) as client:
            response = client.get("/api/ready")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ready"})
        self.assertEqual(response.headers["cache-control"], "no-store")

    def test_readiness_fails_for_rejected_upstream_credentials(self):
        with fake_upstream(lambda request: httpx.Response(403, text="upstream information")) as client:
            response = client.get("/api/ready")
            liveness = client.get("/healthz")

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json(), {"status": "not_ready"})
        self.assertEqual(liveness.status_code, 200)

    def test_readiness_respects_standalone_auth(self):
        def unexpected_request(request):
            self.fail("An unauthenticated readiness check must not reach Baby Buddy")

        with fake_upstream(unexpected_request, addon_mode=False) as client:
            response = client.get("/api/ready")

        self.assertEqual(response.status_code, 401)
