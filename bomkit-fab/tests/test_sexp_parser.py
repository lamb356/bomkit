from __future__ import annotations

import importlib.util
import sys
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[1]
FIXTURE_PATH = Path(__file__).resolve().parent / "fixtures" / "test_board.kicad_pcb"


def _load_module(module_name: str, path: Path):
    spec = importlib.util.spec_from_file_location(module_name, path)
    module = importlib.util.module_from_spec(spec)
    assert spec is not None and spec.loader is not None
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


sexp_parser = _load_module("sexp_parser", BASE_DIR / "sexp_parser.py")
board_adapter = _load_module("board_adapter", BASE_DIR / "board_adapter.py")


def test_parse_kicad_pcb_extracts_components_and_flags():
    components = sexp_parser.parse_kicad_pcb(str(FIXTURE_PATH))

    assert len(components) == 10

    by_ref = {component["reference"]: component for component in components}
    assert set(by_ref) == {"R1", "R2", "R3", "C1", "C2", "C3", "U1", "J1", "R4", "LED1"}

    assert by_ref["R1"]["value"] == "10K"
    assert by_ref["R1"]["footprint"] == "R_0402"
    assert by_ref["R1"]["fields"]["LCSC"] == "C25532"
    assert by_ref["R1"]["pos_x_mm"] == 10.0
    assert by_ref["R1"]["pos_y_mm"] == 5.0
    assert by_ref["R1"]["rotation_deg"] == 0.0
    assert by_ref["R1"]["layer"] == "Top"

    assert by_ref["R3"]["layer"] == "Bottom"
    assert by_ref["R3"]["rotation_deg"] == 180.0

    assert by_ref["C2"]["exclude_from_bom"] is True
    assert by_ref["C2"]["exclude_from_board"] is False
    assert by_ref["C3"]["exclude_from_board"] is True
    assert by_ref["C3"]["layer"] == "Bottom"

    assert by_ref["U1"]["fields"]["MPN"] == "STM32F411CEU6"
    assert "LCSC" not in by_ref["U1"]["fields"]

    assert by_ref["J1"]["fields"]["Reference"] == "J1"
    assert by_ref["J1"]["value"] == "USB-C"

    assert by_ref["R4"]["is_dnp"] is True
    assert by_ref["R4"]["exclude_from_bom"] is False
    assert by_ref["LED1"]["fields"]["LCSC"] == "C72043"
    assert by_ref["LED1"]["rotation_deg"] == 135.0


def test_load_from_file_returns_componentdata_objects():
    components = board_adapter.load_from_file(str(FIXTURE_PATH))

    assert len(components) == 10
    assert all(isinstance(component, board_adapter.ComponentData) for component in components)

    by_ref = {component.reference: component for component in components}
    assert by_ref["R1"].fields["LCSC"] == "C25532"
    assert by_ref["C2"].exclude_from_bom is True
    assert by_ref["C3"].exclude_from_board is True
    assert by_ref["R4"].is_dnp is True
    assert by_ref["J1"].layer == "Bottom"


def test_load_board_accepts_path_and_iterable_sources():
    from types import SimpleNamespace

    from_path = board_adapter.load_board(FIXTURE_PATH)
    assert len(from_path) == 10

    class FakeFootprint:
        def __init__(self):
            self._pos = SimpleNamespace(x=2_500_000, y=7_500_000)

        def GetReference(self):
            return "X1"

        def GetValue(self):
            return "CRYSTAL"

        def GetFPIDAsString(self):
            return "Library:XTAL_3225"

        def GetPosition(self):
            return self._pos

        def GetOrientationDegrees(self):
            return 90

        def GetLayerName(self):
            return "B.Cu"

        def GetProperties(self):
            return {"MPN": "ABM8-25.000MHZ"}

        def GetAttributes(self):
            return "exclude_from_pos_files"

    from_board = board_adapter.load_board([FakeFootprint()])
    assert len(from_board) == 1
    assert from_board[0].reference == "X1"
    assert from_board[0].footprint == "XTAL_3225"
    assert from_board[0].pos_x_mm == 2.5
    assert from_board[0].pos_y_mm == 7.5
    assert from_board[0].layer == "Bottom"
    assert from_board[0].exclude_from_board is True
