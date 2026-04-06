from __future__ import annotations

from io import BytesIO
import json
from pathlib import Path
import sys
import unittest


PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from bomkit_parts.server import PartsRequestHandler, resolve_get_request


class PartsServerTest(unittest.TestCase):
    def test_root_returns_server_info(self) -> None:
        status, payload = resolve_get_request("/")

        self.assertEqual(status, 200)
        self.assertEqual(payload["name"], "BOMKit Parts")
        self.assertEqual(payload["version"], "0.1.0")
        self.assertEqual(payload["endpoints"], ["/categories", "/parts?category_id=<id>", "/parts/{id}"])

    def test_get_categories(self) -> None:
        status, payload = resolve_get_request("/categories")

        self.assertEqual(status, 200)
        self.assertEqual([item["id"] for item in payload["categories"]], ["resistors", "capacitors", "regulators"])

    def test_get_parts_by_category(self) -> None:
        status, payload = resolve_get_request("/parts?category_id=capacitors")

        self.assertEqual(status, 200)
        self.assertEqual(len(payload["parts"]), 1)
        self.assertEqual(payload["parts"][0]["id"], "cap-100n-0402-x7r")

    def test_get_part_by_id(self) -> None:
        status, payload = resolve_get_request("/parts/reg-3v3-sot23-5")

        self.assertEqual(status, 200)
        self.assertEqual(payload["manufacturer"], "Microchip")
        self.assertEqual(payload["parameters"]["output_voltage"], "3.3 V")

    def test_missing_category_id_is_rejected(self) -> None:
        status, payload = resolve_get_request("/parts")

        self.assertEqual(status, 400)
        self.assertEqual(payload, {"error": "category_id is required"})

    def test_unknown_part_returns_404(self) -> None:
        status, payload = resolve_get_request("/parts/not-real")

        self.assertEqual(status, 404)
        self.assertEqual(payload, {"error": "Unknown part: not-real"})

    def test_unknown_path_returns_404(self) -> None:
        status, payload = resolve_get_request("/not-real")

        self.assertEqual(status, 404)
        self.assertEqual(payload, {"error": "Unknown path: /not-real"})

    def test_http_unknown_path_returns_404(self) -> None:
        status, headers, payload, _logged_errors = invoke_handler("/not-real")

        self.assertEqual(status, 404)
        self.assertEqual(headers["Content-Type"], "application/json; charset=utf-8")
        self.assertEqual(json.loads(payload), {"error": "Unknown path: /not-real"})

    def test_http_internal_error_returns_json_500(self) -> None:
        class ExplodingCatalog:
            def list_categories(self) -> list[dict[str, str]]:
                raise RuntimeError("boom")

        status, headers, payload, logged_errors = invoke_handler("/categories", catalog=ExplodingCatalog())

        self.assertEqual(status, 500)
        self.assertEqual(headers["Content-Type"], "application/json; charset=utf-8")
        self.assertEqual(json.loads(payload), {"error": "Internal server error"})
        self.assertTrue(logged_errors)
        self.assertIn("Unhandled GET /categories", logged_errors[0])


def invoke_handler(path: str, catalog: object | None = None) -> tuple[int, dict[str, str], str, list[str]]:
    handler = PartsRequestHandler.__new__(PartsRequestHandler)
    handler.path = path
    handler.catalog = catalog or PartsRequestHandler.catalog
    handler.wfile = BytesIO()

    status_holder: dict[str, int] = {}
    headers: dict[str, str] = {}
    logged_errors: list[str] = []

    def send_response(status: int, message: str | None = None) -> None:
        status_holder["status"] = status

    def send_header(name: str, value: str) -> None:
        headers[name] = value

    def end_headers() -> None:
        return

    def log_error(format_string: str, *args: object) -> None:
        logged_errors.append(format_string % args)

    handler.send_response = send_response  # type: ignore[method-assign]
    handler.send_header = send_header  # type: ignore[method-assign]
    handler.end_headers = end_headers  # type: ignore[method-assign]
    handler.log_error = log_error  # type: ignore[method-assign]

    handler.do_GET()

    payload = handler.wfile.getvalue().decode("utf-8")
    return status_holder["status"], headers, payload, logged_errors


if __name__ == "__main__":
    unittest.main()
