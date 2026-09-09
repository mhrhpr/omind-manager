from __future__ import annotations

import csv
import io
import json
import math
from datetime import date, datetime
from typing import Any

MODULES = ['Intake', 'Observe', 'Decompose', 'Pattern', 'Hypothesis', 'Causality', 'Decision', 'Scenarios', 'Experiment', 'Action', 'Feedback', 'Loop']


def _normalize_number(value: Any) -> Any:
    if not isinstance(value, str):
        return value
    s = value.replace('\u200c', '').replace('\u200f', '').strip()
    western = str.maketrans('۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩', '01234567890123456789')
    s2 = s.translate(western).replace(',', '').replace('،', '')
    try:
        if s2 and all(ch in '-.0123456789' for ch in s2) and any(ch.isdigit() for ch in s2):
            return float(s2) if '.' in s2 else int(s2)
    except ValueError:
        pass
    return None if s == '' else s


def parse_upload(filename: str, content: bytes) -> list[dict[str, Any]]:
    lower = filename.lower()
    if lower.endswith('.json'):
        parsed = json.loads(content.decode('utf-8-sig'))
        if isinstance(parsed, list):
            data = parsed
        elif isinstance(parsed, dict) and isinstance(parsed.get('data'), list):
            data = parsed['data']
        else:
            raise ValueError('JSON must be an array of objects or an object with a data array')
        if not all(isinstance(row, dict) for row in data):
            raise ValueError('JSON data rows must be objects')
        return [{k: _normalize_number(v) for k, v in row.items()} for row in data]
    if lower.endswith('.csv'):
        text = content.decode('utf-8-sig')
        sample = text[:4096]
        try:
            dialect = csv.Sniffer().sniff(sample)
        except csv.Error:
            dialect = csv.excel
        reader = csv.DictReader(io.StringIO(text), dialect=dialect)
        if not reader.fieldnames:
            raise ValueError('CSV has no header row')
        return [{k: _normalize_number(v) for k, v in row.items()} for row in reader]
    if lower.endswith('.xlsx') or lower.endswith('.xls'):
        try:
            import pandas as pd
        except ImportError as exc:
            raise ValueError('Spreadsheet support is unavailable on the server') from exc
        engine = 'openpyxl' if lower.endswith('.xlsx') else 'xlrd'
        frame = pd.read_excel(io.BytesIO(content), sheet_name=0, engine=engine)
        frame = frame.where(frame.notna(), None)
        return [{str(k): _normalize_number(v.item() if hasattr(v, 'item') else v) for k, v in row.items()} for row in frame.to_dict(orient='records')]
    raise ValueError('unsupported file type')


def _numeric(values: list[Any]) -> list[float]:
    return [float(v) for v in values if isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(float(v))]


def analyze_rows(rows: list[dict[str, Any]], question: str) -> dict[str, Any]:
    if not rows:
        raise ValueError('file contains no analyzable rows')
    names: list[str] = []
    for row in rows:
        for key in row:
            if key not in names:
                names.append(key)
    columns = []
    for name in names:
        vals = [row.get(name) for row in rows]
        present = [v for v in vals if v not in (None, '')]
        unique = len({str(v) for v in present})
        numeric_ratio = (len(_numeric(present)) / len(present)) if present else 0
        lower = name.lower()
        role = 'text'; typ = 'text'
        if any(token in lower for token in ('date', 'time', 'تاریخ', 'روز', 'ماه', 'سال')):
            role, typ = 'date', 'date'
        elif numeric_ratio >= 0.8:
            role, typ = 'measure', 'number'
        elif unique <= max(20, len(rows) * 0.1):
            role, typ = 'category', 'text'
        if lower == 'id' or lower.endswith('_id') or 'شناسه' in lower or 'کد' in lower or unique == len(rows):
            role = 'key'
        columns.append({'name': name, 'role': role, 'type': typ, 'missing': len(rows) - len(present), 'unique': unique})

    duplicate_count = len(rows) - len({json.dumps(row, sort_keys=True, default=str, ensure_ascii=False) for row in rows})
    missing_cells = sum(c['missing'] for c in columns)
    total_cells = max(1, len(rows) * len(columns))
    missing_rate = missing_cells / total_cells
    duplicate_rate = duplicate_count / max(1, len(rows))
    health = max(0, round(100 - missing_rate * 45 - duplicate_rate * 30))

    signals: list[dict[str, Any]] = []
    if missing_rate > 0.05:
        signals.append({'type': 'missingness', 'title': 'مقادیر خالی قابل توجه', 'detail': f'{round(missing_rate * 100)}٪ از سلول‌ها خالی یا null هستند.', 'priority': 'high' if missing_rate > 0.2 else 'medium', 'score': round(missing_rate * 100)})
    if duplicate_count:
        signals.append({'type': 'outlier', 'title': 'ردیف تکراری', 'detail': f'{duplicate_count} ردیف تکراری شناسایی شد.', 'priority': 'high' if duplicate_rate > 0.05 else 'medium', 'score': round(duplicate_rate * 100)})
    for column in [c for c in columns if c['type'] == 'number'][:6]:
        values = _numeric([row.get(column['name']) for row in rows])
        if len(values) < 5:
            continue
        mean = sum(values) / len(values)
        variance = sum((v - mean) ** 2 for v in values) / len(values)
        sd = math.sqrt(variance)
        outliers = sum(1 for v in values if sd and abs(v - mean) > 3 * sd)
        if outliers:
            rate = outliers / len(values)
            signals.append({'type': 'outlier', 'title': f"ناهنجاری در {column['name']}", 'detail': f'{outliers} مقدار بیش از ۳ انحراف معیار از میانگین فاصله دارد.', 'priority': 'high' if rate > 0.05 else 'medium', 'score': min(100, round(rate * 1000))})
    measures = [c['name'] for c in columns if c['role'] == 'measure']
    categories = [c['name'] for c in columns if c['role'] == 'category']
    if measures and categories:
        signals.append({'type': 'comparison', 'title': f'مقایسه {measures[0]} بر اساس {categories[0]}', 'detail': f'عملکرد {measures[0]} را بین دسته‌های {categories[0]} مقایسه کن.', 'priority': 'low', 'score': 21})
    signals.sort(key=lambda s: (-s['score'], s['title']))
    questions = [*(f'روند {m} در طول زمان چگونه تغییر کرده است؟' for m in measures[:2]), *(f'کدام {c} عملکرد ضعیف‌تری دارد؟' for c in categories[:2]), 'مهم‌ترین ناهنجاری یا تغییر غیرعادی این داده چیست؟', 'کدام مسئله بیشترین اثر احتمالی را روی نتیجه دارد؟'][:6]
    resolved = question.strip() or (questions[0] if questions else 'مهم‌ترین مسئله این داده چیست؟')
    ranked = sorted(signals, key=lambda s: (-({'high': 3, 'medium': 2, 'low': 1}[s['priority']], -s['score'], s['title'])))[:3]
    confidence = max(35, min(96, round(45 + sum(s['score'] for s in ranked) / max(1, len(ranked)) * 0.45)))
    priorities = [s['title'] for s in ranked]
    hypotheses = [f"فرضیه قابل آزمون: {s['detail']}" for s in ranked]
    actions = [f"سیگنال «{ranked[0]['title']}» را با اولویت {ranked[0]['priority']} بررسی کن." if ranked else 'ابتدا شواهد کافی برای اولویت‌بندی جمع‌آوری کن.', 'یک آزمایش محدود با معیار موفقیت و بازه زمانی مشخص اجرا کن.', 'نتیجه واقعی اقدام را ثبت کن تا در چرخه تصمیم بعدی استفاده شود.']
    trace = [{'module': module, 'input': [resolved] if module == 'Intake' else priorities[:3], 'output': _module_output(module, ranked), 'confidence': max(25, confidence - max(0, i - 4) * 2)} for i, module in enumerate(MODULES)]
    return {'rows': len(rows), 'columns': columns, 'health': health, 'signals': signals, 'questions': questions, 'priorities': priorities, 'hypotheses': hypotheses, 'actions': actions, 'confidence': confidence, 'trace': trace, 'resolved_question': resolved}


def _module_output(module: str, ranked: list[dict[str, Any]]) -> list[str]:
    titles = [s['title'] for s in ranked]
    if module == 'Intake': return ['سؤال تحلیل ثبت شد.']
    if module == 'Observe': return titles or ['شواهد قابل توجهی یافت نشد.']
    if module == 'Decompose': return [f'مسئله: {t}' for t in titles]
    if module == 'Pattern': return [f'الگو/تغییر قابل بررسی: {t}' for t in titles]
    if module == 'Hypothesis': return [f'فرضیه: {s["detail"]}' for s in ranked]
    if module == 'Causality': return ['همبستگی به‌تنهایی علت را اثبات نمی‌کند؛ اعتبارسنجی علی لازم است.']
    if module == 'Decision': return [f'اولویت تصمیم: {titles[0]}'] if titles else ['تصمیم بدون شواهد کافی پیشنهاد نمی‌شود.']
    if module == 'Scenarios': return ['محافظه‌کارانه: پایش', 'پایه: اجرای تغییر محدود', 'مداخله: اجرای اقدام همراه با کنترل']
    if module == 'Experiment': return ['آزمایش محدود با معیار موفقیت و بازه زمانی مشخص.']
    if module == 'Action': return ['مالک اقدام، موعد و نتیجه مورد انتظار ثبت شود.']
    if module == 'Feedback': return ['Outcome واقعی با Outcome پیش‌بینی‌شده مقایسه شود.']
    return ['یادگیری به چرخه تصمیم بعدی برگردد.']
