'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { profileRows, type Analysis, type Row } from '../../lib/omind-engine';
import { runDataPipeline, type PipelineResult } from '../../lib/data-pipeline';

function fileKind(name:string){const s=name.toLowerCase();return s.endsWith('.xlsx')||s.endsWith('.xls')?'excel':s.endsWith('.json')?'json':'csv'}
async function parseFile(file:File):Promise<Row[]>{
  const buffer=await file.arrayBuffer();
  const name=file.name.toLowerCase();
  if(name.endsWith('.json')){const parsed=JSON.parse(new TextDecoder().decode(buffer));const rows=Array.isArray(parsed)?parsed:parsed?.data;if(!Array.isArray(rows))throw new Error('JSON باید آرایه‌ای از objectها یا دارای data باشد.');return rows as Row[]}
  const wb=XLSX.read(buffer,{type:'array',cellDates:true,raw:true});
  if(!wb.SheetNames.length)throw new Error('هیچ Sheet قابل تحلیلی پیدا نشد.');
  return XLSX.utils.sheet_to_json<Row>(wb.Sheets[wb.SheetNames[0]],{defval:null,raw:true});
}
const steps=[['01','INGEST','دریافت'],['02','CLEAN','پاک‌سازی'],['03','VALIDATE','اعتبارسنجی'],['04','MODEL','مدل‌سازی'],['05','ANALYZE','تحلیل']];
const questOptions=['یک segment مشخص را جدا کن و آزمایش محدود اجرا کن','همه چیز را یک‌جا تغییر بده','بدون شواهد بیشتر تصمیم سراسری بگیر'];
export default function Playground(){
  const[file,setFile]=useState<File|null>(null);const[question,setQuestion]=useState('');const[role,setRole]=useState('manager');const[pipeline,setPipeline]=useState<PipelineResult|null>(null);const[analysis,setAnalysis]=useState<Analysis|null>(null);const[stage,setStage]=useState(0);const[busy,setBusy]=useState(false);const[error,setError]=useState('');const[score,setScore]=useState(720);const[picked,setPicked]=useState<number|null>(null);const[showTechnical,setShowTechnical]=useState(false);
  const theme=file?fileKind(file.name):'default';const signals=useMemo(()=>analysis?.signals?.slice(0,5)||[],[analysis]);const model=pipeline?.model;
  async function run(){
    if(!file){setError('ابتدا یک فایل CSV، Excel یا JSON انتخاب کن.');return}
    setBusy(true);setError('');setAnalysis(null);setPipeline(null);setPicked(null);setStage(0);
    try{const raw=await parseFile(file);setStage(1);await new Promise(r=>setTimeout(r,120));const result=runDataPipeline(raw);setPipeline(result);setStage(4);await new Promise(r=>setTimeout(r,120));if(!result.cleanedRows.length)throw new Error('داده پس از پاک‌سازی رکورد قابل استفاده‌ای ندارد.');const a=profileRows(result.cleanedRows,question,role);setAnalysis(a);setStage(5);setScore(Math.min(990,700+result.validation.score*2+Math.max(0,100-a.health)));}
    catch(cause){setError(cause instanceof Error?cause.message:'خطا در pipeline');setStage(0)}finally{setBusy(false)}}
  function choose(index:number){if(picked!==null)return;setPicked(index);setScore(v=>Math.min(990,Math.max(100,v+(index===0?90:-40))))}
  return <main className={`omind-playground theme-${theme}`}>
    <header className="pg-top"><Link href="/" className="pg-brand"><b>O</b><span>OMIND <small>Decision Intelligence</small></span></Link><nav className="pg-nav"><span>WORKSPACE</span><span>تحلیل داده</span><span>تصمیم‌ها</span><span>حافظه</span><span className="pg-mode">LIVE ENGINE</span></nav><Link href="/" className="pg-exit">خانه ↗</Link></header>
    <section className="pg-main">
      <section className="pg-hero"><div><span className="pg-kicker">DECISION WORKSPACE · REAL DATA</span><h1>فایل را وارد کن.<br/><em>آنچه مهم است</em> را پیدا کن.</h1><p>OMIND پشت صحنه داده را تمیز، اعتبارسنجی و مدل‌سازی می‌کند؛ روی صفحه فقط چیزی را می‌بینی که برای <b>تصمیم بعدی</b> لازم است.</p></div><div className="pg-score"><span>DECISION READINESS</span><b>{score}</b><i style={{width:`${Math.min(100,score/10)}%`}}/><small>سیگنال + شواهد + اقدام</small></div></section>

      <section className="pg-upload-card"><label className="pg-drop"><input type="file" accept=".csv,.xlsx,.xls,.json" onChange={e=>{setFile(e.target.files?.[0]||null);setPipeline(null);setAnalysis(null);setStage(0);setError('')}}/><div className="pg-upload-glyph">↑</div><strong>{file?'✓ '+file.name:'فایل داده را اینجا وارد کن'}</strong><small>CSV · XLSX · XLS · JSON</small><span>{file?`${theme.toUpperCase()} · READY TO ANALYZE`:'ورودی خام؛ نسخه‌ی اصلی حفظ می‌شود'}</span></label><div className="pg-controls"><label>برای چه کسی تصمیم می‌سازی؟<select value={role} onChange={e=>setRole(e.target.value)}><option value="manager">مدیریت</option><option value="sales">فروش</option><option value="finance">مالی</option><option value="hr">منابع انسانی</option><option value="ops">عملیات</option></select></label><label>سؤال یا مسئله‌ی اصلی<textarea value={question} onChange={e=>setQuestion(e.target.value)} placeholder="مثلاً چرا فروش منطقه شرق افت کرده؟"/></label><button className="pg-run" disabled={!file||busy} onClick={run}>{busy?'در حال فهمیدن داده…':'تحلیل را شروع کن →'}</button><small className="pg-helper">۵ مرحله خودکار: دریافت → پاک‌سازی → اعتبارسنجی → مدل‌سازی → تحلیل</small></div></section>
      {error&&<div className="pg-error">{error}</div>}

      {analysis&&pipeline&&<>
        <section className="pg-result pg-decision-hero"><div className="pg-result-head"><div><span>01 · WHAT MATTERS NOW</span><h2>{analysis.priorities?.[0]||signals[0]?.title||'یک موضوع مهم پیدا شد.'}</h2><p>{(analysis as any)?.summary||analysis.hypotheses?.[0]||'داده پس از پاک‌سازی و اعتبارسنجی آماده شده و اکنون می‌توان روی مهم‌ترین سیگنال تمرکز کرد.'}</p></div><div className="pg-health"><small>DATA HEALTH</small><b>{analysis.health}</b><em>VALIDATION {pipeline.validation.score} · CONFIDENCE {analysis.confidence}%</em></div></div><div className="pg-metrics"><div><span>رکورد ورودی</span><b>{pipeline.cleaning.inputRows.toLocaleString('fa-IR')}</b></div><div><span>رکورد قابل تحلیل</span><b>{pipeline.cleaning.outputRows.toLocaleString('fa-IR')}</b></div><div><span>سیگنال‌ها</span><b>{analysis.signals?.length??0}</b></div><div><span>اقدام پیشنهادی</span><b>{analysis.actions?.length??0}</b></div></div></section>

        <div className="pg-grid"><section className="pg-panel pg-focus-panel"><span>02 · SIGNALS</span><h3>چه چیزی ارزش توجه دارد؟</h3>{signals.length?signals.map((s,i)=><article key={`${s.title}-${i}`}><i className={String(s.priority).toLowerCase()}/><div><b>{s.title}</b><p>{s.detail}</p></div><strong>{s.score}</strong></article>):<div className="pg-valid-ok">در این فایل سیگنال معنادار کافی پیدا نشد.</div>}</section><section className="pg-panel pg-action-panel"><span>03 · NEXT MOVE</span><h3>{analysis.actions?.[0]||'یک اقدام محدود و قابل اندازه‌گیری تعریف کن.'}</h3><p>{analysis.hypotheses?.[0]||'قبل از intervention بزرگ، evidence را روی segment مشخص آزمایش کن.'}</p><div className="pg-action-meta"><span>OWNER · {role.toUpperCase()}</span><span>PRIORITY · {analysis.priorities?.[0]?'HIGH':'MEDIUM'}</span><span>OUTCOME · REQUIRED</span></div><button onClick={()=>setShowTechnical(v=>!v)} className="pg-secondary-btn">{showTechnical?'جزئیات فنی را ببند':'جزئیات داده و pipeline را ببین'} ↗</button></section></div>

        <section className="pg-model"><div className="pg-model-head"><div><span>04 · UNDER THE SURFACE</span><h2>سیستم قبل از تصمیم چه چیزی را انجام داد؟</h2></div><span>{model?.grain}</span></div><div className="pg-model-grid"><div><small>KEY</small><b>{model?.key||'—'}</b></div><div><small>DATE</small><b>{model?.dateColumn||'—'}</b></div><div><small>MEASURES</small><b>{model?.measures.length||0}</b><p>{model?.measures.slice(0,4).join(' · ')||'—'}</p></div><div><small>DIMENSIONS</small><b>{model?.dimensions.length||0}</b><p>{model?.dimensions.slice(0,4).join(' · ')||'—'}</p></div><div><small>TEXT</small><b>{model?.textColumns.length||0}</b><p>{model?.textColumns.slice(0,4).join(' · ')||'—'}</p></div></div></section>

        <section className="pg-panel quest-panel"><span>05 · DECISION QUEST</span><h3>با این evidence چه می‌کنی؟</h3><p>کیفیت تصمیم باید با کیفیت شواهد متناسب باشد.</p>{questOptions.map((x,i)=><button key={x} className={picked!==null?(i===0?'best':i===picked?'risky':'muted'):''} onClick={()=>choose(i)}><small>0{i+1}</small><b>{x}</b><em>{i===0?'EVIDENCE-ALIGNED':'RISK'}</em></button>)}{picked!==null&&<div className="pg-quest-result">{picked===0?'تصمیم هم‌راستا با evidence بود.':'این انتخاب پیش از شواهد کافی، ریسک مداخله‌ی بیش‌ازحد دارد.'}</div>}</section>

        {showTechnical&&<section className="pg-pipeline"><div className="pg-pipeline-head"><div><span>TECHNICAL TRACE</span><h2>شفافیت کامل pipeline</h2></div><b>{stage}/5</b></div><div className="pg-steps">{steps.map(([n,t],i)=><div key={n} className={stage>i?'done':stage===i?'current':''}><span>{n}</span><b>{t}</b><i>{stage>i?'✓':'·'}</i></div>)}</div><div className="pg-grid"><section className="pg-panel"><span>CLEANING</span><h3>پاک‌سازی</h3><div className="pg-report-grid"><div><b>{pipeline.cleaning.removedDuplicateRows}</b><small>duplicate removed</small></div><div><b>{pipeline.cleaning.normalizedCells}</b><small>cells normalized</small></div><div><b>{pipeline.cleaning.emptyCells}</b><small>empty detected</small></div><div><b>{pipeline.cleaning.changedHeaders}</b><small>headers normalized</small></div></div><div className="pg-check">✓ Original rows preserved · cleaned copy analyzed</div></section><section className="pg-panel"><span>VALIDATION</span><h3>اعتبارسنجی</h3>{pipeline.validation.warnings.length?pipeline.validation.warnings.slice(0,6).map(w=><p className="pg-warning-line" key={w}>! {w}</p>):<div className="pg-valid-ok">✓ Schema looks consistent for analysis.</div>}<div className="pg-validation-bar"><i style={{width:`${pipeline.validation.score}%`}}/></div></section></div></section>}

        <section className="pg-trace"><span>DECISION LOOP</span>{['RAW','CLEAN','VALIDATE','MODEL','SIGNAL','DECIDE','MEMORY'].map((x,i)=><div key={x} className={stage>i?'live':''}><b>0{i+1}</b><span>{x}</span></div>)}</section>
      </>}
    </section>
  </main>
}
