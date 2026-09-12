from __future__ import annotations

import math
import statistics
from collections import defaultdict
from datetime import datetime
from typing import Any, Iterable, Mapping


NULL_TOKENS = {"", "-", "—", "null", "none", "nan", "n/a", "na", "ندارد", "نامشخص"}
_DIGIT_TRANSLATION = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")


def _safe_float(value: Any) -> float | None:
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        try:
            number = float(value)
            return number if math.isfinite(number) else None
        except Exception:
            return None
    text = str(value).strip()
    if not text:
        return None
    text = text.translate(_DIGIT_TRANSLATION).replace("٬", "").replace(",", "").replace(" ", "").replace("٫", ".")
    try:
        number = float(text)
        return number if math.isfinite(number) else None
    except Exception:
        return None


def _parse_date(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        return value
    if value is None:
        return None
    text = str(value).strip().translate(_DIGIT_TRANSLATION).replace("/", "-")
    if not text:
        return None
    for fmt in (
        "%Y-%m-%d", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M",
        "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%dT%H:%M",
    ):
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            continue
    return None


def _is_null(value: Any) -> bool:
    if value is None:
        return True
    return str(value).strip().lower() in NULL_TOKENS


def _numeric_series(rows: list[dict[str, Any]], column: str) -> list[float]:
    result = []
    for row in rows:
        value = _safe_float(row.get(column))
        if value is not None:
            result.append(value)
    return result


def _infer_column_type(rows: list[dict[str, Any]], column: str) -> str:
    values = [row.get(column) for row in rows if not _is_null(row.get(column))]
    if not values:
        return "unknown"
    date_ratio = sum(_parse_date(value) is not None for value in values) / len(values)
    number_ratio = sum(_safe_float(value) is not None for value in values) / len(values)
    if date_ratio >= 0.85:
        return "date"
    if number_ratio >= 0.90:
        return "number"
    unique = len({str(value).strip() for value in values})
    if unique <= max(20, int(len(values) * 0.08)):
        return "category"
    return "text"


def _describe(values: list[float]) -> dict[str, Any]:
    if not values:
        return {"count": 0}
    ordered = sorted(values)
    q1 = statistics.quantiles(ordered, n=4, method="inclusive")[0] if len(ordered) >= 2 else ordered[0]
    q3 = statistics.quantiles(ordered, n=4, method="inclusive")[2] if len(ordered) >= 2 else ordered[0]
    mean = statistics.fmean(values)
    median = statistics.median(values)
    std = statistics.pstdev(values) if len(values) > 1 else 0.0
    iqr = q3 - q1
    lower = q1 - 1.5 * iqr
    upper = q3 + 1.5 * iqr
    outliers = [value for value in values if value < lower or value > upper]
    return {
        "count": len(values),
        "sum": round(sum(values), 4),
        "mean": round(mean, 4),
        "median": round(median, 4),
        "min": round(min(values), 4),
        "max": round(max(values), 4),
        "std": round(std, 4),
        "q1": round(q1, 4),
        "q3": round(q3, 4),
        "outlier_count": len(outliers),
        "outlier_rate": round(len(outliers) / len(values), 4),
    }


def _pearson(xs: list[float], ys: list[float]) -> float | None:
    if len(xs) != len(ys) or len(xs) < 3:
        return None
    mx, my = statistics.fmean(xs), statistics.fmean(ys)
    numerator = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    dx = math.sqrt(sum((x - mx) ** 2 for x in xs))
    dy = math.sqrt(sum((y - my) ** 2 for y in ys))
    if dx == 0 or dy == 0:
        return None
    return round(numerator / (dx * dy), 4)


def _change(first: float, last: float) -> float | None:
    if first == 0:
        return None
    return round((last - first) / abs(first), 4)


def _top_category_effect(rows: list[dict[str, Any]], category: str, measure: str) -> list[dict[str, Any]]:
    groups: dict[str, list[float]] = defaultdict(list)
    for row in rows:
        key = row.get(category)
        value = _safe_float(row.get(measure))
        if key is None or value is None:
            continue
        groups[str(key)].append(value)
    result = [{"category": key, "count": len(values), **_describe(values)} for key, values in groups.items()]
    result.sort(key=lambda item: item["sum"], reverse=True)
    return result[:10]


def _date_trend(rows: list[dict[str, Any]], date_column: str, measure: str) -> dict[str, Any] | None:
    points = []
    for row in rows:
        date = _parse_date(row.get(date_column))
        value = _safe_float(row.get(measure))
        if date is not None and value is not None:
            points.append((date, value))
    if len(points) < 4:
        return None
    points.sort(key=lambda item: item[0])
    window = max(1, len(points) // 5)
    first_avg = statistics.fmean(value for _, value in points[:window])
    last_avg = statistics.fmean(value for _, value in points[-window:])
    return {
        "date_column": date_column,
        "measure": measure,
        "start": points[0][0].date().isoformat(),
        "end": points[-1][0].date().isoformat(),
        "first_window_avg": round(first_avg, 4),
        "last_window_avg": round(last_avg, 4),
        "change": _change(first_avg, last_avg),
        "direction": "up" if last_avg > first_avg else "down" if last_avg < first_avg else "flat",
        "point_count": len(points),
    }


def _signal_rank(signal_type: str, impact: float, confidence: float) -> float:
    weights = {"anomaly": 1.25, "trend": 1.10, "segment": 1.05, "quality": 0.80, "relationship": 0.90}
    return round(impact * confidence * weights.get(signal_type, 1.0), 4)


def _question_focus(question: str | None, measures: list[str], dimensions: list[str]) -> str:
    if not question:
        return "overall performance"
    normalized = question.strip().lower()
    for column in measures + dimensions:
        if str(column).lower() in normalized:
            return column
    keywords = {
        "فروش": "sales", "درآمد": "revenue", "سود": "profit",
        "تاخیر": "delay", "مشتری": "customer", "فروشنده": "salesperson", "تحویل": "delivery",
    }
    for key, value in keywords.items():
        if key in normalized:
            return value
    return "question-driven analysis"


def analyze_dataset(
    rows: Iterable[Mapping[str, Any]],
    *,
    question: str | None = None,
    quality: Mapping[str, Any] | None = None,
    semantic_model: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    """Deterministic online-data-analyst engine.

    It profiles the dataset, audits quality, describes measures, detects trends,
    compares segments, screens relationships and anomalies, then ranks signals
    and proposes the next analyst action. It does not require an LLM.
    """
    normalized_rows = [dict(row) for row in rows]
    if not normalized_rows:
        return {
            "status": "insufficient_data",
            "summary": "No analyzable rows were found.",
            "signals": [],
            "metrics": [],
            "trends": [],
            "relationships": [],
            "recommendations": [],
        }

    columns = list(dict.fromkeys(key for row in normalized_rows for key in row.keys()))
    types = {column: _infer_column_type(normalized_rows, column) for column in columns}
    date_columns = [column for column, kind in types.items() if kind == "date"]
    measures = [column for column, kind in types.items() if kind == "number"]
    dimensions = [column for column, kind in types.items() if kind in {"category", "text"}]
    semantic_model = semantic_model or {}
    date_column = semantic_model.get("dateColumn") or semantic_model.get("date_column") or (date_columns[0] if date_columns else None)

    metrics = []
    for measure in measures[:12]:
        values = _numeric_series(normalized_rows, measure)
        if not values:
            continue
        block = _describe(values)
        block["column"] = measure
        block["missing_rate"] = round(sum(_is_null(row.get(measure)) for row in normalized_rows) / len(normalized_rows), 4)
        metrics.append(block)

    signals: list[dict[str, Any]] = []
    trends: list[dict[str, Any]] = []

    if date_column:
        for measure in measures[:8]:
            trend = _date_trend(normalized_rows, date_column, measure)
            if not trend or trend["change"] is None:
                continue
            trends.append(trend)
            magnitude = min(1.0, abs(trend["change"]) / 0.35)
            confidence = min(0.97, 0.55 + 0.35 * min(1.0, trend["point_count"] / 100))
            if abs(trend["change"]) >= 0.08:
                signals.append({
                    "type": "trend",
                    "title": f"{measure} changed {trend['direction']}",
                    "metric": measure,
                    "evidence": trend,
                    "impact": round(0.45 + 0.45 * magnitude, 2),
                    "confidence": round(confidence, 2),
                    "guardrail": "Trend evidence describes change over the observed period; it does not identify the cause.",
                })

    for dimension in dimensions[:8]:
        for measure in measures[:6]:
            groups = _top_category_effect(normalized_rows, dimension, measure)
            if len(groups) < 2:
                continue
            measure_values = _numeric_series(normalized_rows, measure)
            if not measure_values:
                continue
            overall = statistics.fmean(measure_values)
            if overall == 0:
                continue
            high = max(groups, key=lambda item: abs(item["mean"] - overall))
            delta = (high["mean"] - overall) / abs(overall)
            if abs(delta) >= 0.20:
                signals.append({
                    "type": "segment",
                    "title": f"{measure} differs materially by {dimension}",
                    "dimension": dimension,
                    "metric": measure,
                    "evidence": {
                        "overall_mean": round(overall, 4),
                        "largest_deviation_segment": high,
                        "segment_delta": round(delta, 4),
                        "segments": groups,
                    },
                    "impact": round(min(0.95, 0.55 + abs(delta)), 2),
                    "confidence": round(min(0.95, 0.60 + min(0.30, high["count"] / max(1, len(normalized_rows)))), 2),
                    "guardrail": "Segment differences show association within the observed sample; they do not establish causation.",
                })

    relationships = []
    for i, left in enumerate(measures[:10]):
        for right in measures[i + 1:10]:
            xs, ys = [], []
            for row in normalized_rows:
                x, y = _safe_float(row.get(left)), _safe_float(row.get(right))
                if x is not None and y is not None:
                    xs.append(x)
                    ys.append(y)
            corr = _pearson(xs, ys)
            if corr is None or abs(corr) < 0.55:
                continue
            relationships.append({"left": left, "right": right, "pearson": corr, "sample_size": len(xs)})
            signals.append({
                "type": "relationship",
                "title": f"Strong relationship: {left} ↔ {right}",
                "metric": left,
                "evidence": {"left": left, "right": right, "pearson": corr, "sample_size": len(xs)},
                "impact": round(min(0.85, 0.35 + abs(corr) * 0.55), 2),
                "confidence": round(min(0.95, 0.60 + min(0.30, len(xs) / 500)), 2),
                "guardrail": "Correlation does not establish causation.",
            })

    for metric in metrics:
        if metric["outlier_rate"] >= 0.03:
            signals.append({
                "type": "anomaly",
                "title": f"{metric['column']} contains unusual values",
                "metric": metric["column"],
                "evidence": {
                    "outlier_count": metric["outlier_count"],
                    "outlier_rate": metric["outlier_rate"],
                    "q1": metric["q1"],
                    "q3": metric["q3"],
                },
                "impact": round(min(0.88, 0.40 + metric["outlier_rate"] * 3), 2),
                "confidence": 0.88,
                "guardrail": "An IQR outlier is a screening signal, not proof of an error.",
            })

    if quality:
        score = quality.get("score")
        if isinstance(score, (int, float)) and score < 85:
            signals.append({
                "type": "quality",
                "title": "Data quality may limit decision confidence",
                "evidence": dict(quality),
                "impact": round(min(0.90, (100 - float(score)) / 100 + 0.25), 2),
                "confidence": 0.96,
                "guardrail": "Lower data quality reduces confidence in downstream findings; fix critical quality issues before high-stakes decisions.",
            })

    for signal in signals:
        signal["rank"] = _signal_rank(signal["type"], signal["impact"], signal["confidence"])
        signal["priority"] = "high" if signal["rank"] >= 0.70 else "medium" if signal["rank"] >= 0.40 else "low"
    signals.sort(key=lambda item: item["rank"], reverse=True)
    signals = signals[:12]

    top_signal = signals[0] if signals else None
    recommendations = []
    if top_signal:
        if top_signal["type"] == "quality":
            action = "Resolve the highest-impact data quality issues before using the dataset for a high-stakes decision."
        elif top_signal["type"] == "trend":
            action = f"Investigate the drivers behind the {top_signal['metric']} trend before changing the current operating decision."
        elif top_signal["type"] == "segment":
            action = f"Drill into {top_signal['dimension']} for {top_signal['metric']} and compare segments before reallocating resources."
        elif top_signal["type"] == "relationship":
            action = f"Test the relationship between {top_signal['evidence']['left']} and {top_signal['evidence']['right']} with a controlled or causal analysis; do not infer causation from correlation."
        else:
            action = f"Investigate the unusual {top_signal['metric']} observations and validate whether they are operational events or data errors."
        recommendations.append({
            "type": "next_action",
            "action": action,
            "priority": "high",
            "confidence": top_signal["confidence"],
            "based_on": [top_signal],
        })

    focus = _question_focus(question, measures, dimensions)
    summary = (
        f"Analyzed {len(normalized_rows):,} records across {len(columns)} columns. "
        f"Detected {len(measures)} measurable fields and {len(dimensions)} descriptive fields"
        + (f", with {len(signals)} decision-relevant signals." if signals else ".")
    )

    confidence = int(round((signals[0]["confidence"] * 100) if signals else 45))
    readiness = "ready" if confidence >= 75 and signals else "investigate" if confidence >= 55 else "fix-data"

    return {
        "status": "ok",
        "analyst": {
            "role": "online_data_analyst",
            "focus": focus,
            "method": [
                "profiling", "quality", "descriptive_statistics", "trend_detection",
                "segment_comparison", "correlation_screening", "outlier_screening",
            ],
        },
        "dataset": {
            "rows": len(normalized_rows),
            "columns": len(columns),
            "date_column": date_column,
            "measures": measures,
            "dimensions": dimensions,
        },
        "summary": summary,
        "metrics": metrics,
        "trends": trends,
        "relationships": relationships[:20],
        "signals": signals,
        "recommendations": recommendations,
        "confidence": confidence,
        "decision": {
            "readiness": readiness,
            "top_signal": top_signal,
            "recommended_action": recommendations[0]["action"] if recommendations else "Collect more evidence before making a decision.",
        },
        "guardrails": [
            "Correlation does not establish causation.",
            "Anomalies are investigation signals, not automatic errors.",
            "Recommendations are decision support and should be checked against business context.",
        ],
    }
