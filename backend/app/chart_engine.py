from __future__ import annotations

import math
from datetime import datetime
from typing import Any


def _num(v: Any) -> float | None:
    if isinstance(v, bool) or not isinstance(v, (int, float)):
        return None
    x = float(v)
    return x if math.isfinite(x) else None


def _date(v: Any) -> datetime | None:
    if isinstance(v, datetime):
        return v
    if isinstance(v, str):
        for fmt in ('%Y-%m-%d', '%Y/%m/%d', '%d-%m-%Y', '%d/%m/%Y'):
            try:
                return datetime.strptime(v.strip(), fmt)
            except ValueError:
                continue
    return None


def _type(v: Any) -> str:
    if _num(v) is not None:
        return 'number'
    if _date(v) is not None:
        return 'date'
    return 'text'


def _columns(rows: list[dict[str, Any]]) -> list[str]:
    out: list[str] = []
    for row in rows:
        for key in row:
            if key not in out:
                out.append(key)
    return out


def _field_kind(rows: list[dict[str, Any]], name: str) -> str:
    values = [r.get(name) for r in rows if r.get(name) not in (None, '')]
    if not values:
        return 'text'
    counts = {'number': 0, 'date': 0, 'text': 0}
    for value in values:
        counts[_type(value)] += 1
    return max(counts, key=counts.get)


def build_chart_specs(rows: list[dict[str, Any]], columns: list[dict[str, Any]] | None = None) -> list[dict[str, Any]]:
    if not rows:
        return []
    names = _columns(rows)
    profile = {c['name']: c for c in (columns or []) if isinstance(c, dict) and c.get('name')}
    measures = [n for n in names if profile.get(n, {}).get('role') == 'measure' or _field_kind(rows, n) == 'number']
    dates = [n for n in names if profile.get(n, {}).get('role') == 'date' or _field_kind(rows, n) == 'date']
    dimensions = [n for n in names if n not in measures and n not in dates]
    charts: list[dict[str, Any]] = []

    # 1) Overall distribution of the strongest numeric metric.
    if measures:
        metric = measures[0]
        values = [_num(r.get(metric)) for r in rows]
        values = [v for v in values if v is not None]
        if values:
            buckets = 8
            lo, hi = min(values), max(values)
            if hi > lo:
                width = (hi - lo) / buckets
                counts = [0] * buckets
                for value in values:
                    idx = min(buckets - 1, int((value - lo) / width))
                    counts[idx] += 1
                labels = [f'{lo + width*i:.1f}' for i in range(buckets)]
                charts.append({'id': 'distribution', 'type': 'bar', 'title': f'توزیع {metric}', 'description': 'توزیع مقادیر برای تشخیص تمرکز و پراکندگی.', 'xKey': 'label', 'yKey': 'value', 'data': [{'label': labels[i], 'value': counts[i]} for i in range(buckets)]})

    # 2) Trend: aggregate numeric metric by detected date.
    if dates and measures:
        date_col, metric = dates[0], measures[0]
        grouped: dict[str, list[float]] = {}
        for row in rows:
            dt, value = _date(row.get(date_col)), _num(row.get(metric))
            if not dt or value is None:
                continue
            key = dt.strftime('%Y-%m-%d')
            grouped.setdefault(key, []).append(value)
        points = sorted(grouped.items())
        if len(points) >= 4:
            charts.append({'id': 'trend', 'type': 'line', 'title': f'روند {metric}', 'description': f'تغییر {metric} در طول زمان بر اساس {date_col}.', 'xKey': 'label', 'yKey': 'value', 'data': [{'label': k, 'value': round(sum(v)/len(v), 2)} for k, v in points[:120]]})

    # 3) Category comparison: top categories by average of the first metric.
    if dimensions and measures:
        dimension, metric = dimensions[0], measures[0]
        grouped: dict[str, list[float]] = {}
        for row in rows:
            key, value = row.get(dimension), _num(row.get(metric))
            if key in (None, '') or value is None:
                continue
            grouped.setdefault(str(key), []).append(value)
        ranked = sorted(((k, sum(v)/len(v)) for k, v in grouped.items()), key=lambda x: x[1], reverse=True)[:10]
        if len(ranked) >= 2:
            charts.append({'id': 'comparison', 'type': 'bar', 'title': f'{metric} بر اساس {dimension}', 'description': 'مقایسه گروه‌ها برای پیدا کردن شکاف عملکرد.', 'xKey': 'label', 'yKey': 'value', 'data': [{'label': k, 'value': round(v, 2)} for k, v in ranked]})

    # 4) Correlation scatter between first two numeric fields.
    if len(measures) >= 2:
        a, b = measures[:2]
        pairs = []
        for row in rows:
            x, y = _num(row.get(a)), _num(row.get(b))
            if x is not None and y is not None:
                pairs.append({'x': round(x, 3), 'y': round(y, 3), 'label': str(row.get(dimensions[0])) if dimensions and row.get(dimensions[0]) not in (None, '') else ''})
        if len(pairs) >= 8:
            charts.append({'id': 'relationship', 'type': 'scatter', 'title': f'{a} × {b}', 'description': 'رابطه مشاهده‌شده بین دو شاخص عددی؛ همبستگی به‌معنای علیت نیست.', 'xKey': 'x', 'yKey': 'y', 'data': pairs[:300]})

    return charts[:4]
