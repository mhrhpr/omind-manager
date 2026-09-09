from __future__ import annotations

import csv
import io
import json
import math
from datetime import datetime
from typing import Any

MODULES = ['Intake', 'Observe', 'Decompose', 'Pattern', 'Hypothesis', 'Causality', 'Decision', 'Scenarios', 'Experiment', 'Action', 'Feedback', 'Loop']
PRIORITY_WEIGHT = {'high': 30, 'medium': 15, 'low': 0}
ROLE_QUESTIONS = {
    'sales': 'کدام بخش فروش بیشترین افت یا فرصت رشد را دارد؟',
    'finance': 'کدام شاخص مالی بیشترین ریسک را نشان می‌دهد؟',
    'hr': 'کدام بخش نیروی انسانی بیشترین ریسک یا افت را دارد؟',
    'ops': 'کدام بخش عملیات بیشترین گلوگاه را دارد؟',
    'manager': 'مهم‌ترین مسئله مدیریتی این داده چیست؟',
}


def _normalize_number(value: Any) -> Any:
    if not isinstance(value, str): return value
    s = value.replace('\u200c', '').replace('\u200f', '').strip()
    digits = '۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩'
    latin = '01234567890123456789'
    s2 = s.translate(str.maketrans(digits, latin)).replace(',', '').replace('،', '')
    if s2 and all(ch in '-.0123456789' for ch in s2) and any(ch.isdigit() for ch in s2):
        try: return float(s2) if '.' in s2 else int(s2)
        except ValueError: pass
    return None if s == '' else s


def parse_upload(filename: str, content: bytes) -> list[dict[str, Any]]:
    lower = filename.lower()
    if lower.endswith('.json'):
        parsed = json.loads(content.decode('utf-8-sig')); data = parsed if isinstance(parsed, list) else parsed.get('data') if isinstance(parsed, dict) else None
        if not isinstance(data, list) or not all(isinstance(r, dict) for r in data): raise ValueError('JSON must be an array of objects or an object with a data array')
        return [{k: _normalize_number(v) for k, v in row.items()} for row in data]
    if lower.endswith('.csv'):
        text = content.decode('utf-8-sig')
        try: dialect = csv.Sniffer().sniff(text[:4096])
        except csv.Error: dialect = csv.excel
        reader = csv.DictReader(io.StringIO(text), dialect=dialect)
        if not reader.fieldnames: raise ValueError('CSV has no header row')
        return [{k: _normalize_number(v) for k, v in row.items()} for row in reader]
    if lower.endswith(('.xlsx', '.xls')):
        import pandas as pd
        engine = 'openpyxl' if lower.endswith('.xlsx') else 'xlrd'
        frame = pd.read_excel(io.BytesIO(content), sheet_name=0, engine=engine).where(lambda x: x.notna(), None)
        return [{str(k): _normalize_number(v.item() if hasattr(v, 'item') else v) for k, v in row.items()} for row in frame.to_dict(orient='records')]
    raise ValueError('unsupported file type; use CSV, XLSX, XLS or JSON')


def _numeric(values: list[Any]) -> list[float]: return [float(v) for v in values if isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(float(v))]


def _date_value(value: Any) -> datetime | None:
    if isinstance(value, datetime): return value
    if isinstance(value, str):
        for fmt in ('%Y-%m-%d', '%Y/%m/%d', '%d-%m-%Y', '%d/%m/%Y'):
            try: return datetime.strptime(value.strip(), fmt)
            except ValueError: pass
    return None


def _round(value: float, digits: int = 1) -> float: return round(value, digits)


def _priority(score: float) -> str: return 'high' if score >= 65 else 'medium' if score >= 30 else 'low'


def analyze_rows(rows: list[dict[str, Any]], question: str, user_role: str = 'manager') -> dict[str, Any]:
    if not rows: raise ValueError('file contains no analyzable rows')
    user_role = user_role if user_role in ROLE_QUESTIONS else 'manager'
    names: list[str] = []
    for row in rows:
        for key in row:
            if key not in names: names.append(key)
    columns = []
    for name in names:
        vals = [r.get(name) for r in rows]; present = [v for v in vals if v not in (None, '')]; unique = len({str(v) for v in present}); numeric_ratio = len(_numeric(present)) / len(present) if present else 0; date_ratio = sum(_date_value(v) is not None for v in present) / len(present) if present else 0; lower = name.lower()
        role, typ = 'text', 'text'
        if date_ratio >= .7 or any(t in lower for t in ('date', 'time', 'تاریخ', 'روز', 'ماه', 'سال')): role, typ = 'date', 'date'
        elif numeric_ratio >= .8: role, typ = 'measure', 'number'
        elif unique <= max(20, len(rows) * .1): role = 'category'
        if lower == 'id' or lower.endswith('_id') or 'شناسه' in lower or 'کد' in lower or unique == len(rows): role = 'key'
        columns.append({'name': name, 'role': role, 'type': typ, 'missing': len(rows) - len(present), 'unique': unique})

    duplicate_count = len(rows) - len({json.dumps(r, sort_keys=True, default=str, ensure_ascii=False) for r in rows})
    missing_cells = sum(c['missing'] for c in columns); total_cells = max(1, len(rows) * max(1, len(columns))); missing_rate = missing_cells / total_cells; duplicate_rate = duplicate_count / max(1, len(rows))
    health = max(0, round(100 - missing_rate * 45 - duplicate_rate * 30))
    measures = [c['name'] for c in columns if c['role'] == 'measure']; categories = [c['name'] for c in columns if c['role'] == 'category']; dates = [c['name'] for c in columns if c['role'] == 'date']
    signals: list[dict[str, Any]] = []

    if missing_rate > .05:
        score = min(100, missing_rate * 300); signals.append({'type': 'missingness', 'title': 'مقادیر خالی قابل توجه', 'detail': f'{round(missing_rate*100)}٪ از سلول‌ها خالی یا null هستند.', 'priority': _priority(score), 'score': round(score)})
    if duplicate_count:
        score = min(100, duplicate_rate * 250); signals.append({'type': 'duplicate', 'title': 'ردیف‌های تکراری', 'detail': f'{duplicate_count} ردیف تکراری شناسایی شد.', 'priority': _priority(score), 'score': round(score)})

    metric_highlights: list[dict[str, Any]] = []
    for metric in measures[:8]:
        vals = _numeric([r.get(metric) for r in rows]);
        if len(vals) < 5: continue
        mean = sum(vals) / len(vals); minimum, maximum = min(vals), max(vals); sd = math.sqrt(sum((v - mean) ** 2 for v in vals) / len(vals)); outliers = sum(1 for v in vals if sd and abs(v - mean) > 3 * sd)
        metric_highlights.append({'metric': metric, 'mean': _round(mean), 'min': _round(minimum), 'max': _round(maximum), 'outliers': outliers})
        if outliers:
            rate = outliers / len(vals); score = min(100, rate * 1200); signals.append({'type': 'outlier', 'title': f'ناهنجاری در {metric}', 'detail': f'{outliers} مقدار بیش از ۳ انحراف معیار از میانگین فاصله دارد.', 'priority': _priority(score), 'score': round(score)})

    if categories and measures:
        cat, metric = categories[0], measures[0]; groups: dict[str, list[float]] = {}
        for row in rows:
            key, value = row.get(cat), row.get(metric)
            if key in (None, '') or not isinstance(value, (int, float)) or isinstance(value, bool): continue
            groups.setdefault(str(key), []).append(float(value))
        ranked = sorted(((k, sum(v)/len(v)) for k, v in groups.items() if v), key=lambda x: x[1], reverse=True)
        if len(ranked) >= 2:
            best, worst = ranked[0], ranked[-1]; gap = abs(best[1]-worst[1]); baseline = abs(sum(v for _,v in ranked)/len(ranked)) or 1; gap_pct = gap / baseline * 100
            score = min(100, gap_pct * 2.2); signals.append({'type': 'concentration', 'title': f'شکاف {metric} بین {cat}ها', 'detail': f'میانگین {best[0]} برابر {_round(best[1])} و {worst[0]} برابر {_round(worst[1])} است؛ شکاف {_round(gap_pct)}٪ نسبت به میانگین گروه‌ها.', 'priority': _priority(score), 'score': round(score)})

    if dates and measures and len(rows) >= 6:
        date_col, metric = dates[0], measures[0]; points = [(_date_value(r.get(date_col)), float(r.get(metric))) for r in rows if _date_value(r.get(date_col)) and isinstance(r.get(metric), (int, float))]
        points.sort(key=lambda x: x[0])
        if len(points) >= 6:
            first = sum(v for _, v in points[:max(2, len(points)//4)]) / max(2, len(points)//4); last = sum(v for _, v in points[-max(2, len(points)//4):]) / max(2, len(points)//4); delta_pct = ((last-first)/abs(first)*100) if first else 0; score = min(100, abs(delta_pct) * 2.5)
            direction = 'رشد' if delta_pct > 3 else 'افت' if delta_pct < -3 else 'ثبات نسبی'; signals.append({'type': 'trend', 'title': f'روند {metric}: {direction}', 'detail': f'{metric} از میانگین {_round(first)} در ابتدای بازه به {_round(last)} در انتهای بازه رسیده؛ تغییر {_round(delta_pct)}٪.', 'priority': _priority(score), 'score': round(score)})

    if len(measures) >= 2:
        a, b = measures[:2]; xs = _numeric([r.get(a) for r in rows]); ys = _numeric([r.get(b) for r in rows]); pair = [(float(r.get(a)), float(r.get(b))) for r in rows if isinstance(r.get(a), (int,float)) and isinstance(r.get(b), (int,float))]
        if len(pair) >= 8:
            xa, ya = sum(x for x,_ in pair)/len(pair), sum(y for _,y in pair)/len(pair); den = math.sqrt(sum((x-xa)**2 for x,_ in pair)*sum((y-ya)**2 for _,y in pair)); corr = sum((x-xa)*(y-ya) for x,y in pair)/den if den else 0; strength = abs(corr)*100
            if strength >= 55: signals.append({'type':'correlation','title':f'رابطه بین {a} و {b}','detail':f'ضریب همبستگی حدود {round(corr,2)} است. این رابطه علت را اثبات نمی‌کند و نیاز به بررسی بیشتر دارد.','priority':_priority(strength*.7),'score':round(strength*.7)})

    signals.sort(key=lambda s: (-(s['score'] + PRIORITY_WEIGHT[s['priority']]), -s['score'], s['title']))
    role_question = ROLE_QUESTIONS[user_role]
    questions = [role_question, *[f'کدام {c} عملکرد ضعیف‌تری دارد؟' for c in categories[:2]], *[f'روند {m} در طول زمان چگونه تغییر کرده است؟' for m in measures[:2]], 'مهم‌ترین ناهنجاری یا تغییر غیرعادی این داده چیست؟', 'کدام مسئله بیشترین اثر احتمالی را روی نتیجه دارد؟'][:6]
    resolved = question.strip() or questions[0]; top = signals[:4]
    evidence_score = sum(s['score'] for s in top) / max(1, len(top)); confidence = max(35, min(96, round(42 + evidence_score * .5 + min(12, len(top)*2))))
    decision_readiness = 'ready' if health >= 85 and len(top) >= 1 else 'investigate' if health >= 65 else 'fix-data'
    summary = top[0]['detail'] if top else 'در داده فعلی سیگنال قوی و قابل اتکایی برای اولویت‌بندی پیدا نشد.'
    uncertainties = ['همبستگی علت را اثبات نمی‌کند.', 'بدون baseline یا business context، اثر اقتصادی دقیق قابل برآورد نیست.']
    steps = []
    for i, module in enumerate(MODULES):
        input_items = [resolved] if module == 'Intake' else [f'{s["title"]}: {s["score"]}' for s in top] if module == 'Observe' else [s['detail'] for s in top]
        output = _module_output(module, top, decision_readiness)
        steps.append({'module': module, 'input': input_items, 'output': output, 'confidence': max(25, confidence - max(0, i-4)*2), 'trace': f'{i+1:02d} {module}'})
    reasoning = {'steps': steps, 'priorities': [s['title'] for s in top[:3]], 'hypotheses': [f'فرضیه قابل آزمون: {s["detail"]}' for s in top[:3]], 'actions': [f'«{top[0]["title"]}» را با داده/segment مناسب verify کن.' if top else 'شواهد بیشتری جمع‌آوری کن.', 'یک اقدام محدود با owner، deadline و معیار موفقیت ثبت کن.', 'outcome واقعی را ثبت کن تا چرخه بعدی بر اساس تجربه اصلاح شود.'], 'confidence': confidence}
    return {
        'rows': len(rows), 'columns': columns, 'health': health, 'signals': signals, 'questions': questions, 'priorities': reasoning['priorities'], 'hypotheses': reasoning['hypotheses'], 'actions': reasoning['actions'], 'confidence': confidence, 'trace': [s['trace'] for s in steps], 'reasoning': reasoning, 'resolved_question': resolved, 'role': user_role,
        'summary': summary, 'metric_highlights': metric_highlights, 'decision_readiness': decision_readiness, 'uncertainties': uncertainties,
    }


def _module_output(module: str, top: list[dict[str, Any]], readiness: str) -> list[str]:
    titles = [s['title'] for s in top]
    if module == 'Intake': return ['هدف تحلیل ثبت شد و context نقش کاربر اعمال شد.']
    if module == 'Observe': return [f'شاهد: {t}' for t in titles] or ['شاهد قابل اتکا یافت نشد.']
    if module == 'Decompose': return [f'مسئله قابل پیگیری: {t}' for t in titles]
    if module == 'Pattern': return [f'الگوی داده‌ای: {s["detail"]}' for s in top]
    if module == 'Hypothesis': return [f'فرضیه قابل آزمون: {s["detail"]}' for s in top]
    if module == 'Causality': return ['این سیستم causal claim را قطعی نمی‌کند؛ برای علیت به baseline، comparison یا experiment نیاز است.']
    if module == 'Decision': return [f'آمادگی تصمیم: {readiness}.']
    if module == 'Scenarios': return ['پایش: بدون تغییر', 'مداخله محدود: تغییر کنترل‌شده', 'مداخله قوی: فقط با شواهد و owner مشخص']
    if module == 'Experiment': return ['فرضیه، cohort، baseline، metric و deadline مشخص شود.']
    if module == 'Action': return ['Owner، deadline و expected outcome باید ثبت شوند.']
    if module == 'Feedback': return ['Actual outcome با expected outcome مقایسه شود.']
    return ['Lesson ثبت و برای تصمیم بعدی به context بازگردانده شود.']
