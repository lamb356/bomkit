from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path

try:
    from .board_adapter import ComponentData
    from .rotations import RotationRule, apply_mirror, get_rotation_offset
except ImportError:  # pragma: no cover
    from board_adapter import ComponentData
    from rotations import RotationRule, apply_mirror, get_rotation_offset


@dataclass(slots=True)
class CPLLine:
    designator: str
    mid_x_mm: float
    mid_y_mm: float
    layer: str
    rotation: float


@dataclass(slots=True)
class CPLResult:
    total_parts: int
    exported_count: int
    excluded_count: int
    warnings: list[str]
    lines: list[CPLLine]


def _normalize_rotation(rotation: float) -> float:
    normalized = float(rotation) % 360.0
    if normalized == -0.0:
        return 0.0
    return normalized


def _format_mm(value: float) -> str:
    return f'{float(value):.6f}'.rstrip('0').rstrip('.')


def _format_rotation(value: float) -> str:
    normalized = _normalize_rotation(value)
    if normalized.is_integer():
        return str(int(normalized))
    return f'{normalized:.6f}'.rstrip('0').rstrip('.')


def export_cpl(
    components: list[ComponentData],
    output_path: str | Path,
    rotations_db: list[RotationRule],
) -> CPLResult:
    lines: list[CPLLine] = []
    excluded_count = 0
    has_negative_y = False

    for component in sorted(components, key=lambda item: item.reference):
        if component.exclude_from_board:
            excluded_count += 1
            continue

        is_bottom = component.layer == 'Bottom'
        rotation_offset = get_rotation_offset(component.footprint, rotations_db)
        corrected_rotation = component.rotation_deg + apply_mirror(rotation_offset, is_bottom)

        if component.pos_y_mm < 0:
            has_negative_y = True

        lines.append(
            CPLLine(
                designator=component.reference,
                mid_x_mm=float(component.pos_x_mm),
                mid_y_mm=float(component.pos_y_mm),
                layer=component.layer,
                rotation=_normalize_rotation(corrected_rotation),
            )
        )

    warnings: list[str] = []
    if has_negative_y:
        warnings.append('Some CPL Y coordinates are negative; verify board origin before upload.')

    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open('w', encoding='utf-8', newline='') as handle:
        writer = csv.writer(handle)
        writer.writerow(['Designator', 'Mid X', 'Mid Y', 'Layer', 'Rotation'])
        for line in lines:
            writer.writerow([
                line.designator,
                _format_mm(line.mid_x_mm),
                _format_mm(line.mid_y_mm),
                line.layer,
                _format_rotation(line.rotation),
            ])

    return CPLResult(
        total_parts=len(components),
        exported_count=len(lines),
        excluded_count=excluded_count,
        warnings=warnings,
        lines=lines,
    )
