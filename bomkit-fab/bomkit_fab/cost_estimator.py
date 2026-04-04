from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from bomkit_fab.bom_exporter import BOMLine
from bomkit_fab.jlcpcb_classifier import JLCPCBPart, classify


EXTENDED_LOADING_FEE_USD = 3.0


@dataclass(slots=True)
class CostEstimate:
    total_bom_lines: int
    database_loaded: bool
    basic_count: int
    preferred_extended_count: int
    extended_count: int
    not_found_count: int
    unknown_count: int
    extended_loading_fee_usd: float
    total_loading_fee_usd: float
    status_message: str = ""


def estimate_loading_fees(
    bom_lines: list[BOMLine] | list[Any],
    parts_db: dict[str, JLCPCBPart] | None,
) -> CostEstimate:
    total_bom_lines = len(bom_lines)
    database_loaded = bool(parts_db)

    if not database_loaded:
        return CostEstimate(
            total_bom_lines=total_bom_lines,
            database_loaded=False,
            basic_count=0,
            preferred_extended_count=0,
            extended_count=0,
            not_found_count=0,
            unknown_count=total_bom_lines,
            extended_loading_fee_usd=EXTENDED_LOADING_FEE_USD,
            total_loading_fee_usd=0.0,
            status_message="JLCPCB parts database not loaded.",
        )

    basic_count = 0
    preferred_extended_count = 0
    extended_count = 0
    not_found_count = 0
    unknown_count = 0

    for bom_line in bom_lines:
        lcsc_part_number = getattr(bom_line, "lcsc_part_number", "")
        classification = classify(lcsc_part_number, parts_db)
        if classification == "Basic":
            basic_count += 1
        elif classification == "Preferred Extended":
            preferred_extended_count += 1
        elif classification == "Extended":
            extended_count += 1
        elif classification == "Not Found":
            not_found_count += 1
        else:
            unknown_count += 1

    total_loading_fee_usd = extended_count * EXTENDED_LOADING_FEE_USD
    return CostEstimate(
        total_bom_lines=total_bom_lines,
        database_loaded=True,
        basic_count=basic_count,
        preferred_extended_count=preferred_extended_count,
        extended_count=extended_count,
        not_found_count=not_found_count,
        unknown_count=unknown_count,
        extended_loading_fee_usd=EXTENDED_LOADING_FEE_USD,
        total_loading_fee_usd=total_loading_fee_usd,
        status_message="",
    )
