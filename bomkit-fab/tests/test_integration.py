from __future__ import annotations

import csv
import importlib.util
import sys
from pathlib import Path

try:
    import pytest
except ImportError:  # pragma: no cover - manual KiCad usage may not have pytest installed
    pytest = None  # type: ignore

try:
    import pcbnew  # type: ignore
except Exception as exc:  # pragma: no cover - expected outside KiCad
    pcbnew = None  # type: ignore
    PCBNEW_IMPORT_ERROR = exc
else:  # pragma: no cover - exercised manually from KiCad
    PCBNEW_IMPORT_ERROR = None

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


board_adapter = _load_module('board_adapter_task12_manual', BASE_DIR / 'board_adapter.py')
field_resolver = _load_module('field_resolver_task12_manual', BASE_DIR / 'field_resolver.py')
bom_exporter = _load_module('bom_exporter_task12_manual', BASE_DIR / 'bom_exporter.py')
cpl_exporter = _load_module('cpl_exporter_task12_manual', BASE_DIR / 'cpl_exporter.py')
rotations = _load_module('rotations_task12_manual', BASE_DIR / 'rotations.py')


def _read_csv_rows(path: Path) -> list[list[str]]:
    with path.open('r', encoding='utf-8', newline='') as handle:
        return list(csv.reader(handle))


def run_integration_test(output_dir: str | Path | None = None) -> dict[str, object]:
    if pcbnew is None:
        raise RuntimeError(
            'pcbnew is unavailable in this Python environment. Run this test from KiCad 10\'s '
            'Scripting Console or plugin Python environment.'
        ) from PCBNEW_IMPORT_ERROR

    board = pcbnew.LoadBoard(str(BOARD_PATH))
    if board is None:
        raise RuntimeError(f'Failed to load KiCad board fixture: {BOARD_PATH}')

    components = board_adapter.load_from_pcbnew(board)
    by_ref = {component.reference: component for component in components}
    resolved_refs = sorted(
        reference
        for reference, component in by_ref.items()
        if field_resolver.resolve_lcsc(component)
    )

    rotations_db = rotations.load_rotation_database(BASE_DIR / 'rotations.csv', FIXTURE_DIR)
    destination = Path(output_dir) if output_dir is not None else FIXTURE_DIR / 'generated' / 'manual_kicad'
    destination.mkdir(parents=True, exist_ok=True)

    bom_output = destination / 'test_board_BOM_JLCPCB.csv'
    cpl_output = destination / 'test_board_CPL_JLCPCB.csv'

    bom_result = bom_exporter.export_bom(components, bom_output)
    cpl_result = cpl_exporter.export_cpl(components, cpl_output, rotations_db)

    assert len(components) == 10
    assert resolved_refs == ['C1', 'C2', 'C3', 'LED1', 'R1']
    assert by_ref['R4'].is_dnp is True
    assert by_ref['C2'].exclude_from_bom is True
    assert by_ref['C3'].exclude_from_board is True
    assert bom_result.resolved_count == 4
    assert bom_result.unresolved_count == 4
    assert bom_result.dnp_count == 1
    assert bom_result.excluded_count == 1
    assert cpl_result.exported_count == 9
    assert cpl_result.excluded_count == 1
    assert cpl_result.warnings == []
    assert _read_csv_rows(bom_output) == _read_csv_rows(EXPECTED_BOM_PATH)
    assert _read_csv_rows(cpl_output) == _read_csv_rows(EXPECTED_CPL_PATH)

    return {
        'board_path': str(BOARD_PATH),
        'bom_output': str(bom_output),
        'cpl_output': str(cpl_output),
        'component_count': len(components),
        'resolved_refs': resolved_refs,
    }


def test_kicad_pcbnew_pipeline(tmp_path):
    if pcbnew is None:
        message = (
            'pcbnew is unavailable outside KiCad; run bomkit-fab/tests/test_integration.py '
            'from KiCad 10\'s Scripting Console for the real pcbnew integration check.'
        )
        if pytest is not None:
            pytest.skip(message)
        raise RuntimeError(message) from PCBNEW_IMPORT_ERROR

    result = run_integration_test(tmp_path)
    assert Path(result['bom_output']).exists()
    assert Path(result['cpl_output']).exists()


def main() -> None:
    result = run_integration_test()
    print('BOMKit KiCad integration test passed.')
    print(f"Board fixture: {result['board_path']}")
    print(f"BOM output: {result['bom_output']}")
    print(f"CPL output: {result['cpl_output']}")


if __name__ == '__main__':
    main()
