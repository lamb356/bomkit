from __future__ import annotations

from pathlib import Path

from bomkit_fab import rotations

BASE_DIR = Path(__file__).resolve().parents[1]


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
