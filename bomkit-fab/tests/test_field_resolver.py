from __future__ import annotations

import importlib.util
import sys
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))


def _load_module(module_name: str, path: Path):
    spec = importlib.util.spec_from_file_location(module_name, path)
    module = importlib.util.module_from_spec(spec)
    assert spec is not None and spec.loader is not None
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


board_adapter = _load_module("board_adapter_task3", BASE_DIR / "board_adapter.py")
field_resolver = _load_module("field_resolver_task3", BASE_DIR / "field_resolver.py")
ComponentData = board_adapter.ComponentData


def make_component(fields: dict[str, str]) -> ComponentData:
    return ComponentData(
        reference="X1",
        value="value",
        footprint="pkg",
        pos_x_mm=0.0,
        pos_y_mm=0.0,
        rotation_deg=0.0,
        layer="Top",
        fields=fields,
        is_dnp=False,
        exclude_from_bom=False,
        exclude_from_board=False,
    )


def test_resolve_lcsc_prefers_primary_aliases():
    component = make_component({"LCSC": "C12345", "jlc": "C99999"})
    assert field_resolver.resolve_lcsc(component) == "C12345"


def test_resolve_lcsc_case_insensitive_and_trimmed():
    component = make_component({" lcsc_part_number ": "  C1525  "})
    assert field_resolver.resolve_lcsc(component) == "C1525"


def test_resolve_lcsc_supports_jlc_alias():
    component = make_component({"JLCPCB_PART": " C2040 "})
    assert field_resolver.resolve_lcsc(component) == "C2040"


def test_resolve_lcsc_returns_none_for_empty_values():
    component = make_component({"LCSC": "   ", "jlc": ""})
    assert field_resolver.resolve_lcsc(component) is None


def test_resolve_mpn_from_mpn_field():
    component = make_component({"MPN": "STM32F411CEU6"})
    assert field_resolver.resolve_mpn(component) == "STM32F411CEU6"


def test_resolve_mpn_from_part_number_alias():
    component = make_component({"part_number": "GRM155R71C104KA88D"})
    assert field_resolver.resolve_mpn(component) == "GRM155R71C104KA88D"


def test_resolve_mpn_from_pound_alias():
    component = make_component({"P#": "TPS62130RGTR"})
    assert field_resolver.resolve_mpn(component) == "TPS62130RGTR"


def test_resolve_mpn_returns_none_for_whitespace_only():
    component = make_component({"mfr_part": "  ", "pn": ""})
    assert field_resolver.resolve_mpn(component) is None


def test_resolve_manufacturer_supports_common_aliases():
    component = make_component({"Manufacturer": "Murata"})
    assert field_resolver.resolve_manufacturer(component) == "Murata"


def test_resolve_manufacturer_is_case_insensitive():
    component = make_component({"mFr_NaMe": "Texas Instruments"})
    assert field_resolver.resolve_manufacturer(component) == "Texas Instruments"


def test_resolve_manufacturer_returns_none_when_missing():
    component = make_component({"MPN": "ABC123"})
    assert field_resolver.resolve_manufacturer(component) is None


def test_functions_accept_mapping_style_components():
    component = {"fields": {"lcsc": "C7001", "manufacturer_name": "STMicroelectronics"}}
    assert field_resolver.resolve_lcsc(component) == "C7001"
    assert field_resolver.resolve_manufacturer(component) == "STMicroelectronics"
