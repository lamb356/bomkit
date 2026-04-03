from __future__ import annotations

from collections.abc import Mapping
from typing import Any

try:
    from .board_adapter import ComponentData
except ImportError:  # pragma: no cover
    ComponentData = Any  # type: ignore


LCSC_ALIASES = [
    "LCSC",
    "LCSC Part Number",
    "LCSC_Part",
    "lcsc",
    "lcsc_part",
    "lcsc_part_number",
    "jlcpcb_part",
    "jlc",
]

MPN_ALIASES = [
    "mpn",
    "pn",
    "p#",
    "part_num",
    "manf#",
    "mfg#",
    "mfr#",
    "part_number",
    "manufacturer_part",
    "mfr_part",
    "mfg_part_number",
    "manf_pn",
]

MANUFACTURER_ALIASES = [
    "manufacturer",
    "mfr",
    "mfg",
    "maker",
    "brand",
    "manf",
    "mfr_name",
    "manufacturer_name",
    "vendor_manufacturer",
]


def _component_fields(component: ComponentData | Mapping[str, Any] | Any) -> dict[str, str]:
    if hasattr(component, "fields"):
        raw_fields = getattr(component, "fields")
    else:
        raw_fields = component.get("fields", {})  # type: ignore[union-attr]
    if not raw_fields:
        return {}
    return {str(key): str(value) for key, value in dict(raw_fields).items()}


def _normalize_key(value: str) -> str:
    return " ".join(value.strip().lower().replace("_", " ").split())


def _normalize_field_map(fields: Mapping[str, str]) -> dict[str, str]:
    normalized: dict[str, str] = {}
    for key, value in fields.items():
        stripped = str(value).strip()
        if stripped:
            normalized[_normalize_key(str(key))] = stripped
    return normalized


def _resolve_alias(component: ComponentData | Mapping[str, Any] | Any, aliases: list[str]) -> str | None:
    normalized_fields = _normalize_field_map(_component_fields(component))
    for alias in aliases:
        value = normalized_fields.get(_normalize_key(alias))
        if value:
            return value
    return None


def resolve_lcsc(component: ComponentData | Mapping[str, Any] | Any) -> str | None:
    return _resolve_alias(component, LCSC_ALIASES)


def resolve_mpn(component: ComponentData | Mapping[str, Any] | Any) -> str | None:
    return _resolve_alias(component, MPN_ALIASES)


def resolve_manufacturer(component: ComponentData | Mapping[str, Any] | Any) -> str | None:
    return _resolve_alias(component, MANUFACTURER_ALIASES)
