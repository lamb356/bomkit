from __future__ import annotations

from pathlib import Path
import sys
import unittest


PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from bomkit_parts.server import resolve_get_request


class PartsServerTest(unittest.TestCase):
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


if __name__ == "__main__":
  unittest.main()
