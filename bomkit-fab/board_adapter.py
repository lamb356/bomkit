from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

try:
    from .sexp_parser import parse_kicad_pcb
except ImportError:
    from sexp_parser import parse_kicad_pcb


@dataclass(slots=True)
class ComponentData:
    reference: str
    value: str
    footprint: str
    pos_x_mm: float
    pos_y_mm: float
    rotation_deg: float
    layer: str
    fields: dict[str, str]
    is_dnp: bool
    exclude_from_bom: bool
    exclude_from_board: bool


_TRUE_VALUES = {"1", "true", "yes", "y", "on"}


def _bool_from_value(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    return str(value).strip().lower() in _TRUE_VALUES


def _normalize_layer(layer: str) -> str:
    layer = str(layer or "")
    if layer in {"Bottom", "B.Cu", "B.Mask", "B.SilkS"} or layer.startswith("B."):
        return "Bottom"
    return "Top"


def _component_from_mapping(item: dict[str, Any]) -> ComponentData:
    return ComponentData(
        reference=str(item.get("reference", "")),
        value=str(item.get("value", "")),
        footprint=str(item.get("footprint", "")),
        pos_x_mm=float(item.get("pos_x_mm", 0.0)),
        pos_y_mm=float(item.get("pos_y_mm", 0.0)),
        rotation_deg=float(item.get("rotation_deg", 0.0)),
        layer=_normalize_layer(str(item.get("layer", "Top"))),
        fields={str(k): str(v) for k, v in dict(item.get("fields", {})).items()},
        is_dnp=_bool_from_value(item.get("is_dnp", False)),
        exclude_from_bom=_bool_from_value(item.get("exclude_from_bom", False)),
        exclude_from_board=_bool_from_value(item.get("exclude_from_board", False)),
    )


def load_from_file(kicad_pcb_path: str) -> list[ComponentData]:
    parsed = parse_kicad_pcb(kicad_pcb_path)
    return [_component_from_mapping(item) for item in parsed]


def load_from_pcbnew(board: Any) -> list[ComponentData]:
    if board is None:
        return []

    try:
        footprints = board.GetFootprints()
    except AttributeError:
        footprints = board

    components: list[ComponentData] = []
    for footprint in footprints:
        try:
            reference = footprint.GetReference()
        except AttributeError:
            continue

        try:
            value = footprint.GetValue()
        except AttributeError:
            value = ""

        try:
            footprint_name = footprint.GetFPIDAsString()
        except AttributeError:
            try:
                footprint_name = footprint.GetFPID().GetUniStringLibId()
            except AttributeError:
                footprint_name = ""
        footprint_name = str(footprint_name).split(":")[-1]

        try:
            position = footprint.GetPosition()
            pos_x_mm = float(position.x) / 1_000_000.0
            pos_y_mm = float(position.y) / 1_000_000.0
        except AttributeError:
            pos_x_mm = pos_y_mm = 0.0

        try:
            rotation_deg = float(footprint.GetOrientationDegrees())
        except AttributeError:
            rotation_deg = 0.0

        try:
            layer = "Bottom" if int(footprint.GetLayer()) == 31 else "Top"
        except Exception:
            try:
                layer = _normalize_layer(footprint.GetLayerName())
            except Exception:
                layer = "Top"

        fields: dict[str, str] = {}
        for getter_name in ("GetProperties", "GetFields"):
            getter = getattr(footprint, getter_name, None)
            if getter is None:
                continue
            try:
                raw_fields = getter()
            except Exception:
                continue
            try:
                fields = {str(k): str(v) for k, v in dict(raw_fields).items()}
            except Exception:
                fields = {}
            if fields:
                break

        attr_tokens: set[str] = set()
        for getter_name in ("GetAttributes", "GetAttr"):
            getter = getattr(footprint, getter_name, None)
            if getter is None:
                continue
            try:
                attr_value = getter()
            except Exception:
                continue
            if isinstance(attr_value, str):
                attr_tokens.update(attr_value.lower().split())
            elif isinstance(attr_value, (list, tuple, set)):
                attr_tokens.update(str(item).lower() for item in attr_value)

        is_dnp = attr_tokens.__contains__("dnp") or _bool_from_value(fields.get("DNP"))
        exclude_from_bom = attr_tokens.__contains__("exclude_from_bom") or _bool_from_value(fields.get("exclude_from_bom"))
        exclude_from_board = (
            attr_tokens.__contains__("exclude_from_board")
            or attr_tokens.__contains__("exclude_from_pos_files")
            or _bool_from_value(fields.get("exclude_from_board"))
        )

        components.append(
            ComponentData(
                reference=str(reference),
                value=str(value),
                footprint=footprint_name,
                pos_x_mm=pos_x_mm,
                pos_y_mm=pos_y_mm,
                rotation_deg=rotation_deg,
                layer=layer,
                fields=fields,
                is_dnp=is_dnp,
                exclude_from_bom=exclude_from_bom,
                exclude_from_board=exclude_from_board,
            )
        )

    return components


def load_board(source: Any) -> list[ComponentData]:
    if isinstance(source, ComponentData):
        return [source]

    if isinstance(source, (str, Path)):
        return load_from_file(str(source))

    return load_from_pcbnew(source)
