import base64
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

os.environ.setdefault("HA_ADDON_MODE", "true")
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "baby-buddy-dashboard"))

from backend import server


class StaticFileSecurityTests(unittest.TestCase):
    def test_static_resolution_accepts_only_files_below_static_root(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / "static"
            root.mkdir()
            asset = root / "app.js"
            asset.write_text("ok", encoding="utf-8")
            outside = Path(directory) / "secret.txt"
            outside.write_text("secret", encoding="utf-8")

            self.assertEqual(server.resolve_static_file("app.js", root), asset.resolve())
            self.assertIsNone(server.resolve_static_file("../secret.txt", root))
            self.assertIsNone(server.resolve_static_file(str(outside.resolve()), root))


class AuthenticationTests(unittest.TestCase):
    def test_basic_auth_requires_exact_credentials(self):
        valid = "Basic " + base64.b64encode(b"dashboard:a-very-long-password").decode()
        wrong = "Basic " + base64.b64encode(b"dashboard:wrong-password").decode()

        self.assertTrue(
            server.valid_basic_auth(valid, "dashboard", "a-very-long-password")
        )
        self.assertFalse(
            server.valid_basic_auth(wrong, "dashboard", "a-very-long-password")
        )
        self.assertFalse(
            server.valid_basic_auth("Bearer arbitrary", "dashboard", "a-very-long-password")
        )

    def test_standalone_routes_require_authentication(self):
        with patch.object(server, "HA_ADDON_MODE", False), patch.object(
            server, "DASHBOARD_USERNAME", "dashboard"
        ), patch.object(
            server, "DASHBOARD_PASSWORD", "a-very-long-password"
        ), patch.object(
            server, "BABY_BUDDY_URL", "http://baby-buddy.invalid"
        ):
            with TestClient(server.app) as client:
                denied = client.get("/api/config")
                allowed = client.get(
                    "/api/config", auth=("dashboard", "a-very-long-password")
                )

        self.assertEqual(denied.status_code, 401)
        self.assertEqual(denied.headers["www-authenticate"], 'Basic realm="Baby Buddy Dashboard"')
        self.assertEqual(allowed.status_code, 200)

    def test_addon_mode_preserves_ingress_access(self):
        with patch.object(server, "HA_ADDON_MODE", True), patch.object(
            server, "BABY_BUDDY_URL", "http://baby-buddy.invalid"
        ):
            with TestClient(server.app) as client:
                response = client.get("/api/config")

        self.assertEqual(response.status_code, 200)


class RequestLimitTests(unittest.TestCase):
    def test_oversized_body_is_rejected_before_json_parsing(self):
        with patch.object(server, "HA_ADDON_MODE", True), patch.object(
            server, "MAX_REQUEST_BODY_BYTES", 32
        ), patch.object(
            server, "BABY_BUDDY_URL", "http://baby-buddy.invalid"
        ):
            with TestClient(server.app) as client:
                response = client.post(
                    "/api/milk-waste",
                    content=b"{" + b"x" * 64 + b"}",
                    headers={"content-type": "application/json"},
                )

        self.assertEqual(response.status_code, 413)


class MilkWasteLimitTests(unittest.TestCase):
    def test_storage_size_limit_rejects_oversized_data(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "milk-waste.json"
            with patch.object(server, "MILK_WASTE_FILE", target), patch.object(
                server, "MAX_MILK_WASTE_FILE_BYTES", 32
            ):
                with self.assertRaises(server.HTTPException) as raised:
                    server.write_milk_waste_entries(
                        [{"id": "one", "child": 1, "amount": 10, "note": "x" * 50}]
                    )
                self.assertEqual(raised.exception.status_code, 507)
                self.assertFalse(target.exists())

    def test_normal_storage_round_trip_is_preserved(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "milk-waste.json"
            entries = [
                {
                    "id": "one",
                    "child": 1,
                    "amount": 10.0,
                    "time": "2026-08-11T00:00:00+02:00",
                    "note": "",
                }
            ]
            with patch.object(server, "MILK_WASTE_FILE", target), patch.object(
                server, "MAX_MILK_WASTE_FILE_BYTES", 4096
            ):
                server.write_milk_waste_entries(entries)
                self.assertEqual(server.read_milk_waste_entries(), entries)
                self.assertEqual(json.loads(target.read_text(encoding="utf-8")), entries)


if __name__ == "__main__":
    unittest.main()
