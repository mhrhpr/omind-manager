'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { profileRows, type Analysis, type Row } from '../../lib/omind-engine';
import { runDataPipeline, type PipelineResult } from '../../lib/data-pipeline';

type Chart = { id: string; type: 'bar' | 'line' | 'scatter'; title: string; description: string; data: any[] };
type IconName = 'home' | 'chart' | 'signal' | 'model' | 'check';

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, string> = { home: 'M3 10.5 12 3l9 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-5v-6h-5v6h-5A1.5 1.5 0 0 1 3 19.5v-9Z', chart: 'M4 19V10m6 9V5m6 14v-7m4 7V8', signal: 'M4 12h4l2-5 4 10 2-5h4', model: 'M7 7h10v10H7z M10 4v3m4-3v3m-7 7H4m17 0h-3m-8 3v3m4-3v3', check: 'm5 12 4 4L19 6' };
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]} /></svg>;
}

function BrandMark({ className = '' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="omind-brand-gradient" x1="6" y1="42" x2="43" y2="7" gradientUnits="userSpaceOnUse"><stop stopColor="#4f94eb" /><stop offset="1" stopColor="#69e8cf" /></linearGradient></defs><rect x="2" y="2" width="44" height="44" rx="13" fill="#0f1a26" stroke="#294158" /><circle cx="24" cy="24" r="12.5" fill="none" stroke="url(#omind-brand-gradient)" strokeWidth="4.5" /><circle cx="35.3" cy="12.7" r="3.2" fill="#69e8cf" /><path d="M10.5 31.5c3.1 5.3 8 8.5 13.5 8.5" fill="none" stroke="#62a7ff" strokeWidth="2.2" strokeLinecap="round" opacity=".65" /></svg>;
}

function kind(name: string) { const value = name.toLowerCase(); return value.endsWith('.xlsx') || value.endsWith('.xls') ? 'excel' : value.endsWith('.json') ? 'json' : 'csv'; }

async function parseFile(file: File): Promise<Row[]> {
  const bytes = await file.arrayBuffer(), name = file.name.toLowerCase();
  if (name.endsWith('.json')) { const parsed = JSON.parse(new TextDecoder().decode(bytes)); const rows = Array.isArray(parsed) ? parsed : parsed?.data; if (!Array.isArray(rows)) throw new Error('JSON نامعتبر است. فایل باید آرایه‌ای از رکوردها داشته باشد.'); return rows as Row[]; }
  const workbook = XLSX.read(bytes, { type: 'array', cellDates: true, raw: true });
  if (!workbook.SheetNames.length) throw new Error('Sheet قابل تحلیل پیدا نشد.');
  return XLSX.utils.sheet_to_json<Row>(workbook.Sheets[workbook.SheetNames[0]], { defval: null, raw: true });
}

function makeCharts(rows: Row[], analysis: Analysis | null): Chart[] {
  if (!rows.length) return [];
  const columns = analysis?.columns || [], measures = columns.filter(c => c.role === 'measure').map(c => c.name), dates = columns.filter(c => c.role === 'date').map(c => c.name), dimensions = columns.filter(c => c.role === 'dimension' || c.role === 'category').map(c => c.name), out: Chart[] = [], metric = measures[0];
  if (dates[0] && metric) { const groups: Record<string, number[]> = {}; rows.forEach(row => { const label = String(row[dates[0]] ?? '').slice(0, 10), value = Number(row[metric]); if (label && Number.isFinite(value)) (groups[label] ??= []).push(value); }); const points = Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0])); if (points.length > 2) out.push({ id: 'trend', type: 'line', title: `روند ${metric}`, description: 'میانگین شاخص در طول زمان', data: points.slice(-30).map(([label, values]) => ({ label, value: Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)) })) }); }
  if (dimensions[0] && metric) { const groups: Record<string, number[]> = {}; rows.forEach(row => { const label = String(row[dimensions[0]] ?? '').trim(), value = Number(row[metric]); if (label && Number.isFinite(value)) (groups[label] ??= []).push(value); }); const points = Object.entries(groups).map(([label, values]) => ({ label, value: Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)) })).sort((a, b) => b.value - a.value).slice(0, 8); if (points.length > 1) out.push({ id: 'comparison', type: 'bar', title: `${metric} بر اساس ${dimensions[0]}`, description: 'مقایسه میانگین گروه‌ها', data: points }); }
  if (measures.length > 1) { const [a, b] = measures, points = rows.map(row => ({ x: Number(row[a]), y: Number(row[b]) })).filter(point => Number.isFinite(point.x) && Number.isFinite(point.y)).slice(0, 180); if (points.length > 7) out.push({ id: 'relationship', type: 'scatter', title: `${a} × ${b}`, description: 'رابطه مشاهده‌شده بین دو شاخص', data: points }); }
  return out;
}

function ChartView({ chart }: { chart: Chart }) {
  const w = 760, h = 290, p = 44;
  if (!chart.data.length) return null;
  if (chart.type === 'bar') { const max = Math.max(...chart.data.map(item => item.value), 1), slot = (w - 2 * p) / chart.data.length; return <svg viewBox={`0 0 ${w} ${h}`} className="bi-chart" role="img" aria-label={chart.title}><line x1={p} y1={h - p} x2={w - p} y2={h - p} className="axis" />{chart.data.map((item, i) => <g key={i}><rect x={p + i * slot + 10} y={h - p - (item.value / max) * (h - 2 * p)} width={Math.max(16, slot - 20)} height={(item.value / max) * (h - 2 * p)} rx="7" className="bar" /><text x={p + i * slot + slot / 2} y={h - 16} textAnchor="middle">{String(item.label).slice(0, 12)}</text></g>)}</svg>; }
  if (chart.type === 'line') { const max = Math.max(...chart.data.map(item => item.value), 1), points = chart.data.map((item, i) => [p + i * ((w - 2 * p) / Math.max(1, chart.data.length - 1)), h - p - (item.value / max) * (h - 2 * p)] as [number, number]); return <svg viewBox={`0 0 ${w} ${h}`} className="bi-chart" role="img" aria-label={chart.title}><line x1={p} y1={h - p} x2={w - p} y2={h - p} className="axis" /><polyline points={points.map(point => point.join(',')).join(' ')} fill="none" className="line" />{points.map((point, i) => <circle key={i} cx={point[0]} cy={point[1]} r="4.5" className="dot" />)}</svg>; }
  const xs = chart.data.map(item => item.x), ys = chart.data.map(item => item.y), minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys), sx = (x: number) => p + ((x - minX) / (maxX - minX || 1)) * (w - 2 * p), sy = (y: number) => h - p - ((y - minY) / (maxY - minY || 1)) * (h - 2 * p);
  return <svg viewBox={`0 0 ${w} ${h}`} className="bi-chart" role="img" aria-label={chart.title}><line x1={p} y1={h - p} x2={w - p} y2={h - p} className="axis" />{chart.data.map((item, i) => <circle key={i} cx={sx(item.x)} cy={sy(item.y)} r="4" className="dot" />)}</svg>;
}

function scrollTo(id: string) { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
function num(value: number) { return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value); }

export default function BIWorkspace() {
  const [file, setFile] = useState<File | null>(null), [question, setQuestion] = useState(''), [role, setRole] = useState('manager'), [pipeline, setPipeline] = useState<PipelineResult | null>(null), [analysis, setAnalysis] = useState<Analysis | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [tab, setTab] = useState('overview');
  const theme = file ? kind(file.name) : 'default';
  const charts = useMemo(() => makeCharts(pipeline?.cleanedRows || [], analysis), [pipeline, analysis]);
  const tabs: [string, IconName, string, string][] = [['overview', 'home', 'نمای کلی', 'bi-result'], ['analysis', 'chart', 'تحلیل', 'bi-analytics'], ['signals', 'signal', 'سیگنال‌ها', 'bi-signals'], ['model', 'model', 'مدل داده', 'bi-model'], ['decisions', 'check', 'تصمیم', 'bi-decisions']];

  async function run() {
    if (!file) { setError('ابتدا فایل داده را انتخاب کن.'); return; }
    setBusy(true); setError('');
    try { const raw = await parseFile(file), nextPipeline = runDataPipeline(raw); if (!nextPipeline.cleanedRows.length) throw new Error('داده قابل تحلیل نیست.'); const nextAnalysis = profileRows(nextPipeline.cleanedRows, question, role); setPipeline(nextPipeline); setAnalysis(nextAnalysis); setTab('overview'); window.setTimeout(() => scrollTo('bi-result'), 70); }
    catch (err) { setError(err instanceof Error ? err.message : 'خطای تحلیل'); setPipeline(null); setAnalysis(null); }
    finally { setBusy(false); }
  }

  return <main className={`bi-app bi-${theme}`}>
    <aside className="bi-sidebar"><Link href="/" className="bi-logo" aria-label="OMIND Decision Intelligence"><span><BrandMark className="bi-logo-mark" /></span><strong>OMIND</strong><small>Decision Intelligence</small></Link><div className="bi-workspace"><small>WORKSPACE</small><b>Data Intelligence</b><span>DECISION ENGINE</span></div><nav aria-label="بخش‌های workspace">{tabs.map(([id, icon, label, target]) => <button key={id} onClick={() => { setTab(id); scrollTo(target); }} className={tab === id ? 'active' : ''} aria-current={tab === id ? 'page' : undefined}><i><Icon name={icon} /></i>{label}</button>)}</nav><div className="bi-side-foot"><span>OMIND LOOP</span><b>DATA → SIGNAL → DECISION → OUTCOME</b></div></aside>
    <section className="bi-content"><header className="bi-topbar"><div><span>ACTIVE DATASET</span><b>{file?.name || 'هیچ فایلی انتخاب نشده'}</b></div><div className="bi-top-actions"><span className="bi-top-brand"><BrandMark className="bi-top-mark" /><span>OMIND <b>Decision Workspace</b></span></span><span className="bi-status"><i /> READY</span><Link href="/" className="bi-home">خانه ↗</Link></div></header>
      <div className="bi-shell">
        <section className="bi-hero" id="bi-result"><div><span className="bi-kicker">DECISION INTELLIGENCE · 01</span><h1>{analysis?.priorities?.[0] || 'از داده به تصمیم قابل دفاع'}</h1><p>{analysis ? 'داده تمیز و اعتبارسنجی شده؛ حالا مهم‌ترین signalها و قدم بعدی را ببین.' : 'فایل کاری را وارد کن؛ OMIND آن را پاک‌سازی، اعتبارسنجی، مدل‌سازی و تحلیل می‌کند و خروجی را به اقدام بعدی وصل می‌کند.'}</p></div><div className="bi-health"><small>DATA HEALTH</small><b>{analysis?.health ?? '—'}</b><span>CONFIDENCE {analysis?.confidence ?? '—'}%</span></div></section>
        <section className="bi-command" id="bi-import"><div className="bi-command-intro"><span className="bi-section-no">01</span><div><strong>داده را وارد کن</strong><p>نسخه اصلی حفظ می‌شود؛ نسخه clean برای تحلیل ساخته می‌شود.</p></div></div><label className="bi-drop"><input type="file" accept=".csv,.xlsx,.xls,.json" onChange={event => { setFile(event.target.files?.[0] || null); setPipeline(null); setAnalysis(null); setError(''); }} /><span className="bi-drop-mark"><BrandMark /></span><div><b>{file ? file.name : 'Excel / CSV / JSON'}</b><small>{file ? 'آماده تحلیل' : 'Drag & drop یا انتخاب فایل'}</small></div><em>{file ? 'CHANGE FILE' : 'SELECT FILE'}</em></label><div className="bi-command-fields"><label><span>VIEW AS</span><select value={role} onChange={event => setRole(event.target.value)}><option value="manager">مدیریت</option><option value="sales">فروش</option><option value="finance">مالی</option><option value="hr">منابع انسانی</option><option value="ops">عملیات</option></select></label><label><span>DECISION QUESTION</span><textarea value={question} onChange={event => setQuestion(event.target.value)} placeholder="مثلاً: چرا فروش افت کرده و کجا باید مداخله کنم؟" /></label><button onClick={run} disabled={!file || busy}>{busy ? 'در حال ساخت workspace…' : 'ساخت فضای تصمیم →'}</button></div></section>
        {error && <div className="bi-error" role="alert">{error}</div>}
        {analysis && pipeline && <>
          <section className="bi-kpi-strip"><div><span>RECORDS</span><b>{num(pipeline.cleaning.outputRows)}</b><small>{pipeline.cleaning.removedDuplicateRows ? `${pipeline.cleaning.removedDuplicateRows} duplicate removed` : 'بعد از cleaning'}</small></div><div><span>QUALITY</span><b>{pipeline.validation.score}</b><small>{pipeline.validation.valid ? 'قابل تحلیل' : 'نیاز به اصلاح'}</small></div><div><span>SIGNALS</span><b>{analysis.signals.length}</b><small>patterns detected</small></div><div><span>MEASURES</span><b>{pipeline.model.measures.length}</b><small>metrics identified</small></div><div className="decision-status"><span>DECISION STATE</span><b>{analysis.priorities.length ? 'READY' : 'INVESTIGATE'}</b><small>evidence first</small></div></section>
          <section className="bi-decision-banner" id="bi-decisions"><div><span>NEXT DECISION</span><h2>{analysis.actions[0]}</h2><p>{analysis.hypotheses[0] || 'قبل از اقدام گسترده، evidence را روی segment مربوطه verify کن.'}</p></div><div className="bi-banner-meta"><b>{analysis.confidence}%</b><span>confidence</span><small>Correlation ≠ causation</small></div></section>
          <section className="bi-section" id="bi-analytics"><div className="bi-section-head"><div><span>02 · ANALYTICS</span><h2>چه چیزی در داده تغییر کرده؟</h2><p>visualها از همان داده clean شده ساخته شده‌اند.</p></div><b>{charts.length} views</b></div>{charts.length ? <div className="bi-chart-grid-pro">{charts.map(chart => <article key={chart.id}><header><div><h3>{chart.title}</h3><p>{chart.description}</p></div><span>{chart.type.toUpperCase()}</span></header><ChartView chart={chart} /></article>)}</div> : <div className="bi-empty">برای این ساختار داده visual کافی پیدا نشد؛ ستون‌های عددی/تاریخی مناسب لازم است.</div>}</section>
          <section className="bi-two-col"><article className="bi-panel" id="bi-signals"><header><div><span>03 · SIGNALS</span><h2>مسئله‌های اولویت‌دار</h2></div><small>score + evidence</small></header><div className="bi-signal-list">{analysis.signals.slice(0, 6).map(signal => <div className="bi-signal" key={`${signal.type}-${signal.title}`}><i className={signal.priority} /><div><b>{signal.title}</b><small>{signal.detail}</small></div><strong>{signal.score}</strong></div>)}</div></article><article className="bi-panel"><header><div><span>04 · DATA QUALITY</span><h2>داده چه وضعیتی دارد؟</h2></div><small>{pipeline.validation.score}/100</small></header><div className="bi-quality-meter"><i style={{ width: `${Math.max(0, Math.min(100, pipeline.validation.score))}%` }} /></div><div className="bi-quality-grid"><div><b>{pipeline.cleaning.normalizedCells}</b><span>سلول نرمال‌شده</span></div><div><b>{pipeline.cleaning.removedDuplicateRows}</b><span>تکراری حذف‌شده</span></div><div><b>{pipeline.cleaning.emptyCells}</b><span>خالی / null</span></div><div><b>{pipeline.cleaning.changedHeaders}</b><span>header اصلاح‌شده</span></div></div>{pipeline.validation.warnings.length ? <div className="bi-warnings">{pipeline.validation.warnings.slice(0, 3).map(item => <p key={item}>{item}</p>)}</div> : <div className="bi-valid">✓ ساختار داده برای تحلیل کمی مناسب است.</div>}</article></section>
          <section className="bi-section" id="bi-model"><div className="bi-section-head"><div><span>05 · SEMANTIC MODEL</span><h2>OMIND از فایل چه مدلی ساخته؟</h2><p>key، metric، dimension و محور زمان به‌صورت قابل مشاهده استخراج شده‌اند.</p></div></div><div className="bi-model-grid-pro"><div><span>KEY</span><b>{pipeline.model.key || '—'}</b><small>شناسه رکورد</small></div><div><span>TIME</span><b>{pipeline.model.dateColumn || '—'}</b><small>محور زمان</small></div><div><span>MEASURES</span><b>{pipeline.model.measures.length}</b><small>{pipeline.model.measures.slice(0, 3).join(' · ') || 'none'}</small></div><div><span>DIMENSIONS</span><b>{pipeline.model.dimensions.length}</b><small>{pipeline.model.dimensions.slice(0, 3).join(' · ') || 'none'}</small></div><div><span>GRAIN</span><b>{pipeline.model.grain === 'each record is one row' ? '1 row' : '1 observation'}</b><small>سطح تحلیل</small></div></div></section>
          <section className="bi-section bi-preview-section"><div className="bi-section-head"><div><span>06 · DATA PREVIEW</span><h2>داده‌ای که واقعاً تحلیل شده</h2><p>این جدول نسخه clean را نشان می‌دهد؛ نه فایل خام.</p></div></div><div className="bi-table-wrap"><table><thead><tr>{Object.keys(pipeline.cleanedRows[0] || {}).slice(0, 8).map(column => <th key={column}>{column}</th>)}</tr></thead><tbody>{pipeline.cleanedRows.slice(0, 8).map((row, index) => <tr key={index}>{Object.keys(pipeline.cleanedRows[0] || {}).slice(0, 8).map(column => <td key={column}>{String(row[column] ?? '—')}</td>)}</tr>)}</tbody></table></div></section>
          <details className="bi-tech"><summary>Technical trace · cleaning · validation · semantic model</summary><div className="bi-tech-grid"><div><b>{pipeline.cleaning.outputRows}</b><span>clean rows</span></div><div><b>{pipeline.validation.columns.length}</b><span>profiled columns</span></div><div><b>{pipeline.model.relationships.length}</b><span>candidate relations</span></div><div><b>{analysis.trace.length}</b><span>reasoning steps</span></div></div></details>
        </>}
      </div>
    </section>
  </main>;
}
