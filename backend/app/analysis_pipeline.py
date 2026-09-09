from __future__ import annotations

from collections import Counter
from datetime import datetime
from typing import Any
import math
import re


_NULL_TOKENS = {"", "null", "none", "n/a", "na", "nan", "-", "—"}
_DIGIT_TABLE = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")


def normalize_header(value: Any) -> str:
    text = str(value).replace("\u200c", " ").replace("\u200f", " ").strip()
    text = re.sub(r"\s+", " ", text)
    return text or "column"


def normalize_cell(value: Any) -> Any:
    if value is None or isinstance(value, bool):
        return value
    if isinstance(value, str):
        text = value.replace("\u200c", "").replace("\u200f", "").strip()
        if text.lower() in _NULL_TOKENS:
            return None
        text = text.translate(_DIGIT_TABLE).replace("،", ",")
        compact = text.replace(",", "")
        if re.fullmatch(r"[-+]?\d+(?:\.\d+)?", compact):
            try:
                number = float(compact)
                return int(number) if number.is_integer() else number
            except ValueError:
                pass
        return text
    if hasattr(value, "item"):
        try:
            value = value.item()
        except Exception:
            pass
    if isinstance(value, float) and not math.isfinite(value):
        return None
    return value


def clean_rows(rows: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    if not rows:
        return [], {"input_rows": 0, "output_rows": 0, "removed_duplicate_rows": 0, "normalized_cells": 0, "empty_cells": 0, "changed_headers": 0}

    original_headers: list[Any] = []
    for row in rows:
        for key in row.keys():
            if key not in original_headers:
                original_headers.append(key)

    header_map: dict[Any, str] = {}
    used: Counter[str] = Counter()
    changed_headers = 0
    for raw in original_headers:
        base = normalize_header(raw)
        used[base] += 1
        normalized = base if used[base] == 1 else f"{base} ({used[base]})"
        header_map[raw] = normalized
        changed_headers += int(str(raw) != normalized)

    normalized_cells = 0
    empty_cells = 0
    cleaned: list[dict[str, Any]] = []
    seen: set[str] = set()
    removed_duplicates = 0
    for row in rows:
        clean: dict[str, Any] = {}
        for raw_key, raw_value in row.items():
            value = normalize_cell(raw_value)
            clean[header_map[raw_key]] = value
            if value is None:
                empty_cells += 1
            elif value != raw_value:
                normalized_cells += 1
        fingerprint = repr(sorted(clean.items(), key=lambda x: x[0]))
        if fingerprint in seen:
            removed_duplicates += 1
            continue
        seen.add(fingerprint)
        cleaned.append(clean)

    return cleaned, {"input_rows": len(rows), "output_rows": len(cleaned), "removed_duplicate_rows": removed_duplicates, "normalized_cells": normalized_cells, "empty_cells": empty_cells, "changed_headers": changed_headers}


def _date_value(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%d-%m-%Y", "%d/%m/%Y", "%Y-%m-%d %H:%M:%S"):
            try:
                return datetime.strptime(value.strip(), fmt)
            except ValueError:
                continue
    return None


def validate_rows(rows: list[dict[str, Any]], cleaning: dict[str, Any]) -> dict[str, Any]:
    if not rows:
        return {"valid": False, "score": 0, "columns": [], "warnings": ["داده قابل تحلیل وجود ندارد."]}
    names: list[str] = []
    for row in rows:
        for key in row:
            if key not in names:
                names.append(key)

    total_cells = max(1, len(rows) * max(1, len(names)))
    missing_cells = 0
    columns: list[dict[str, Any]] = []
    warnings: list[str] = []
    for name in names:
        values = [row.get(name) for row in rows]
        present = [v for v in values if v not in (None, "")]
        numeric = [v for v in present if isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(float(v))]
        dates = [v for v in present if _date_value(v) is not None]
        missing = len(values) - len(present)
        missing_cells += missing
        missing_rate = missing / len(values)
        unique = len({repr(v) for v in present})
        inferred = "number" if present and len(numeric) / len(present) >= 0.8 else "date" if present and len(dates) / len(present) >= 0.7 else "text"
        issues: list[str] = []
        if not present:
            issues.append("column is empty")
            warnings.append(f"ستون «{name}» کاملاً خالی است.")
        elif missing_rate >= 0.25:
            issues.append("high missingness")
            warnings.append(f"ستون «{name}» بیش از ۲۵٪ مقدار خالی دارد.")
        columns.append({"name": name, "type": inferred, "missing": missing, "missing_rate": round(missing_rate * 100, 1), "unique": unique, "issues": issues})

    missing_rate = missing_cells / total_cells
    duplicate_rate = cleaning["removed_duplicate_rows"] / max(1, cleaning["input_rows"])
    warning_penalty = min(25, len(warnings) * 3)
    score = max(0, round(100 - missing_rate * 55 - duplicate_rate * 25 - warning_penalty))
    valid = score >= 60 and any(c["type"] == "number" for c in columns)
    if not valid and not any(c["type"] == "number" for c in columns):
        warnings.append("هیچ measure عددی قابل اتکایی برای تحلیل کمی پیدا نشد.")
        score = max(0, score - 10)
    return {"valid": valid, "score": score, "columns": columns, "warnings": warnings}


def build_semantic_model(rows: list[dict[str, Any]]) -> dict[str, Any]:
    names: list[str] = []
    for row in rows:
        for key in row:
            if key not in names:
                names.append(key)
    measures: list[str] = []
    dimensions: list[str] = []
    date_columns: list[str] = []
    key_candidates: list[str] = []
    for name in names:
        values = [row.get(name) for row in rows if row.get(name) not in (None, "")]
        numeric_ratio = sum(isinstance(v, (int, float)) and not isinstance(v, bool) for v in values) / max(1, len(values))
        date_ratio = sum(_date_value(v) is not None for v in values) / max(1, len(values))
        unique = len({repr(v) for v in values})
        lower = name.lower()
        if date_ratio >= 0.7:
            date_columns.append(name)
        elif numeric_ratio >= 0.8 and not (lower == "id" or lower.endswith("_id") or "شناسه" in lower or "کد" in lower):
            measures.append(name)
        elif lower == "id" or lower.endswith("_id") or "شناسه" in lower or "کد" in lower or unique == len(values):
            key_candidates.append(name)
        else:
            dimensions.append(name)
    key = key_candidates[0] if key_candidates else None
    relationships = []
    if key and dimensions:
        relationships.append({"from": key, "to": dimensions[0], "type": "candidate-dimension"})
    if date_columns and measures:
        relationships.append({"from": date_columns[0], "to": measures[0], "type": "time-series"})
    return {"grain": "one row per record" if key else "one row per observation", "key": key, "date_column": date_columns[0] if date_columns else None, "measures": measures, "dimensions": dimensions, "relationships": relationships}


def build_pipeline(rows: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    cleaned, cleaning = clean_rows(rows)
    validation = validate_rows(cleaned, cleaning)
    model = build_semantic_model(cleaned)
    return cleaned, {"cleaning": cleaning, "validation": validation, "model": model}


def enrich_analysis(result: dict[str, Any], rows: list[dict[str, Any]], pipeline: dict[str, Any]) -> dict[str, Any]:
    enriched = dict(result)
    enriched["pipeline"] = pipeline
    enriched["dataset"] = {"raw_rows": pipeline["cleaning"]["input_rows"], "clean_rows": pipeline["cleaning"]["output_rows"], "columns": len(pipeline["validation"]["columns"]), "missing_cells": pipeline["cleaning"]["empty_cells"], "duplicate_rows_removed": pipeline["cleaning"]["removed_duplicate_rows"]}
    enriched["decision_contract"] = {"status": "ready" if pipeline["validation"]["valid"] and enriched.get("signals") else "investigate", "question": enriched.get("resolved_question", ""), "top_signal": enriched.get("signals", [None])[0], "recommended_action": (enriched.get("actions") or ["شواهد بیشتری جمع‌آوری کن."])[0], "confidence": enriched.get("confidence", 0), "guardrails": ["Correlation is evidence of association, not causation.", "Economic impact requires a business baseline or target."]}
    return enriched
