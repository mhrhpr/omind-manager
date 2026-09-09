from app.analysis_pipeline import build_pipeline, clean_rows, validate_rows


def test_clean_pipeline_normalizes_headers_values_and_duplicates() -> None:
    raw = [
        {"  Region  ": " Tehran ", "Sales": "۱۲۳۴", "id": "1"},
        {"  Region  ": " Tehran ", "Sales": "۱۲۳۴", "id": "1"},
        {"  Region  ": " Tabriz ", "Sales": "1,500", "id": "2"},
    ]
    cleaned, report = build_pipeline(raw)
    assert len(cleaned) == 2
    assert report["cleaning"]["removed_duplicate_rows"] == 1
    assert cleaned[0]["Region"] == "Tehran"
    assert cleaned[0]["Sales"] == 1234
    assert report["validation"]["valid"] is True


def test_validation_detects_high_missingness() -> None:
    rows = [{"id": 1, "sales": 100, "region": "A"}, {"id": 2, "sales": None, "region": "A"}, {"id": 3, "sales": None, "region": None}, {"id": 4, "sales": None, "region": "B"}]
    _, cleaning = clean_rows(rows)
    report = validate_rows(rows, cleaning)
    assert report["score"] < 100
    assert any("خالی" in warning for warning in report["warnings"])


def test_invalid_dataset_without_numeric_measure_is_not_analysis_ready() -> None:
    rows = [{"id": 1, "name": "A"}, {"id": 2, "name": "B"}]
    _, cleaning = clean_rows(rows)
    report = validate_rows(rows, cleaning)
    assert report["valid"] is False
    assert report["score"] <= 90
