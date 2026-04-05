from __future__ import annotations

from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from typing import Any
from urllib.parse import parse_qs, urlparse

from .catalog import Catalog


def _json_bytes(payload: Any) -> bytes:
    return json.dumps(payload, sort_keys=True).encode("utf-8")


def resolve_get_request(path: str, catalog: Catalog | None = None) -> tuple[int, Any]:
    active_catalog = catalog or Catalog.load_seed()
    parsed = urlparse(path)

    if parsed.path == "/categories":
        return HTTPStatus.OK, {"categories": active_catalog.list_categories()}

    if parsed.path == "/parts":
        category_id = parse_qs(parsed.query).get("category_id", [None])[0]
        if not category_id:
            return HTTPStatus.BAD_REQUEST, {"error": "category_id is required"}
        return HTTPStatus.OK, {"parts": active_catalog.list_parts(category_id)}

    if parsed.path.startswith("/parts/"):
        part_id = parsed.path.removeprefix("/parts/")
        part = active_catalog.get_part(part_id)
        if not part:
            return HTTPStatus.NOT_FOUND, {"error": f"Unknown part: {part_id}"}
        return HTTPStatus.OK, part

    return HTTPStatus.OK, {
        "name": "BOMKit Parts",
        "version": "0.1.0",
        "endpoints": ["/categories", "/parts?category_id=<id>", "/parts/{id}"],
    }


class PartsRequestHandler(BaseHTTPRequestHandler):
    catalog = Catalog.load_seed()
    server_version = "BOMKitParts/0.1"

    def do_GET(self) -> None:  # noqa: N802
        status, payload = resolve_get_request(self.path, catalog=self.catalog)
        self._send_json(HTTPStatus(status), payload)

    def log_message(self, format: str, *args: object) -> None:
        return

    def _send_json(self, status: HTTPStatus, payload: Any) -> None:
        body = _json_bytes(payload)
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def create_server(host: str = "127.0.0.1", port: int = 8765) -> ThreadingHTTPServer:
    return ThreadingHTTPServer((host, port), PartsRequestHandler)


def serve(host: str = "127.0.0.1", port: int = 8765) -> None:
    server = create_server(host=host, port=port)
    print(f"BOMKit Parts listening on http://{host}:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
  serve()
