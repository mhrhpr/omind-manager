'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { profileRows, type Analysis, type Row } from '../../lib/omind-engine';
import { runDataPipeline, type PipelineResult } from '../../lib/data-pipeline';

type Chart = { id:string; type:'bar'|'line'|'scatter'; title:string; description:string; data:any[] };

type IconName = 'home'|'chart'|'signal'|'model'|'check';
function Icon({name}:{name:IconName}){
  const paths:Record<IconName,string>={
    home:'M3 10.5 12 3l9 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-5v-6h-5v6h-5A1.5 1.5 0 0 1 3 19.5v-9Z',
    chart:'M4 19V10m6 9V5m6 14v-7m4 7V8',
    signal:'M4 12h4l2-5 4 10 2-5h4',
    model:'M7 7h10v10H7z M10 4v3m4-3v3m-7 7H4m17 0h-3m-8 3v3m4-3v3',
    check:'m5 12 4 4L19 6'
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]}/></svg>;
}

function BrandMark({className=''}:{className?:string}){
  return <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
    <defs><linearGradient id="omind-brand-gradient" x1="6" y1="42" x2="43" y2="7" gradientUnits="userSpaceOnUse"><stop stopColor="#4f94eb"/><stop offset="1" stopColor="#69e8cf"/></linearGradient></defs>
    <rect x="2" y="2" width="44" height="44" rx="13" fill="#0f1a26" stroke="#294158"/>
    <circle cx="24" cy="24" r="12.5" fill="none" stroke="url(#omind-brand-gradient)" strokeWidth="4.5"/>
    <circle cx="35.3" cy="12.7" r="3.2" fill="#69e8cf"/>
    <path d="M10.5 31.5c3.1 5.3 8 8.5 13.5 8.5" fill="none" stroke="#62a7ff" strokeWidth="2.2" strokeLinecap="round" opacity=".65"/>
  </svg>;
}

function kind(name:string){const s=name.toLowerCase();return s.endsWith('.xlsx')||s.endsWith('.xls')?'excel':s.endsWith('.json')?'json':'csv'}
async function parseFile(file:File):Promise<Row[]>{
  const b=await file.arrayBuffer(),n=file.name.toLowerCase();
  if(n.endsWith('.json')){const p=JSON.parse(new TextDecoder().decode(b));const rows=Array.isArray(p)?p:p?.data;if(!Array.isArray(rows))throw new Error('JSON نامعتبر است.');return rows as Row[]}
  const wb=XLSX.read(b,{type:'array',cellDates:true,raw:true});
  if(!wb.SheetNames.length)throw new Error('Sheet قابل تحلیل پیدا نشد.');
  return XLSX.utils.sheet_to_json<Row>(wb.Sheets[wb.SheetNames[0]],{defval:null,raw:true});
}
function makeCharts(rows:Row[],a:Analysis|null):Chart[]{
  if(!rows.length)return[];
  const cols=a?.columns||[],measures=cols.filter(c=>c.role==='measure').map(c=>c.name),dates=cols.filter(c=>c.role==='date').map(c=>c.name),dims=cols.filter(c=>c.role==='dimension'||c.role==='category').map(c=>c.name);
  const out:Chart[]=[],m=measures[0];
  if(dates[0]&&m){const g:Record<string,number[]>={};rows.forEach(r=>{const d=String(r[dates[0]]||'').slice(0,10),v=Number(r[m]);if(d&&Number.isFinite(v))(g[d]??=[]).push(v)});const p=Object.entries(g).sort((x,y)=>x[0].localeCompare(y[0]));if(p.length>2)out.push({id:'trend',type:'line',title:`روند ${m}`,description:'روند شاخص در طول زمان',data:p.slice(-30).map(([label,v])=>({label,value:Number((v.reduce((x,y)=>x+y,0)/v.length).toFixed(2))}))})}
  if(dims[0]&&m){const g:Record<string,number[]>={};rows.forEach(r=>{const k=String(r[dims[0]]??'').trim(),v=Number(r[m]);if(k&&Number.isFinite(v))(g[k]??=[]).push(v)});const p=Object.entries(g).map(([label,v])=>({label,value:Number((v.reduce((x,y)=>x+y,0)/v.length).toFixed(2))})).sort((a,b)=>b.value-a.value).slice(0,8);if(p.length>1)out.push({id:'comparison',type:'bar',title:`${m} بر اساس ${dims[0]}`,description:'مقایسه عملکرد گروه‌ها',data:p})}
  if(measures.length>1){const a1=measures[0],a2=measures[1],p=rows.map(r=>({x:Number(r[a1]),y:Number(r[a2])})).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)).slice(0,180);if(p.length>7)out.push({id:'relationship',type:'scatter',title:`${a1} × ${a2}`,description:'رابطه مشاهده‌شده بین دو شاخص',data:p})}
  return out;
}
function ChartView({chart}:{chart:Chart}){
  const w=620,h=250,p=34;
  const max=Math.max(...chart.data.map(d=>chart.type==='scatter'?d.y:d.value),1),min=chart.type==='scatter'?Math.min(...chart.data.map(d=>d.y)):0;
  if(chart.type==='bar')return <svg viewBox={`0 0 ${w} ${h}`} className="bi-chart"><line x1={p} y1={h-p} x2={w-p} y2={h-p} className="axis"/>{chart.data.map((d,i)=><g key={i}><rect x={p+i*((w-2*p)/chart.data.length)+8} y={h-p-(d.value/max)*(h-2*p)} width={Math.max(9,(w-2*p)/chart.data.length-16)} height={(d.value/max)*(h-2*p)} rx="7" className="bar"/><text x={p+i*((w-2*p)/chart.data.length)+((w-2*p)/chart.data.length)/2} y={h-12} textAnchor="middle">{String(d.label).slice(0,8)}</text></g>)}</svg>;
  if(chart.type==='line'){const maxV=Math.max(...chart.data.map(d=>d.value),1),pts=chart.data.map((d,i)=>{const x=p+i*((w-2*p)/Math.max(1,chart.data.length-1)),y=h-p-(d.value/maxV)*(h-2*p);return[x,y] as[number,number]});return <svg viewBox={`0 0 ${w} ${h}`} className="bi-chart"><polyline points={pts.map(x=>x.join(',')).join(' ')} fill="none" className="line"/>{pts.map((q,i)=><circle key={i} cx={q[0]} cy={q[1]} r="4" className="dot"/>)}</svg>}
  const sx=(x:number)=>p+((x-Math.min(...chart.data.map(d=>d.x),0))/(Math.max(...chart.data.map(d=>d.x))-Math.min(...chart.data.map(d=>d.x))||1))*(w-2*p),sy=(y:number)=>h-p-((y-min)/(max-min||1))*(h-2*p);
  return <svg viewBox={`0 0 ${w} ${h}`} className="bi-chart">{chart.data.map((d,i)=><circle key={i} cx={sx(d.x)} cy={sy(d.y)} r="4" className="dot"/>)}</svg>;
}
function scrollToSection(id:string){document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'})}
function modelText(p:PipelineResult){return p.model.grain==='each record is one row'?'1 row':'derived'}

export default function BIWorkspace(){
  const[file,setFile]=useState<File|null>(null),[q,setQ]=useState(''),[role,setRole]=useState('manager'),[pipeline,setPipeline]=useState<PipelineResult|null>(null),[analysis,setAnalysis]=useState<Analysis|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[tab,setTab]=useState('overview');
  const theme=file?kind(file.name):'default';
  const charts=useMemo(()=>makeCharts(pipeline?.cleanedRows||[],analysis),[pipeline,analysis]);
  async function run(){
    if(!file){setError('فایل داده را انتخاب کن.');return}
    setBusy(true);setError('');
    try{const raw=await parseFile(file),p=runDataPipeline(raw);if(!p.cleanedRows.length)throw new Error('داده قابل تحلیل نیست.');const a=profileRows(p.cleanedRows,q,role);setPipeline(p);setAnalysis(a);setTab('overview');setTimeout(()=>scrollToSection('bi-result'),80)}
    catch(e){setError(e instanceof Error?e.message:'خطای تحلیل')}finally{setBusy(false)}
  }
  const tabs:[string,IconName,string,string][]=[['overview','home','نمای کلی','bi-result'],['analysis','chart','تحلیل داده','bi-analytics'],['signals','signal','سیگنال‌ها','bi-signals'],['model','model','مدل داده','bi-model'],['decisions','check','تصمیم بعدی','bi-decisions']];
  return <main className={`bi-app bi-${theme}`}>
    <aside className="bi-sidebar">
      <Link href="/" className="bi-logo" aria-label="OMIND Decision Intelligence"><span><BrandMark className="bi-logo-mark"/></span><strong>OMIND</strong><small>Decision Intelligence</small></Link>
      <div className="bi-workspace"><small>WORKSPACE</small><b>Data Intelligence</b><span>LIVE WORKSPACE</span></div>
      <nav aria-label="بخش‌های داشبورد">{tabs.map(([id,icon,label,target])=><button key={id} onClick={()=>{setTab(id);scrollToSection(target)}} className={tab===id?'active':''} aria-current={tab===id?'page':undefined}><i><Icon name={icon}/></i>{label}</button>)}</nav>
      <div className="bi-side-foot"><span>OMIND ENGINE</span><b>DATA → SIGNAL → DECISION</b></div>
    </aside>
    <section className="bi-content">
      <header className="bi-topbar">
        <div><span>DATASET</span><b>{file?.name||'هنوز دیتایی وارد نشده'}</b></div>
        <div className="bi-top-actions"><span className="bi-top-brand"><BrandMark className="bi-top-mark"/><span>OMIND <b>Decision Workspace</b></span></span><span className="bi-status"><i/> READY</span><span className="bi-theme-chip">DATA · {theme.toUpperCase()}</span><Link href="/" className="bi-home">خانه ↗</Link></div>
      </header>
      <div className="bi-header">
        <div><span className="bi-kicker">DECISION INTELLIGENCE · OMIND</span><h1>{analysis?.priorities?.[0]||'از فایل داده تا تصمیم'}</h1><p>{analysis?'داده پاک‌سازی و اعتبارسنجی شده؛ حالا مهم‌ترین signalها و قدم بعدی را ببین.':'فایل کاری را وارد کن؛ OMIND داده را تمیز می‌کند، اعتبارسنجی می‌کند و یک فضای تصمیم‌محور می‌سازد.'}</p></div>
        <div className="bi-health"><small>DATA HEALTH</small><b>{analysis?.health??'—'}</b><span>CONFIDENCE {analysis?.confidence??'—'}%</span></div>
      </div>
      <section className="bi-import" id="bi-analysis">
        <label><input type="file" accept=".csv,.xlsx,.xls,.json" onChange={e=>{setFile(e.target.files?.[0]||null);setPipeline(null);setAnalysis(null);setError('')}}/><span>↑</span><b>{file?'فایل انتخاب شد: '+file.name:'Excel / CSV / JSON'}</b><small>فایل اصلی حفظ می‌شود · نسخه پاک‌سازی‌شده برای تحلیل ساخته می‌شود</small></label>
        <div><select value={role} onChange={e=>setRole(e.target.value)}><option value="manager">مدیریت</option><option value="sales">فروش</option><option value="finance">مالی</option><option value="hr">منابع انسانی</option><option value="ops">عملیات</option></select><textarea value={q} onChange={e=>setQ(e.target.value)} placeholder="سؤال تصمیم: چرا فروش افت کرده؟"/><button onClick={run} disabled={!file||busy}>{busy?'در حال تحلیل…':'ساخت فضای تصمیم →'}</button></div>
      </section>
      {error&&<div className="bi-error">{error}</div>}
      {analysis&&pipeline&&<>
        <div className="bi-kpis" id="bi-result"><div><small>RECORDS</small><b>{pipeline.cleaning.outputRows}</b><span>clean rows</span></div><div><small>SIGNALS</small><b>{analysis.signals.length}</b><span>detected</span></div><div><small>VALIDATION</small><b>{pipeline.validation.score}</b><span>data quality</span></div><div><small>DECISION READY</small><b>{analysis.priorities.length?'YES':'CHECK'}</b><span>next move</span></div></div>
        <section className="bi-dashboard-grid">
          <div className="bi-card bi-wide" id="bi-analytics"><div className="bi-card-head"><div><span>ANALYTICS</span><h2>داشبورد تحلیلی</h2></div><small>{charts.length} visual generated</small></div>{charts.length?<div className="bi-chart-grid">{charts.map(c=><article key={c.id}><h3>{c.title}</h3><p>{c.description}</p><ChartView chart={c}/></article>)}</div>:<div className="bi-empty">با این ساختار داده، نمودار کافی برای تولید خودکار وجود ندارد.</div>}</div>
          <div className="bi-card" id="bi-signals"><span>SIGNALS</span><h2>چه چیزی مهم است؟</h2>{analysis.signals.slice(0,5).map(s=><div className="bi-signal" key={s.title}><i className={s.priority}/><div><b>{s.title}</b><small>{s.detail}</small></div><strong>{s.score}</strong></div>)}</div>
          <div className="bi-card bi-dark" id="bi-decisions"><span>NEXT MOVE</span><h2>{analysis.actions[0]}</h2><p>{analysis.hypotheses[0]||'قبل از مداخله گسترده، evidence را روی segment مشخص بررسی کن.'}</p><button type="button" onClick={()=>scrollToSection('bi-signals')}>بررسی evidence ↗</button></div>
        </section>
        <details className="bi-tech" id="bi-model"><summary>Technical layer · cleaning · validation · semantic model</summary><div className="bi-tech-grid"><div><b>{pipeline.cleaning.removedDuplicateRows}</b><span>duplicates removed</span></div><div><b>{pipeline.cleaning.normalizedCells}</b><span>cells normalized</span></div><div><b>{modelText(pipeline)}</b><span>grain</span></div><div><b>{pipeline.model.measures.length}</b><span>measures</span></div></div></details>
      </>}
    </section>
  </main>
}
