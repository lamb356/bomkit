from __future__ import annotations

import importlib.util
import sys
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[1]
UI_DIR = BASE_DIR / "ui"
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))
if str(UI_DIR) not in sys.path:
    sys.path.insert(0, str(UI_DIR))


def _load_module(module_name: str, path: Path):
    spec = importlib.util.spec_from_file_location(module_name, path)
    module = importlib.util.module_from_spec(spec)
    assert spec is not None and spec.loader is not None
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


board_adapter = _load_module("board_adapter_task8", BASE_DIR / "board_adapter.py")
parts_table = _load_module("parts_table_task8", UI_DIR / "parts_table.py")
main_dialog = _load_module("main_dialog_task8", UI_DIR / "main_dialog.py")


def test_ui_modules_import_without_wx_and_can_build_rows_and_summary(tmp_path):
    components = [
        board_adapter.ComponentData(
            reference="R1",
            value="10K",
            footprint="R_0402",
            pos_x_mm=0.0,
            pos_y_mm=0.0,
            rotation_deg=0.0,
            layer="Top",
            fields={"LCSC": "C100"},
            is_dnp=False,
            exclude_from_bom=False,
            exclude_from_board=False,
        ),
        board_adapter.ComponentData(
            reference="C1",
            value="100nF",
            footprint="C_0402",
            pos_x_mm=1.0,
            pos_y_mm=2.0,
            rotation_deg=90.0,
            layer="Top",
            fields={},
            is_dnp=False,
            exclude_from_bom=False,
            exclude_from_board=False,
        ),
        board_adapter.ComponentData(
            reference="R99",
            value="DNP",
            footprint="R_0402",
            pos_x_mm=0.0,
            pos_y_mm=0.0,
            rotation_deg=0.0,
            layer="Top",
            fields={"LCSC": "C200"},
            is_dnp=True,
            exclude_from_bom=False,
            exclude_from_board=False,
        ),
    ]
    parts_db = {
        "C100": type("Part", (), {"classification": "Basic"})(),
        "C200": type("Part", (), {"classification": "Extended"})(),
    }

    rows = parts_table.build_parts_table_rows(components, parts_db)
    assert [row.reference for row in rows] == ["C1", "R1", "R99"]
    assert [row.status for row in rows] == ["Unresolved", "Resolved", "DNP"]
    assert rows[1].assembly_tier == "Basic"

    summary = main_dialog.build_dialog_summary(components, parts_db)
    text = main_dialog.format_cost_summary(summary)
    assert summary.total_parts == 3
    assert summary.resolved_count == 1
    assert summary.unresolved_count == 1
    assert summary.dnp_count == 1
    assert "$0.00" in text

    dialog = main_dialog.BOMKitDialog(
        parent=None,
        components=components,
        output_dir=tmp_path,
        parts_db=parts_db,
        rotations_db=[],
        board_name="demo",
    )
    export_paths = dialog.on_export()
    assert export_paths is not None
    bom_path, cpl_path = export_paths
    assert bom_path.exists()
    assert cpl_path.exists()
