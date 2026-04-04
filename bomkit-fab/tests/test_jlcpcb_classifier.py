from __future__ import annotations

from bomkit_fab import bom_exporter, cost_estimator, jlcpcb_classifier

BOMLine = bom_exporter.BOMLine


def test_load_jlcpcb_parts_supports_flexible_headers_and_classification_flags(tmp_path):
    csv_path = tmp_path / "jlc_parts.csv"
    csv_path.write_text(
        "Part # (LCSC),Library Type,Preferred,Description\n"
        "C123,Basic,,0402 resistor\n"
        "C456,Extended,,MCU\n"
        "C789,Extended,yes,connector\n",
        encoding="utf-8",
    )

    parts = jlcpcb_classifier.load_jlcpcb_parts(str(csv_path))

    assert set(parts) == {"C123", "C456", "C789"}
    assert parts["C123"].classification == "Basic"
    assert parts["C456"].classification == "Extended"
    assert parts["C789"].classification == "Preferred Extended"
    assert parts["C123"].description == "0402 resistor"


def test_load_jlcpcb_parts_returns_empty_dict_for_missing_or_unusable_csv(tmp_path):
    missing = tmp_path / "does_not_exist.csv"
    assert jlcpcb_classifier.load_jlcpcb_parts(str(missing)) == {}

    bad_headers = tmp_path / "bad_headers.csv"
    bad_headers.write_text("Manufacturer,Type\nACME,Basic\n", encoding="utf-8")
    assert jlcpcb_classifier.load_jlcpcb_parts(str(bad_headers)) == {}


def test_classify_returns_expected_status_and_gracefully_handles_missing_database():
    parts_db = {
        "C100": jlcpcb_classifier.JLCPCBPart("C100", "Basic"),
        "C200": jlcpcb_classifier.JLCPCBPart("C200", "Preferred Extended"),
    }

    assert jlcpcb_classifier.classify(" c100 ", parts_db) == "Basic"
    assert jlcpcb_classifier.classify("C200", parts_db) == "Preferred Extended"
    assert jlcpcb_classifier.classify("C999", parts_db) == "Not Found"
    assert jlcpcb_classifier.classify("", parts_db) == "Not Found"
    assert jlcpcb_classifier.classify("C100", None) == "Unknown"
    assert jlcpcb_classifier.classify("C100", {}) == "Unknown"


def test_estimate_loading_fees_counts_tiers_and_extended_fees_per_bom_line():
    parts_db = {
        "C100": jlcpcb_classifier.JLCPCBPart("C100", "Basic"),
        "C200": jlcpcb_classifier.JLCPCBPart("C200", "Preferred Extended"),
        "C300": jlcpcb_classifier.JLCPCBPart("C300", "Extended"),
        "C301": jlcpcb_classifier.JLCPCBPart("C301", "Extended"),
    }
    bom_lines = [
        BOMLine("10K", ["R1"], "R_0402", "C100"),
        BOMLine("MCU", ["U1"], "QFN-32", "C200"),
        BOMLine("Conn A", ["J1"], "CONN", "C300"),
        BOMLine("Conn B", ["J2"], "CONN", "C301"),
        BOMLine("Missing", ["D1"], "LED_0603", "C999"),
        BOMLine("Unresolved", ["R2"], "R_0402", ""),
    ]

    estimate = cost_estimator.estimate_loading_fees(bom_lines, parts_db)

    assert estimate.database_loaded is True
    assert estimate.total_bom_lines == 6
    assert estimate.basic_count == 1
    assert estimate.preferred_extended_count == 1
    assert estimate.extended_count == 2
    assert estimate.not_found_count == 2
    assert estimate.unknown_count == 0
    assert estimate.extended_loading_fee_usd == 3.0
    assert estimate.total_loading_fee_usd == 6.0
    assert estimate.status_message == ""


def test_estimate_loading_fees_gracefully_degrades_when_database_is_not_loaded():
    bom_lines = [
        BOMLine("10K", ["R1"], "R_0402", "C100"),
        BOMLine("100nF", ["C1"], "C_0402", "C200"),
    ]

    estimate = cost_estimator.estimate_loading_fees(bom_lines, None)

    assert estimate.database_loaded is False
    assert estimate.total_bom_lines == 2
    assert estimate.basic_count == 0
    assert estimate.preferred_extended_count == 0
    assert estimate.extended_count == 0
    assert estimate.not_found_count == 0
    assert estimate.unknown_count == 2
    assert estimate.total_loading_fee_usd == 0.0
    assert "not loaded" in estimate.status_message.lower()
