import { runReasoning, type ReasoningResult } from './reasoning';
export type Cell = string | number | boolean | null;
export type Row = Record<string, Cell>;
export type ColumnProfile = { name:string; role:'key'|'date'|'measure'|'dimension'|'text'|'category'; type:'number'|'date'|'boolean'|'text'; missing:number; unique:number };
export type Signal = { type:'missingness'|'outlier'|'concentration'|'trend'|'duplicate'; title:string; detail:string; priority:'high'|'medium'|'low'; score:number };
export type Analysis = { rows:number; columns:ColumnProfile[]; health:number; signals:Signal[]; questions:string[]; priorities:string[]; hypotheses:string[]; actions:string[]; confidence:number; trace:string[]; reasoning:ReasoningResult };
const numeric=(v:Cell)=>typeof v==='number'&&Number.isFinite(v);
const asNumber=(v:Cell)=>numeric(v)?v as number:Number(String(v??'').replace(/[,،\s]/g,''));
const asDate=(v:Cell)=>{const s=String(v??'').trim();return /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(s)||/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(s)};
export function normalizeRows(rows:Row[]):Row[]{
  return rows.map(row=>Object.fromEntries(Object.entries(row).map(([k,v])=>{
    if(typeof v!=='string')return[k,v];
    const s=v.replace(/[\u200c\u200f]/g,'').trim();
    const w=s.replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
    if(w!==''&&/^-?\d+(\.\d+)?$/.test(w))return[k,Number(w)];
    return[k,s===''?null:s];
  })));
}
export function profileRows(input:Row[],question='',userRole='manager'):Analysis{
 const rows=normalizeRows(input);const names=[...new Set(rows.flatMap(r=>Object.keys(r)))];const columns:ColumnProfile[]=names.map(name=>{const values=rows.map(r=>r[name]).filter(v=>v!==null&&v!=='');const missing=rows.length-values.length;const unique=new Set(values.map(String)).size;const numericRatio=values.length?values.filter(numeric).length/values.length:0;const dateRatio=values.length?values.filter(asDate).length/values.length:0;const lower=name.toLowerCase();let role:ColumnProfile['role']='text';let type:ColumnProfile['type']='text';if(dateRatio>=.7||/date|time|تاریخ|روز|ماه|سال/.test(lower)){role='date';type='date'}else if(numericRatio>=.8){role='measure';type='number'}else if(unique<=Math.max(20,rows.length*.1))role='category';if(/^id$|_id$|code|شناسه|کد/.test(lower)||unique===rows.length)role='key';return{name,role,type,missing,unique}});
 const duplicateCount=rows.length-new Set(rows.map(r=>JSON.stringify(r))).size;const missingCells=columns.reduce((s,c)=>s+c.missing,0);const totalCells=Math.max(1,rows.length*Math.max(1,columns.length));const missingRate=missingCells/totalCells;const duplicateRate=duplicateCount/Math.max(1,rows.length);const health=Math.max(0,Math.round(100-missingRate*45-duplicateRate*30));const signals:Signal[]=[];
 if(missingRate>.05)signals.push({type:'missingness',title:'مقادیر خالی قابل توجه',detail:`${Math.round(missingRate*100)}٪ از سلول‌ها خالی یا null هستند.`,priority:missingRate>.2?'high':'medium',score:Math.round(missingRate*100)});
 if(duplicateCount)signals.push({type:'duplicate',title:'ردیف تکراری',detail:`${duplicateCount} ردیف تکراری شناسایی شد.`,priority:duplicateRate>.05?'high':'medium',score:Math.round(duplicateRate*100)});
 for(const c of columns.filter(c=>c.type==='number').slice(0,6)){const vals=rows.map(r=>asNumber(r[c.name])).filter(Number.isFinite) as number[];if(vals.length<5)continue;const mean=vals.reduce((a,b)=>a+b,0)/vals.length;const sd=Math.sqrt(vals.reduce((a,b)=>a+(b-mean)**2,0)/vals.length);const outliers=sd?vals.filter(v=>Math.abs(v-mean)>3*sd).length:0;if(outliers){const rate=outliers/vals.length;signals.push({type:'outlier',title:`ناهنجاری در ${c.name}`,detail:`${outliers} مقدار بیش از ۳ انحراف معیار از میانگین فاصله دارد.`,priority:rate>.05?'high':'medium',score:Math.min(100,Math.round(rate*1000))})}}
 const measures=columns.filter(c=>c.role==='measure').map(c=>c.name);const categories=columns.filter(c=>c.role==='category').map(c=>c.name);if(measures.length&&categories.length)signals.push({type:'concentration',title:`مقایسه ${measures[0]} بر اساس ${categories[0]}`,detail:`عملکرد ${measures[0]} را بین دسته‌های ${categories[0]} مقایسه کن.`,priority:userRole==='hr'?'low':'medium',score:21});signals.sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title));
 const roleQuestion=({manager:'مهم‌ترین مسئله مدیریتی این داده چیست؟',sales:'کدام بخش فروش بیشترین افت یا فرصت رشد را دارد؟',finance:'کدام شاخص مالی بیشترین ریسک را نشان می‌دهد؟',hr:'کدام بخش نیروی انسانی بیشترین ریسک یا افت را دارد؟',ops:'کدام بخش عملیات بیشترین گلوگاه را دارد؟'} as Record<string,string>)[userRole]??'مهم‌ترین مسئله این داده چیست؟';
 const questions=[roleQuestion,...categories.slice(0,2).map(c=>`کدام ${c} عملکرد ضعیف‌تری دارد؟`),...measures.slice(0,2).map(m=>`روند ${m} در طول زمان چگونه تغییر کرده است؟`),'مهم‌ترین ناهنجاری یا تغییر غیرعادی این داده چیست؟','کدام مسئله بیشترین اثر احتمالی را روی نتیجه دارد؟'].slice(0,6);const resolvedQuestion=question.trim()||questions[0];const reasoning=runReasoning(signals.map(s=>({title:s.title,score:s.score,priority:s.priority,evidence:s.detail})),resolvedQuestion);return{rows:rows.length,columns,health,signals,questions,priorities:reasoning.priorities,hypotheses:reasoning.hypotheses,actions:reasoning.actions,confidence:reasoning.confidence,trace:reasoning.steps.map(s=>s.trace),reasoning};
}
