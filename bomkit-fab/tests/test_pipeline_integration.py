from __future__ import annotations

import csv
import importlib.util
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
FIXTURE_DIR = Path(__file__).resolve().parent / 'fixtures' / 'test_board'
BOARD_PATH = FIXTURE_DIR / 'test_board.kicad_pcb'
EXPECTED_BOM_PATH = FIXTURE_DIR / 'expected_bom_jlcpcb.csv'
EXPECTED_CPL_PATH = FIXTURE_DIR / 'expected_cpl_jlcpcb.csv'

if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))


def _load_module(module_name: str, path: Path):
    spec = importlib.util.spec_from_file_location(module_name, path)
    module = importlib.util.module_from_spec(spec)
    assert spec is not None and spec.loader is not None
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


board_adapter = _load_module('board_adapter_task12_pipeline', BASE_DIR / 'board_adapter.py')
field_resolver = _load_module('field_resolver_task12_pipeline', BASE_DIR / 'field_resolver.py')
bom_exporter = _load_module('bom_exporter_task12_pipeline', BASE_DIR / 'bom_exporter.py')
cpl_exporter = _load_module('cpl_exporter_task12_pipeline', BASE_DIR / 'cpl_exporter.py')
rotations = _load_module('rotations_task12_pipeline', BASE_DIR / 'rotations.py')


def _read_csv_rows(path: Path) -> list[list[str]]:
    with path.open('r', encoding='utf-8', newline='') as handle:
        return list(csv.reader(handle))


def test_fixture_project_contains_expected_mix_of_components():
    components = board_adapter.load_board(BOARD_PATH)
    by_ref = {component.reference: component for component in components}

    assert BOARD_PATH.exists()
    assert len(components) == 10
    assert set(by_ref) == {'R1', 'R2', 'R3', 'C1', 'C2', 'C3', 'U1', 'J1', 'R4', 'LED1'}
    assert {component.layer for component in components} == {'Top', 'Bottom'}

    resolved = {ref for ref, component in by_ref.items() if field_resolver.resolve_lcsc(component)}
    unresolved = set(by_ref) - resolved

    assert resolved == {'R1', 'C1', 'C2', 'C3', 'LED1'}
    assert unresolved == {'R2', 'R3', 'U1', 'J1', 'R4'}
    assert by_ref['R4'].is_dnp is True
    assert by_ref['C2'].exclude_from_bom is True
    assert by_ref['C3'].exclude_from_board is True
    assert by_ref['R3'].layer == 'Bottom'
    assert by_ref['J1'].layer == 'Bottom'


def test_full_pipeline_generates_expected_jlcpcb_bom_and_cpl(tmp_path):
    components = board_adapter.load_board(BOARD_PATH)
    rotations_db = rotations.load_rotation_database(BASE_DIR / 'rotations.csv', FIXTURE_DIR)

    bom_output = tmp_path / 'test_board_BOM_JLCPCB.csv'
    cpl_output = tmp_path / 'test_board_CPL_JLCPCB.csv'

    bom_result = bom_exporter.export_bom(components, bom_output)
    cpl_result = cpl_exporter.export_cpl(components, cpl_output, rotations_db)

    assert bom_result.total_parts == 10
    assert bom_result.resolved_count == 4
    assert bom_result.unresolved_count == 4
    assert bom_result.dnp_count == 1
    assert bom_result.excluded_count == 1

    assert cpl_result.total_parts == 10
    assert cpl_result.exported_count == 9
    assert cpl_result.excluded_count == 1
    assert cpl_result.warnings == []

    assert _read_csv_rows(bom_output) == _read_csv_rows(EXPECTED_BOM_PATH)
    assert _read_csv_rows(cpl_output) == _read_csv_rows(EXPECTED_CPL_PATH)
