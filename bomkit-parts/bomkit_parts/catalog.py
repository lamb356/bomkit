from __future__ import annotations

from dataclasses import dataclass
import json
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class Catalog:
    categories: list[dict[str, Any]]
    parts: list[dict[str, Any]]

    @classmethod
    def load_seed(cls) -> "Catalog":
        seed_path = Path(__file__).resolve().parent.parent / "curated" / "seed_parts.json"
        with seed_path.open("r", encoding="utf-8") as handle:
            raw = json.load(handle)
        return cls(categories=raw["categories"], parts=raw["parts"])

    def list_categories(self) -> list[dict[str, Any]]:
        return self.categories

    def list_parts(self, category_id: str) -> list[dict[str, Any]]:
        return [part for part in self.parts if part["category_id"] == category_id]

    def get_part(self, part_id: str) -> dict[str, Any] | None:
        for part in self.parts:
            if part["id"] == part_id:
                return part
        return None
