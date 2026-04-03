from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path
from typing import Any


UNKNOWN_CLASSIFICATION = "Unknown"

_LCSC_HEADER_ALIASES = {
    "lcsc",
    "lcsc part",
    "lcsc part #",
    "lcsc part no",
    "lcsc part number",
    "lcsc pn",
    "part # (lcsc)",
    "part#(lcsc)",
    "part number (lcsc)",
    "part number lcsc",
    "supplier part",
}

_CLASSIFICATION_HEADER_HINTS = (
    "classification",
    "class",
    "library type",
    "part type",
    "assembly type",
    "basic/extended",
    "base/extended",
    "type",
)

_PREFERRED_HEADER_HINTS = (
    "preferred",
    "preffered",
)

_BASIC_HEADER_HINTS = (
    "basic",
    "base",
)

_EXTENDED_HEADER_HINTS = (
    "extended",
)

_TRUE_VALUES = {"1", "true", "yes", "y", "on"}


@dataclass(slots=True)
class JLCPCBPart:
    lcsc_part_number: str
    classification: str
    description: str = ""
    raw_row: dict[str, str] | None = None


def _normalize_header(value: str) -> str:
    return " ".join(str(value).strip().lower().replace("_", " ").split())


def _normalize_value(value: Any) -> str:
    return str(value or "").strip()


def _normalize_lcsc(value: str) -> str:
    return _normalize_value(value).upper()


def _is_truthy(value: Any) -> bool:
    return _normalize_value(value).lower() in _TRUE_VALUES


def _find_header(fieldnames: list[str], aliases: set[str]) -> str | None:
    normalized_map = {_normalize_header(name): name for name in fieldnames}
    for alias in aliases:
        header = normalized_map.get(alias)
        if header:
            return header
    return None


def _first_value(row: dict[str, Any], fieldnames: list[str], hints: tuple[str, ...]) -> str:
    for fieldname in fieldnames:
        normalized_name = _normalize_header(fieldname)
        if any(hint in normalized_name for hint in hints):
            value = _normalize_value(row.get(fieldname, ""))
            if value:
                return value
    return ""


def _has_truthy_flag(row: dict[str, Any], fieldnames: list[str], hints: tuple[str, ...]) -> bool:
    for fieldname in fieldnames:
        normalized_name = _normalize_header(fieldname)
        if any(hint in normalized_name for hint in hints) and _is_truthy(row.get(fieldname, "")):
            return True
    return False


def _classify_row(row: dict[str, Any], fieldnames: list[str]) -> str:
    preferred_flag = _has_truthy_flag(row, fieldnames, _PREFERRED_HEADER_HINTS)
    basic_flag = _has_truthy_flag(row, fieldnames, _BASIC_HEADER_HINTS)
    extended_flag = _has_truthy_flag(row, fieldnames, _EXTENDED_HEADER_HINTS)
    classification_text = _normalize_header(_first_value(row, fieldnames, _CLASSIFICATION_HEADER_HINTS))

    if "preferred extended" in classification_text or "preferred" in classification_text or preferred_flag:
        return "Preferred Extended"
    if "basic" in classification_text or basic_flag:
        return "Basic"
    if "extended" in classification_text or extended_flag:
        return "Extended"
    return "Extended"


def load_jlcpcb_parts(csv_path: str) -> dict[str, JLCPCBPart]:
    path = Path(csv_path)
    if not path.exists():
        return {}

    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        fieldnames = list(reader.fieldnames or [])
        if not fieldnames:
            return {}

        lcsc_header = _find_header(fieldnames, _LCSC_HEADER_ALIASES)
        if lcsc_header is None:
            return {}

        description_header = _find_header(
            fieldnames,
            {"description", "comment", "product description", "part name", "name"},
        )

        parts: dict[str, JLCPCBPart] = {}
        for row in reader:
            lcsc_part_number = _normalize_lcsc(row.get(lcsc_header, ""))
            if not lcsc_part_number:
                continue

            part = JLCPCBPart(
                lcsc_part_number=lcsc_part_number,
                classification=_classify_row(row, fieldnames),
                description=_normalize_value(row.get(description_header, "")) if description_header else "",
                raw_row={str(key): _normalize_value(value) for key, value in row.items()},
            )
            parts[lcsc_part_number] = part

    return parts


def classify(lcsc_part: str, parts_db: dict[str, JLCPCBPart] | None) -> str:
    if not parts_db:
        return UNKNOWN_CLASSIFICATION

    normalized = _normalize_lcsc(lcsc_part)
    if not normalized:
        return "Not Found"

    part = parts_db.get(normalized)
    if part is None:
        return "Not Found"
    return part.classification
