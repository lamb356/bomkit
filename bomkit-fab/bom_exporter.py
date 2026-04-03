from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path
from typing import Any

try:
    from .board_adapter import ComponentData
    from .field_resolver import resolve_lcsc
except ImportError:  # pragma: no cover
    from board_adapter import ComponentData
    from field_resolver import resolve_lcsc


@dataclass(slots=True)
class BOMLine:
    comment: str
    designators: list[str]
    footprint: str
    lcsc_part_number: str


@dataclass(slots=True)
class BOMResult:
    total_parts: int
    resolved_count: int
    unresolved_count: int
    dnp_count: int
    excluded_count: int
    lines: list[BOMLine]


def _chunked(values: list[str], size: int) -> list[list[str]]:
    return [values[index:index + size] for index in range(0, len(values), size)]


def export_bom(components: list[ComponentData], output_path: str | Path) -> BOMResult:
    grouped: dict[tuple[str, str, str], list[str]] = {}
    resolved_count = 0
    unresolved_count = 0
    dnp_count = 0
    excluded_count = 0

    for component in components:
        if component.exclude_from_bom:
            excluded_count += 1
            continue
        if component.is_dnp:
            dnp_count += 1
            continue

        lcsc_part = resolve_lcsc(component) or ''
        if lcsc_part:
            resolved_count += 1
        else:
            unresolved_count += 1

        key = (component.value, component.footprint, lcsc_part)
        grouped.setdefault(key, []).append(component.reference)

    lines: list[BOMLine] = []
    seen_designators: set[str] = set()
    for (value, footprint, lcsc_part), designators in sorted(grouped.items()):
        ordered_designators = sorted(designators)
        for chunk in _chunked(ordered_designators, 200):
            overlap = seen_designators.intersection(chunk)
            if overlap:
                raise ValueError(f'Designators duplicated across BOM groups: {sorted(overlap)}')
            seen_designators.update(chunk)
            lines.append(
                BOMLine(
                    comment=value,
                    designators=chunk,
                    footprint=footprint,
                    lcsc_part_number=lcsc_part,
                )
            )

    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open('w', encoding='utf-8', newline='') as handle:
        writer = csv.writer(handle)
        writer.writerow(['Comment', 'Designator', 'Footprint', 'LCSC Part Number'])
        for line in lines:
            writer.writerow([
                line.comment,
                ','.join(line.designators),
                line.footprint,
                line.lcsc_part_number,
            ])

    return BOMResult(
        total_parts=len(components),
        resolved_count=resolved_count,
        unresolved_count=unresolved_count,
        dnp_count=dnp_count,
        excluded_count=excluded_count,
        lines=lines,
    )
