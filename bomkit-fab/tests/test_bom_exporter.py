from __future__ import annotations

import csv
from pathlib import Path

from bomkit_fab import board_adapter, bom_exporter

FIXTURE_PATH = Path(__file__).resolve().parent / 'fixtures' / 'test_board.kicad_pcb'


def test_export_bom_groups_components_and_writes_csv(tmp_path):
    components = board_adapter.load_from_file(str(FIXTURE_PATH))
    output = tmp_path / 'board_BOM_JLCPCB.csv'
    result = bom_exporter.export_bom(components, output)

    assert result.total_parts == 10
    assert result.resolved_count == 4
    assert result.unresolved_count == 4
    assert result.dnp_count == 1
    assert result.excluded_count == 1
    assert output.exists()

    rows = list(csv.reader(output.open('r', encoding='utf-8')))
    assert rows[0] == ['Comment', 'Designator', 'Footprint', 'LCSC Part Number']

    data_rows = rows[1:]
    assert any(row == ['10K', 'R1', 'R_0402', 'C25532'] for row in data_rows)
    assert any(row == ['10K', 'R2,R3', 'R_0402', ''] for row in data_rows)
    assert any(row == ['100nF', 'C1,C3', 'C_0402', 'C1525'] for row in data_rows)
    assert any(row == ['STM32F411', 'U1', 'QFP-48', ''] for row in data_rows)
    assert any(row == ['USB-C', 'J1', 'USB-C', ''] for row in data_rows)
    assert any(row == ['GREEN', 'LED1', 'LED_0603', 'C72043'] for row in data_rows)


def test_export_bom_splits_designator_groups_at_200(tmp_path):
    base = board_adapter.ComponentData(
        reference='R1', value='10K', footprint='R_0402', pos_x_mm=0.0, pos_y_mm=0.0,
        rotation_deg=0.0, layer='Top', fields={'LCSC': 'C1'}, is_dnp=False,
        exclude_from_bom=False, exclude_from_board=False,
    )
    components = [
        board_adapter.ComponentData(
            reference=f'R{i}', value=base.value, footprint=base.footprint, pos_x_mm=0.0, pos_y_mm=0.0,
            rotation_deg=0.0, layer='Top', fields=base.fields, is_dnp=False,
            exclude_from_bom=False, exclude_from_board=False,
        )
        for i in range(1, 206)
    ]
    output = tmp_path / 'large.csv'
    result = bom_exporter.export_bom(components, output)
    assert len(result.lines) == 2
    assert len(result.lines[0].designators) == 200
    assert len(result.lines[1].designators) == 5
