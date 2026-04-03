from __future__ import annotations

import csv
import re
from pathlib import Path

RotationRule = tuple[re.Pattern[str], float]


def load_rotations(csv_path: str | Path) -> list[RotationRule]:
    rules: list[RotationRule] = []
    with Path(csv_path).open('r', encoding='utf-8', newline='') as handle:
        reader = csv.reader(handle)
        for row in reader:
            if not row:
                continue
            first = row[0].strip()
            if not first or first.startswith('#'):
                continue
            if len(row) < 2:
                continue
            pattern = re.compile(first, re.IGNORECASE)
            offset = float(row[1].strip())
            rules.append((pattern, offset))
    return rules


def load_rotation_database(default_csv_path: str | Path, project_dir: str | Path | None = None) -> list[RotationRule]:
    combined: list[RotationRule] = []
    project_custom = None
    if project_dir is not None:
        project_custom = Path(project_dir) / 'rotations_custom.csv'
        if project_custom.exists():
            combined.extend(load_rotations(project_custom))
    combined.extend(load_rotations(default_csv_path))
    return combined


def get_rotation_offset(footprint_name: str, rotations: list[RotationRule]) -> float:
    for pattern, offset in rotations:
        if pattern.search(footprint_name):
            return float(offset)
    return 0.0


def apply_mirror(rotation_offset: float, is_bottom: bool) -> float:
    return -float(rotation_offset) if is_bottom else float(rotation_offset)
