from __future__ import annotations

from bomkit_fab import board_adapter
from bomkit_fab.ui import main_dialog, parts_table


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
