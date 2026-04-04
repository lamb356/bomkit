from __future__ import annotations

import csv
import re
from pathlib import Path

from bomkit_fab import board_adapter, cpl_exporter, rotations

FIXTURE_PATH = Path(__file__).resolve().parent / 'fixtures' / 'test_board.kicad_pcb'


def test_export_cpl_writes_expected_columns_filters_board_exclusions_and_applies_rotations(tmp_path):
    components = board_adapter.load_from_file(str(FIXTURE_PATH))
    rules = rotations.load_rotations(Path(__file__).resolve().parents[1] / 'rotations.csv')
    output = tmp_path / 'board_CPL_JLCPCB.csv'

    result = cpl_exporter.export_cpl(components, output, rules)

    assert result.total_parts == 10
    assert result.exported_count == 9
    assert result.excluded_count == 1
    assert result.warnings == []
    assert output.exists()

    rows = list(csv.reader(output.open('r', encoding='utf-8')))
    assert rows[0] == ['Designator', 'Mid X', 'Mid Y', 'Layer', 'Rotation']

    data_rows = rows[1:]
    by_ref = {row[0]: row for row in data_rows}

    assert 'C3' not in by_ref
    assert by_ref['R1'] == ['R1', '10', '5', 'Top', '0']
    assert by_ref['R3'] == ['R3', '14', '5', 'Bottom', '180']
    assert by_ref['U1'] == ['U1', '20', '20', 'Top', '135']
    assert by_ref['LED1'] == ['LED1', '18', '12', 'Bottom', '315']
    assert by_ref['J1'] == ['J1', '5', '20', 'Bottom', '180']


def test_export_cpl_mirrors_bottom_side_rotation_offsets(tmp_path):
    component = board_adapter.ComponentData(
        reference='U2',
        value='IC',
        footprint='QFN-32',
        pos_x_mm=1.0,
        pos_y_mm=2.0,
        rotation_deg=10.0,
        layer='Bottom',
        fields={},
        is_dnp=False,
        exclude_from_bom=False,
        exclude_from_board=False,
    )
    rules = [(re.compile('^QFN-', re.IGNORECASE), 90.0)]
    output = tmp_path / 'single.csv'

    result = cpl_exporter.export_cpl([component], output, rules)

    assert result.exported_count == 1
    assert result.lines[0].rotation == 280.0
    rows = list(csv.reader(output.open('r', encoding='utf-8')))
    assert rows[1] == ['U2', '1', '2', 'Bottom', '280']


def test_export_cpl_warns_when_negative_y_coordinates_are_present(tmp_path):
    component = board_adapter.ComponentData(
        reference='TP1',
        value='TP',
        footprint='TestPoint',
        pos_x_mm=3.5,
        pos_y_mm=-1.25,
        rotation_deg=0.0,
        layer='Top',
        fields={},
        is_dnp=False,
        exclude_from_bom=False,
        exclude_from_board=False,
    )
    output = tmp_path / 'negative.csv'

    result = cpl_exporter.export_cpl([component], output, [])

    assert result.exported_count == 1
    assert len(result.warnings) == 1
    assert 'negative' in result.warnings[0].lower()
    rows = list(csv.reader(output.open('r', encoding='utf-8')))
    assert rows[1] == ['TP1', '3.5', '-1.25', 'Top', '0']
