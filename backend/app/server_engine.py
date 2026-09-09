from __future__ import annotations

import csv
import io
import json
import math
from typing import Any

MODULES = ['Intake','Observe','Decompose','Pattern','Hypothesis','Causality','Decision','Scenarios','Experiment','Action','Feedback','Loop']
PRIORITY_WEIGHT = {'high': 30, 'medium': 15, 'low': 0}
ROLE_QUESTIONS = {'sales': 'کدام بخش فروش بیشترین افت یا فرصت رشد را دارد؟','finance': 'کدام شاخص مالی بیشترین ریسک را نشان می‌دهد؟','hr': 'کدام بخش نیروی انسانی بیشترین ریسک یا افت را دارد؟','ops': 'کدام بخش عملیات بیشترین گلوگاه را دارد؟','manager': 'مهم‌ترین مسئله مدیریتی این داده چیست؟'}


def _normalize_number(value: Any) -> Any:
    if not isinstance(value, str): return value
    s = value.replace('\u200c','').replace('\u200f','').strip()
    s2 = s.translate(str.maketrans('۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩','01234567890123456789')).replace(',','').replace('،','')
    if s2 and all(ch in '-.0123456789' for ch in s2) and any(ch.isdigit() for ch in s2):
        try: return float(s2) if '.' in s2 else int(s2)
        except ValueError: pass
    return None if s == '' else s


def parse_upload(filename: str, content: bytes) -> list[dict[str, Any]]:
    lower = filename.lower()
    if lower.endswith('.json'):
        parsed=json.loads(content.decode('utf-8-sig')); data=parsed if isinstance(parsed,list) else parsed.get('data') if isinstance(parsed,dict) else None
        if not isinstance(data,list) or not all(isinstance(r,dict) for r in data): raise ValueError('JSON must be an array of objects or an object with a data array')
        return [{k:_normalize_number(v) for k,v in row.items()} for row in data]
    if lower.endswith('.csv'):
        text=content.decode('utf-8-sig')
        try: dialect=csv.Sniffer().sniff(text[:4096])
        except csv.Error: dialect=csv.excel
        reader=csv.DictReader(io.StringIO(text),dialect=dialect)
        if not reader.fieldnames: raise ValueError('CSV has no header row')
        return [{k:_normalize_number(v) for k,v in row.items()} for row in reader]
    if lower.endswith(('.xlsx','.xls')):
        import pandas as pd
        engine='openpyxl' if lower.endswith('.xlsx') else 'xlrd'
        frame=pd.read_excel(io.BytesIO(content),sheet_name=0,engine=engine).where(lambda x: x.notna(),None)
        return [{str(k):_normalize_number(v.item() if hasattr(v,'item') else v) for k,v in row.items()} for row in frame.to_dict(orient='records')]
    raise ValueError('unsupported file type; use CSV, XLSX, XLS or JSON')


def _numeric(values:list[Any])->list[float]: return [float(v) for v in values if isinstance(v,(int,float)) and not isinstance(v,bool) and math.isfinite(float(v))]


def analyze_rows(rows:list[dict[str,Any]], question:str, user_role:str='manager')->dict[str,Any]:
    if not rows: raise ValueError('file contains no analyzable rows')
    user_role=user_role if user_role in ROLE_QUESTIONS else 'manager'
    names=[]
    for row in rows:
        for key in row:
            if key not in names: names.append(key)
    columns=[]
    for name in names:
        vals=[r.get(name) for r in rows]; present=[v for v in vals if v not in (None,'')]; unique=len({str(v) for v in present}); numeric_ratio=len(_numeric(present))/len(present) if present else 0; lower=name.lower()
        typ='text'; role='text'
        if any(t in lower for t in ('date','time','تاریخ','روز','ماه','سال')): role,typ='date','date'
        elif numeric_ratio>=.8: role,typ='measure','number'
        elif unique<=max(20,len(rows)*.1): role='category'
        if lower=='id' or lower.endswith('_id') or 'شناسه' in lower or 'کد' in lower or unique==len(rows): role='key'
        columns.append({'name':name,'role':role,'type':typ,'missing':len(rows)-len(present),'unique':unique})
    duplicate_count=len(rows)-len({json.dumps(r,sort_keys=True,default=str,ensure_ascii=False) for r in rows}); missing_cells=sum(c['missing'] for c in columns); total_cells=max(1,len(rows)*len(columns)); missing_rate=missing_cells/total_cells; duplicate_rate=duplicate_count/max(1,len(rows)); health=max(0,round(100-missing_rate*45-duplicate_rate*30))
    signals=[]
    if missing_rate>.05: signals.append({'type':'missingness','title':'مقادیر خالی قابل توجه','detail':f'{round(missing_rate*100)}٪ از سلول‌ها خالی یا null هستند.','priority':'high' if missing_rate>.2 else 'medium','score':round(missing_rate*100)})
    if duplicate_count: signals.append({'type':'duplicate','title':'ردیف تکراری','detail':f'{duplicate_count} ردیف تکراری شناسایی شد.','priority':'high' if duplicate_rate>.05 else 'medium','score':round(duplicate_rate*100)})
    for c in [c for c in columns if c['type']=='number'][:6]:
        vals=_numeric([r.get(c['name']) for r in rows])
        if len(vals)<5: continue
        mean=sum(vals)/len(vals); sd=math.sqrt(sum((v-mean)**2 for v in vals)/len(vals)); count=sum(1 for v in vals if sd and abs(v-mean)>3*sd)
        if count:
            rate=count/len(vals); signals.append({'type':'outlier','title':f"ناهنجاری در {c['name']}",'detail':f'{count} مقدار بیش از ۳ انحراف معیار از میانگین فاصله دارد.','priority':'high' if rate>.05 else 'medium','score':min(100,round(rate*1000))})
    measures=[c['name'] for c in columns if c['role']=='measure']; categories=[c['name'] for c in columns if c['role']=='category']
    if measures and categories: signals.append({'type':'comparison','title':f'مقایسه {measures[0]} بر اساس {categories[0]}','detail':f'عملکرد {measures[0]} را بین دسته‌های {categories[0]} مقایسه کن.','priority':'medium' if user_role in ('manager','sales','finance','ops') else 'low','score':21})
    signals.sort(key=lambda s:(-(s['score']+PRIORITY_WEIGHT[s['priority']]),-s['score'],s['title']))
    questions=[ROLE_QUESTIONS[user_role],*[f'کدام {c} عملکرد ضعیف‌تری دارد؟' for c in categories[:2]],*[f'روند {m} در طول زمان چگونه تغییر کرده است؟' for m in measures[:2]],'مهم‌ترین ناهنجاری یا تغییر غیرعادی این داده چیست؟','کدام مسئله بیشترین اثر احتمالی را روی نتیجه دارد؟'][:6]
    resolved=question.strip() or questions[0]; top=signals[:3]; confidence=max(35,min(96,round(45+sum(s['score'] for s in top)/max(1,len(top))*.45)))
    steps=[]
    for i,module in enumerate(MODULES):
        steps.append({'module':module,'input':[resolved] if module=='Intake' else [s['title'] for s in top],'output':_module_output(module,top),'confidence':max(25,confidence-max(0,i-4)*2),'trace':f'{i+1:02d} {module}'})
    reasoning={'steps':steps,'priorities':[s['title'] for s in top],'hypotheses':[f'فرضیه قابل آزمون: {s["detail"]}' for s in top],'actions':[],'confidence':confidence}
    return {'rows':len(rows),'columns':columns,'health':health,'signals':signals,'questions':questions,'priorities':reasoning['priorities'],'hypotheses':reasoning['hypotheses'],'actions':[f'سیگنال «{top[0]["title"]}» را با اولویت {top[0]["priority"]} بررسی کن.' if top else 'ابتدا شواهد کافی برای اولویت‌بندی جمع‌آوری کن.','یک آزمایش محدود با معیار موفقیت و بازه زمانی مشخص اجرا کن.','نتیجه واقعی اقدام را ثبت کن تا در چرخه تصمیم بعدی استفاده شود.'],'confidence':confidence,'trace':[s['trace'] for s in steps],'reasoning':reasoning,'resolved_question':resolved,'role':user_role}


def _module_output(module:str,top:list[dict[str,Any]])->list[str]:
    titles=[s['title'] for s in top]
    if module=='Intake': return ['سؤال تحلیل ثبت شد.']
    if module=='Observe': return [f'شاهد: {t}' for t in titles] or ['شاهد قابل اتکا یافت نشد.']
    if module=='Decompose': return [f'مسئله: {t}' for t in titles]
    if module=='Pattern': return [f'الگوی قابل بررسی: {s["detail"]}' for s in top]
    if module=='Hypothesis': return [f'فرضیه قابل آزمون: {s["detail"]}' for s in top]
    if module=='Causality': return ['همبستگی علت را اثبات نمی‌کند؛ برای ادعای علی باید مقایسه یا آزمایش معتبر انجام شود.']
    if module=='Decision': return [f'اولویت تصمیم: {titles[0]}'] if titles else ['با شواهد فعلی تصمیم قطعی پیشنهاد نمی‌شود.']
    if module=='Scenarios': return ['محافظه‌کارانه: پایش','پایه: تغییر محدود','مداخله: اقدام همراه با کنترل']
    if module=='Experiment': return ['آزمایش محدود با معیار موفقیت و بازه زمانی مشخص.']
    if module=='Action': return ['مالک، deadline و outcome مورد انتظار ثبت شود.']
    if module=='Feedback': return ['Outcome واقعی با Outcome مورد انتظار مقایسه شود.']
    return ['یادگیری به چرخه تصمیم بعدی برگردد.']
