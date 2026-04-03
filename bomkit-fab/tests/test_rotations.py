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


rotations = _load_module('rotations_task4', BASE_DIR / 'rotations.py')


def test_load_rotations_reads_default_database():
    rules = rotations.load_rotations(BASE_DIR / 'rotations.csv')
    assert len(rules) >= 30


def test_rotation_lookup_matches_expected_patterns():
    rules = rotations.load_rotations(BASE_DIR / 'rotations.csv')
    assert rotations.get_rotation_offset('SOT-23-3', rules) == 180.0
    assert rotations.get_rotation_offset('QFN-32', rules) == 90.0
    assert rotations.get_rotation_offset('USB_C_Receptacle', rules) == 0.0
    assert rotations.get_rotation_offset('UnknownFootprint', rules) == 0.0


def test_project_override_takes_priority(tmp_path):
    custom = tmp_path / 'rotations_custom.csv'
    custom.write_text('^QFN-,180\n^MyPart,45\n', encoding='utf-8')
    rules = rotations.load_rotation_database(BASE_DIR / 'rotations.csv', tmp_path)
    assert rotations.get_rotation_offset('QFN-48', rules) == 180.0
    assert rotations.get_rotation_offset('MyPart123', rules) == 45.0


def test_apply_mirror_negates_bottom_side_rotation():
    assert rotations.apply_mirror(90.0, is_bottom=False) == 90.0
    assert rotations.apply_mirror(90.0, is_bottom=True) == -90.0
