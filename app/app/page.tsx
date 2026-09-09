'use client';

import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import Link from 'next/link';
import { profileRows, type Analysis, type Row } from '../../lib/omind-engine';

const API_BASE = process.env.NEXT_PUBLIC_OMIND_API_URL?.replace(/\/$/, '');
const ROLES: Record<string, string> = { manager: 'مدیریت', sales: 'فروش', finance: 'مالی', hr: 'منابع انسانی', ops: 'عملیات' };
type View = 'overview' | 'new' | 'analyses' | 'decisions' | 'actions' | 'sources' | 'memory' | 'settings';
type Session = { id: string; file: string; question: string; analysis: Analysis; createdAt: string };
type Decision = { id: string; analysis_id: string; problem: string; decision: string; expected_outcome: string; experiment?: string; status: string; actual_outcome?: string | null; lesson?: string | null; created_at: string };

type Me = { user?: { name?: string; email?: string } };

async function localParse(file: File): Promise<Row[]> {
  const buffer = await file.arrayBuffer();
  const name = file.name.toLowerCase();
  if (name.endsWith('.json')) {
    const parsed = JSON.parse(new TextDecoder().decode(buffer));
    const rows = Array.isArray(parsed) ? parsed : parsed?.data;
    if (!Array.isArray(rows)) throw new Error('JSON باید آرایه‌ای از objectها یا دارای data باشد.');
    return rows;
  }
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  if (!wb.SheetNames.length) throw new Error('sheet قابل تحلیل وجود ندارد.');
  return XLSX.utils.sheet_to_json<Row>(wb.Sheets[wb.SheetNames[0]], { defval: null, raw: true });
}

function initials(name: string) { return name.trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase() || 'O'; }
function fileType(name: string) { const n = name.toLowerCase(); return n.endsWith('.json') ? 'JSON' : n.endsWith('.xlsx') || n.endsWith('.xls') ? 'Excel' : 'CSV'; }
function timeAgo(value: string) { const ms = Date.now() - new Date(value).getTime(); const mins = Math.max(1, Math.round(ms / 60000)); if (mins < 60) return `${mins} دقیقه پیش`; const hours = Math.round(mins / 60); if (hours < 24) return `${hours} ساعت پیش`; return `${Math.round(hours / 24)} روز پیش`; }

export default function AppHome() {
  const [view, setView] = useState<View>('overview');
  const [file, setFile] = useState<File | null>(null);
  const [role, setRole] = useState('manager');
  const [question, setQuestion] = useState('');
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [remaining, setRemaining] = useState(3);
  const [token, setToken] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [scenario, setScenario] = useState('');
  const [selectedDecision, setSelectedDecision] = useState<Decision | null>(null);
  const [outcome, setOutcome] = useState({ actual_outcome: '', lesson: '', status: 'success' });
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [decisionForm, setDecisionForm] = useState({ problem: '', decision: '', expected_outcome: '', experiment: '' });

  useEffect(() => {
    const boot = async () => {
      const t = localStorage.getItem('omind-session-token') || localStorage.getItem('omind-workspace-token') || '';
      const w = localStorage.getItem('omind-workspace-id') || '';
      if (!t || !w) { window.location.href = '/login'; return; }
      setToken(t); setWorkspaceId(w);
      if (!API_BASE) return;
      try {
        const headers = { Authorization: `Bearer ${t}` };
        const [me, ws, as, ds] = await Promise.all([
          fetch(`${API_BASE}/auth/me`, { headers }),
          fetch(`${API_BASE}/workspaces/${w}`, { headers }),
          fetch(`${API_BASE}/workspaces/${w}/analyses`, { headers }),
          fetch(`${API_BASE}/decisions?workspace_id=${w}`, { headers }),
        ]);
        if (!me.ok) { localStorage.removeItem('omind-session-token'); window.location.href = '/login'; return; }
        const md = await me.json() as Me;
        setUserName(md.user?.name || 'OMIND User');
        setUserEmail(md.user?.email || '');
        if (ws.ok) setRemaining((await ws.json()).remaining);
        if (as.ok) {
          const data = await as.json();
          setSessions(data.map((i: any) => ({ id: i.id, file: i.filename, question: i.question, analysis: i.result, createdAt: i.created_at })));
        }
        if (ds.ok) setDecisions(await ds.json());
      } catch { setError('ارتباط با سرویس برقرار نشد.'); }
    };
    void boot();
  }, []);

  const filteredSessions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter(s => `${s.file} ${s.question}`.toLowerCase().includes(q));
  }, [query, sessions]);
  const highSignals = useMemo(() => sessions.flatMap(s => (s.analysis?.signals || []).filter(x => String(x.priority).toLowerCase().includes('high'))).slice(0, 6), [sessions]);
  const openDecisions = useMemo(() => decisions.filter(d => d.status === 'planned' || !d.actual_outcome), [decisions]);
  const actionQueue = useMemo(() => {
    const fromAnalysis = analysis?.actions || sessions[0]?.analysis?.actions || [];
    return Array.from(new Set([...fromAnalysis, ...decisions.filter(d => d.status === 'planned').map(d => d.decision)])).slice(0, 8);
  }, [analysis, decisions, sessions]);
  const health = analysis?.health ?? (sessions[0]?.analysis?.health ?? 0);
  const confidence = analysis?.confidence ?? (sessions[0]?.analysis?.confidence ?? 0);
  const topSignal = analysis?.signals?.[0] || sessions[0]?.analysis?.signals?.[0];
  const currentFileType = file ? fileType(file.name) : 'CSV · Excel · JSON';

  function chooseScenario(nextRole: string, nextQuestion: string) {
    setRole(nextRole); setQuestion(nextQuestion); setScenario(nextRole); setView('new'); window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function analyze() {
    if (!file) { setError('ابتدا فایل را انتخاب کن.'); return; }
    if (remaining <= 0) { setError('سهمیه تحلیل رایگان تمام شده است.'); return; }
    setBusy(true); setError('');
    try {
      if (!API_BASE) {
        const rows = await localParse(file);
        const result = profileRows(rows, question, role);
        const localSession = { id: `local-${Date.now()}`, file: file.name, question: question || 'پرسش خودکار', analysis: result, createdAt: new Date().toISOString() };
        setAnalysis(result); setSessions(v => [localSession, ...v]); setRemaining(v => Math.max(0, v - 1)); setView('overview'); return;
      }
      const body = new FormData(); body.append('file', file); body.append('question', question); body.append('role', role); body.append('workspace_id', workspaceId);
      const response = await fetch(`${API_BASE}/analyses`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'تحلیل ناموفق بود.');
      setAnalysis(data.result); setRemaining(v => Math.max(0, v - 1));
      setSessions(v => [{ id: data.id, file: data.filename, question: data.question, analysis: data.result, createdAt: data.created_at }, ...v]);
      setView('overview');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'تحلیل ناموفق بود.'); }
    finally { setBusy(false); }
  }

  function openDecision() {
    const signal = analysis?.signals?.[0] || sessions[0]?.analysis?.signals?.[0];
    setDecisionForm({ problem: signal?.title || analysis?.priorities?.[0] || '', decision: '', expected_outcome: '', experiment: '' });
    setDecisionOpen(true);
  }

  async function createDecision() {
    if (!analysis || !decisionForm.problem || !decisionForm.decision || !decisionForm.expected_outcome || !decisionForm.experiment) { setError('چهار بخش تصمیم را کامل کن.'); return; }
    const current = sessions.find(s => s.analysis === analysis);
    if (!current || !API_BASE) { setError('این تحلیل هنوز به workspace متصل نیست.'); return; }
    try {
      const response = await fetch(`${API_BASE}/decisions`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ analysis_id: current.id, problem: decisionForm.problem, evidence: { signals: analysis.signals, health: analysis.health }, assumptions: [], hypotheses: analysis.hypotheses, decision: decisionForm.decision, expected_outcome: decisionForm.expected_outcome, experiment: decisionForm.experiment }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.detail || 'ثبت تصمیم ناموفق بود.');
      setDecisions(v => [data, ...v]); setDecisionOpen(false); setView('decisions');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'ثبت تصمیم ناموفق بود.'); }
  }

  async function updateOutcome() {
    if (!selectedDecision || !API_BASE || !outcome.actual_outcome || !outcome.lesson) { setError('نتیجه و درس آموخته‌شده را کامل کن.'); return; }
    try {
      const response = await fetch(`${API_BASE}/decisions/${selectedDecision.id}/outcome`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(outcome) });
      const data = await response.json(); if (!response.ok) throw new Error(data.detail || 'ثبت نتیجه ناموفق بود.');
      setDecisions(v => v.map(d => d.id === data.id ? data : d)); setSelectedDecision(null); setOutcome({ actual_outcome: '', lesson: '', status: 'success' });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'ثبت نتیجه ناموفق بود.'); }
  }

  function signOut() { localStorage.removeItem('omind-session-token'); localStorage.removeItem('omind-workspace-token'); localStorage.removeItem('omind-workspace-id'); window.location.href = '/'; }
  function go(next: View) { setView(next); setError(''); setProfileOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }

  return (
    <main className="omind-console">
      <header className="console-topbar">
        <div className="console-brand"><Link href="/" className="console-logo">O</Link><div><strong>OMIND</strong><span>Decision Workspace</span></div></div>
        <button className="command-search" onClick={() => document.getElementById('global-search')?.focus()}><span>⌕</span><input id="global-search" aria-label="جستجو" value={query} onChange={e => setQuery(e.target.value)} onClick={e => e.stopPropagation()} placeholder="در تحلیل‌ها، تصمیم‌ها و فایل‌ها جستجو کن..." /><kbd>⌘ K</kbd></button>
        <div className="top-actions"><button className="icon-button" title="فعالیت">◌<i>2</i></button><button className="profile-trigger" onClick={() => setProfileOpen(v => !v)}><span className="avatar">{initials(userName)}</span><span className="profile-copy"><b>{userName || 'OMIND User'}</b><small>{remaining} تحلیل باقی‌مانده</small></span><span className="chevron">⌄</span></button>{profileOpen && <div className="profile-menu"><div className="profile-menu-head"><span className="avatar large">{initials(userName)}</span><div><b>{userName}</b><small>{userEmail}</small></div></div><button onClick={() => go('settings')}>حساب و workspace</button><button onClick={signOut}>خروج از OMIND</button></div>}</div>
      </header>

      <div className="console-body">
        <aside className="console-sidebar">
          <div className="sidebar-workspace"><span className="workspace-mark">O</span><div><b>Personal workspace</b><small>{userName || 'Your workspace'}</small></div><span className="status-dot" /></div>
          <div className="sidebar-group"><small>WORKSPACE</small>{navButton('overview','⌂','نمای کلی','Overview',view,setView)}{navButton('new','＋','تحلیل جدید','New Analysis',view,setView)}{navButton('analyses','◫','تحلیل‌ها','Analyses',view,setView)}{navButton('decisions','◇','تصمیم‌ها','Decisions',view,setView)}</div>
          <div className="sidebar-group"><small>WORKFLOW</small>{navButton('actions','✓','کارهای من','My Work',view,setView)}{navButton('sources','◍','منابع داده','Data Sources',view,setView)}{navButton('memory','∞','حافظه تصمیم','Decision Memory',view,setView)}</div>
          <div className="sidebar-group sidebar-bottom-nav">{navButton('settings','⚙','تنظیمات','Settings',view,setView)}</div>
          <div className="plan-mini"><div><span>FREE PLAN</span><b>{remaining} / 3 analyses</b></div><div className="plan-bar"><i style={{ width: `${Math.max(0, Math.min(100, remaining / 3 * 100))}%` }} /></div><button onClick={() => window.location.href='/#pricing'}>افزایش ظرفیت <b>→</b></button></div>
        </aside>

        <section className="console-main">
          {error && <div className="console-alert">{error}<button onClick={() => setError('')}>×</button></div>}
          {view === 'overview' && <Overview userName={userName} health={health} confidence={confidence} topSignal={topSignal} highSignals={highSignals} openDecisions={openDecisions} actionQueue={actionQueue} sessions={sessions} onNew={() => go('new')} onDecisions={() => go('decisions')} onOpenAnalysis={(s) => { setAnalysis(s.analysis); go('overview'); }} chooseScenario={chooseScenario} />}
          {view === 'new' && <NewAnalysis file={file} setFile={setFile} role={role} setRole={setRole} question={question} setQuestion={setQuestion} scenario={scenario} currentFileType={currentFileType} busy={busy} remaining={remaining} analyze={analyze} chooseScenario={chooseScenario} />}
          {view === 'analyses' && <AnalysesView sessions={filteredSessions} query={query} onOpen={(s) => { setAnalysis(s.analysis); go('overview'); }} onNew={() => go('new')} />}
          {view === 'decisions' && <DecisionsView decisions={decisions} onSelect={(d) => { setSelectedDecision(d); setOutcome({ actual_outcome: '', lesson: '', status: d.status === 'planned' ? 'success' : d.status }); }} />}
          {view === 'actions' && <ActionsView actions={actionQueue} />}
          {view === 'sources' && <SourcesView sessions={sessions} />}
          {view === 'memory' && <MemoryView decisions={decisions} />}
          {view === 'settings' && <SettingsView userName={userName} userEmail={userEmail} remaining={remaining} onSignOut={signOut} />}
          {analysis && view === 'overview' && <AnalysisSurface analysis={analysis} onDecision={openDecision} />}
        </section>
      </div>

      {decisionOpen && <Modal title="این یافته چه تصمیمی می‌سازد؟" eyebrow="DECISION MEMORY" onClose={() => setDecisionOpen(false)}><div className="modal-signal">{decisionForm.problem}</div><label>تصمیم<input value={decisionForm.decision} onChange={e => setDecisionForm({ ...decisionForm, decision: e.target.value })} placeholder="مثلاً سه حساب کلیدی را قبل از جمعه بازبینی می‌کنیم." /></label><label>نتیجه مورد انتظار<input value={decisionForm.expected_outcome} onChange={e => setDecisionForm({ ...decisionForm, expected_outcome: e.target.value })} placeholder="مثلاً افت فروش این segment متوقف شود." /></label><label>اقدام / آزمایش<input value={decisionForm.experiment} onChange={e => setDecisionForm({ ...decisionForm, experiment: e.target.value })} placeholder="مالک، بازه زمانی و روش سنجش را مشخص کن." /></label><button className="console-primary full" onClick={createDecision}>ثبت در Decision Memory</button></Modal>}
      {selectedDecision && <Modal title="نتیجه‌ی واقعی چه بود؟" eyebrow="OUTCOME LOOP" onClose={() => setSelectedDecision(null)}><div className="decision-preview"><b>{selectedDecision.decision}</b><span>{selectedDecision.problem}</span></div><label>نتیجه واقعی<textarea value={outcome.actual_outcome} onChange={e => setOutcome({ ...outcome, actual_outcome: e.target.value })} placeholder="چه اتفاقی افتاد؟" /></label><label>درس آموخته‌شده<textarea value={outcome.lesson} onChange={e => setOutcome({ ...outcome, lesson: e.target.value })} placeholder="برای تصمیم بعدی چه چیزی را باید تغییر دهیم؟" /></label><label>وضعیت<select value={outcome.status} onChange={e => setOutcome({ ...outcome, status: e.target.value })}><option value="success">موفق</option><option value="incomplete">ناقص</option><option value="failure">ناموفق</option><option value="retest">آزمایش مجدد</option></select></label><button className="console-primary full" onClick={updateOutcome}>ثبت نتیجه و یادگیری</button></Modal>}
    </main>
  );
}

function navButton(value: View, icon: string, fa: string, en: string, current: View, setView: (v: View) => void) { return <button key={value} className={`console-nav-item ${current === value ? 'active' : ''}`} onClick={() => { setView(value); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><span className="nav-icon">{icon}</span><span><b>{fa}</b><small>{en}</small></span>{value === 'decisions' && <em>!</em>}</button>; }

function Overview({ userName, health, confidence, topSignal, highSignals, openDecisions, actionQueue, sessions, onNew, onDecisions, onOpenAnalysis, chooseScenario }: any) {
  return <div className="view-stack">
    <div className="page-heading"><div><span className="eyebrow live-eyebrow"><i /> WORKSPACE LIVE</span><h1>خوش آمدی{userName ? `، ${userName}` : ''}.</h1><p>اینجا جایی است که داده، مسئله و تصمیم روزمره‌ات به هم می‌رسند.</p></div><button className="console-primary" onClick={onNew}>＋ تحلیل جدید</button></div>
    <div className="priority-hero"><div className="priority-copy"><span className="eyebrow">TODAY'S FOCUS</span><h2>{topSignal?.title || 'اولین سیگنال مهمت را پیدا کن.'}</h2><p>{topSignal?.detail || 'یک فایل واقعی از فروش، مالی، منابع انسانی یا عملیات وارد کن. OMIND در چند دقیقه نشان می‌دهد چه چیزی ارزش توجه دارد.'}</p><div className="hero-actions"><button className="console-primary" onClick={onNew}>{topSignal ? 'بررسی این سیگنال' : 'شروع اولین تحلیل'} <span>←</span></button><button className="ghost-button" onClick={onDecisions}>دیدن تصمیم‌های باز</button></div></div><div className="focus-orbit"><div className="orbit-ring r1"/><div className="orbit-ring r2"/><div className="focus-core"><span>{confidence || '—'}%</span><small>confidence</small></div><div className="focus-beacon b1"/><div className="focus-beacon b2"/></div></div>
    <div className="metric-row"><Metric label="تحلیل‌ها" value={sessions.length} hint="در workspace" accent="blue"/><Metric label="تصمیم‌های باز" value={openDecisions.length} hint="نیازمند follow-up" accent="violet"/><Metric label="کارهای پیش‌رو" value={actionQueue.length} hint="از آخرین تحلیل‌ها" accent="mint"/><Metric label="سلامت داده" value={health ? `${health}/100` : '—'} hint="آخرین تحلیل" accent="amber"/></div>
    <div className="content-grid-two"><section className="panel-card attention-panel"><div className="panel-head"><div><span className="eyebrow">MY WORK</span><h3>چیزهایی که الان مهم‌اند</h3></div><span className="panel-count">{Math.min(6, highSignals.length + openDecisions.length)}</span></div>{highSignals.length || openDecisions.length ? <div className="attention-list">{highSignals.slice(0, 3).map((s: any, i: number) => <div className="attention-item" key={`${s.title}-${i}`}><span className="signal-mark red"/><div><b>{s.title}</b><small>{s.detail}</small></div><em>سیگنال قوی</em></div>)}{openDecisions.slice(0, 3).map((d: Decision) => <div className="attention-item" key={d.id}><span className="signal-mark violet"/><div><b>{d.decision}</b><small>{d.problem}</small></div><em>تصمیم باز</em></div>)}</div> : <EmptyState icon="✦" title="فعلاً چیزی در صف نیست." text="یک تحلیل شروع کن تا OMIND اولین موارد قابل توجه را بسازد." action="تحلیل جدید" onClick={onNew}/>}</section><section className="panel-card activity-panel"><div className="panel-head"><div><span className="eyebrow">RECENT ACTIVITY</span><h3>آخرین حرکت‌های workspace</h3></div><span className="panel-live"><i/> LIVE</span></div>{sessions.length ? <div className="activity-list">{sessions.slice(0, 5).map((s: Session) => <button className="activity-item" key={s.id} onClick={() => onOpenAnalysis(s)}><span className="activity-file">{fileType(s.file).slice(0, 1)}</span><div><b>{s.file}</b><small>{s.question || 'پرسش خودکار'} · {timeAgo(s.createdAt)}</small></div><span className="activity-arrow">←</span></button>)}</div> : <EmptyState icon="◫" title="هنوز فعالیتی نداری." text="اولین فایل را وارد کن و بگذار workspace شروع به شکل گرفتن کند." action="شروع" onClick={onNew}/>}</section></div>
    <section className="scenario-section"><div className="panel-head"><div><span className="eyebrow">START FROM A REAL QUESTION</span><h3>از مسئله شروع کن، نه از داشبورد.</h3></div><p>سناریو را انتخاب کن؛ سؤال و نقش را برایت آماده می‌کنیم.</p></div><div className="scenario-grid"><ScenarioCard accent="blue" icon="↗" title="فروش افت کرده" text="چرا فروش پایین آمده و کجا باید مداخله کنیم؟" onClick={() => chooseScenario('sales','چرا فروش این ماه افت کرده و مهم‌ترین عامل کدام است؟')}/><ScenarioCard accent="mint" icon="₿" title="فشار مالی" text="کدام انحراف مالی الان بیشترین اهمیت را دارد؟" onClick={() => chooseScenario('finance','مهم‌ترین انحراف مالی فعلی چیست و چه اقدامی باید انجام دهیم؟')}/><ScenarioCard accent="violet" icon="◎" title="عملیات گیر کرده" text="کدام گلوگاه یا تأخیر باید اول حل شود؟" onClick={() => chooseScenario('ops','کدام گلوگاه عملیاتی بیشترین اثر را دارد و اقدام بعدی چیست؟')}/><ScenarioCard accent="amber" icon="✦" title="نگاه مدیریتی" text="اگر فقط یک تصمیم بگیریم، چه چیزی باید باشد؟" onClick={() => chooseScenario('manager','بر اساس این داده‌ها مهم‌ترین تصمیم مدیریتی چیست؟')}/></div></section>
  </div>;
}
function Metric({ label, value, hint, accent }: any) { return <div className={`metric-card ${accent}`}><span className="metric-icon"/><div><small>{label}</small><strong>{value}</strong><em>{hint}</em></div></div>; }
function ScenarioCard({ accent, icon, title, text, onClick }: any) { return <button className={`scenario-card ${accent}`} onClick={onClick}><span className="scenario-icon">{icon}</span><div><small>USE CASE</small><h4>{title}</h4><p>{text}</p></div><span className="scenario-arrow">←</span></button>; }
function EmptyState({ icon, title, text, action, onClick }: any) { return <div className="empty-console"><span>{icon}</span><div><b>{title}</b><p>{text}</p></div>{action && <button onClick={onClick}>{action} →</button>}</div>; }

function NewAnalysis({ file, setFile, role, setRole, question, setQuestion, scenario, currentFileType, busy, remaining, analyze, chooseScenario }: any) { return <div className="view-stack"><div className="page-heading"><div><span className="eyebrow">NEW ANALYSIS</span><h1>یک سؤال واقعی را باز کن.</h1><p>{scenario ? `سناریوی ${ROLES[scenario]} آماده است؛ فایل را وارد کن و اجرا بگیر.` : 'فایل را بده، نقش خودت را مشخص کن و تصمیم بعدی را روشن کن.'}</p></div><div className="quota-badge"><b>{remaining}</b><small>analysis left</small></div></div><div className="analysis-builder"><section className="builder-main"><div className="builder-step"><span>01</span><div><small>DATA</small><h3>داده‌ای که همین حالا با آن کار می‌کنی</h3><p>نسخه اصلی فایل حفظ می‌شود و تحلیل از روی یک کپی امن انجام می‌گیرد.</p></div></div><label className="upload-zone"><input type="file" accept=".csv,.xlsx,.xls,.json" onChange={e => setFile(e.target.files?.[0] || null)}/><div className="upload-visual"><div className="upload-ring">↑</div><span className="upload-pulse"/></div><div><b>{file ? file.name : 'فایل را اینجا رها کن'}</b><small>{file ? `${currentFileType} · آماده تحلیل` : 'CSV، Excel یا JSON · حداکثر تا سقف مجاز'}</small></div><button type="button" onClick={e => { e.preventDefault(); (e.currentTarget.parentElement?.querySelector('input') as HTMLInputElement)?.click(); }}>انتخاب فایل</button></label><div className="builder-step"><span>02</span><div><small>CONTEXT</small><h3>چه چیزی برایت مهم‌تر است؟</h3><p>هرچه سؤال دقیق‌تر باشد، تحلیل کاربردی‌تر می‌شود؛ سؤال را خالی هم می‌توانی بگذاری.</p></div></div><textarea value={question} onChange={e => setQuestion(e.target.value)} placeholder="مثلاً چرا فروش منطقه شرق افت کرده؟" className="question-box"/><div className="context-row"><label><span>نقش من</span><select value={role} onChange={e => setRole(e.target.value)}>{Object.entries(ROLES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><div className="question-hint"><span>✦</span><p>OMIND سیگنال‌ها را با نقش شما اولویت‌بندی می‌کند.</p></div></div><button className="console-primary run-analysis" onClick={analyze} disabled={busy || !file || remaining <= 0}>{busy ? 'در حال فهمیدن داده…' : remaining <= 0 ? 'ارتقا برای تحلیل بیشتر' : 'تحلیل کن و بگو چه مهم است ←'}</button></section><aside className="builder-aside"><span className="eyebrow">TRY A STARTER</span><h3>برای شروع سؤال آماده می‌خواهی؟</h3><p>یک سناریو انتخاب کن تا ساختار تحلیل را خودکار تنظیم کنیم.</p><ScenarioCard accent="blue" icon="↗" title="Sales" text="افت فروش، segment و حساب‌های کلیدی" onClick={() => chooseScenario('sales','چرا فروش این ماه افت کرده و مهم‌ترین عامل کدام است؟')}/><ScenarioCard accent="mint" icon="₿" title="Finance" text="انحراف هزینه، نقدینگی و ریسک" onClick={() => chooseScenario('finance','مهم‌ترین انحراف مالی فعلی چیست و چه اقدامی باید انجام دهیم؟')}/><ScenarioCard accent="violet" icon="◎" title="Operations" text="گلوگاه، تأخیر و بهره‌وری" onClick={() => chooseScenario('ops','کدام گلوگاه عملیاتی بیشترین اثر را دارد و اقدام بعدی چیست؟')}/></aside></div></div>; }

function AnalysesView({ sessions, query, onOpen, onNew }: any) { return <div className="view-stack"><div className="page-heading"><div><span className="eyebrow">ANALYSES</span><h1>ردپای تحلیل‌هایت.</h1><p>{sessions.length} تحلیل در workspace ثبت شده است.</p></div><button className="console-primary" onClick={onNew}>＋ تحلیل جدید</button></div><div className="filter-row"><span className="filter-active">همه</span><span>اخیر</span><span>سیگنال قوی</span><div className="filter-search">⌕ {query || 'جستجو...'}</div></div>{sessions.length ? <div className="analysis-list">{sessions.map((s: Session) => <button className="analysis-list-item" key={s.id} onClick={() => onOpen(s)}><span className="file-tile">{fileType(s.file).slice(0, 1)}</span><div><b>{s.file}</b><small>{s.question || 'پرسش خودکار'}</small></div><div className="analysis-score"><b>{s.analysis.confidence}%</b><span>confidence</span></div><span className="list-arrow">←</span></button>)}</div> : <EmptyState icon="◫" title="اولین تحلیل هنوز ساخته نشده." text="با یک فایل واقعی شروع کن." action="تحلیل جدید" onClick={onNew}/>}</div>; }

function DecisionsView({ decisions, onSelect }: any) { return <div className="view-stack"><div className="page-heading"><div><span className="eyebrow">DECISION MEMORY</span><h1>تصمیم‌هایی که باید به نتیجه برسند.</h1><p>تصمیم را ثبت کن، نتیجه را برگردان و یادگیری را از دست نده.</p></div><span className="quota-badge"><b>{decisions.filter((d: Decision) => d.status === 'planned').length}</b><small>open</small></span></div>{decisions.length ? <div className="decision-list-grid">{decisions.map((d: Decision) => <button className="decision-card" key={d.id} onClick={() => onSelect(d)}><div className="decision-card-top"><span className={`decision-status ${d.status}`}>{d.status === 'planned' ? 'OPEN' : d.status.toUpperCase()}</span><small>{timeAgo(d.created_at)}</small></div><h3>{d.decision}</h3><p>{d.problem}</p><div className="decision-meta"><span>Expected</span><b>{d.expected_outcome}</b></div><span className="decision-action">ثبت نتیجه ←</span></button>)}</div> : <EmptyState icon="◇" title="هنوز تصمیمی ثبت نشده." text="یک تحلیل را به تصمیم تبدیل کن تا اینجا زنده شود." />}</div>; }
function ActionsView({ actions }: any) { return <div className="view-stack"><div className="page-heading"><div><span className="eyebrow">MY WORK</span><h1>کارهایی که منتظر تو هستند.</h1><p>این صف از actionهای آخرین تحلیل و تصمیم‌های باز ساخته می‌شود.</p></div><span className="panel-live"><i/> PRIORITIZED</span></div><div className="work-queue">{actions.length ? actions.map((a: string, i: number) => <div className="work-item" key={`${a}-${i}`}><span className="work-check">{String(i + 1).padStart(2, '0')}</span><div><b>{a}</b><small>{i === 0 ? 'اولویت پیشنهادی OMIND' : 'از آخرین تحلیل'}</small></div><span className={`work-priority ${i === 0 ? 'high' : 'normal'}`}>{i === 0 ? 'HIGH' : 'NEXT'}</span></div>) : <EmptyState icon="✓" title="صف کاری خالی است." text="تحلیل شروع کن تا OMIND اقدام‌های بعدی را بسازد." />}</div></div>; }
function SourcesView({ sessions }: any) { const unique = Array.from(new Map(sessions.map((s: Session) => [s.file, s])).values()); return <div className="view-stack"><div className="page-heading"><div><span className="eyebrow">DATA SOURCES</span><h1>داده‌هایی که به OMIND سپرده‌ای.</h1><p>منبع فایل، سلامت و آخرین تحلیل را یکجا ببین.</p></div></div>{unique.length ? <div className="source-grid">{unique.map((s: Session) => <div className="source-card" key={s.id}><div className="source-top"><span className="file-tile">{fileType(s.file).slice(0, 1)}</span><span className="source-health">{s.analysis.health}/100</span></div><h3>{s.file}</h3><p>{s.analysis.rows.toLocaleString('fa-IR')} ردیف · {s.analysis.columns.length} ستون</p><div className="source-bar"><i style={{ width: `${Math.max(0, Math.min(100, s.analysis.health))}%` }}/></div><small>آخرین تحلیل · {timeAgo(s.createdAt)}</small></div>)}</div> : <EmptyState icon="◍" title="هنوز منبع داده‌ای نداری." text="یک فایل اضافه کن تا Data Sources شکل بگیرد." />}</div>; }
function MemoryView({ decisions }: any) { const completed = decisions.filter((d: Decision) => d.actual_outcome).length; return <div className="view-stack"><div className="page-heading"><div><span className="eyebrow">ORGANIZATIONAL MEMORY</span><h1>تصمیم‌ها را فراموش نکن.</h1><p>اینجا ارزش بلندمدت OMIND ساخته می‌شود: مسئله، شواهد، تصمیم، outcome و lesson.</p></div><span className="memory-score"><b>{completed}</b><small>learned decisions</small></span></div><div className="memory-loop"><div className="memory-line"/><MemoryNode color="blue" label="DATA" text="داده و context"/><MemoryNode color="violet" label="DECISION" text="فرض و انتخاب"/><MemoryNode color="mint" label="OUTCOME" text="نتیجه واقعی"/><MemoryNode color="amber" label="LESSON" text="یادگیری"/></div><div className="lesson-grid">{decisions.filter((d: Decision) => d.lesson).slice(0, 8).map((d: Decision) => <article key={d.id}><span>LESSON</span><h3>{d.lesson}</h3><p>{d.decision}</p></article>)}{!completed && <EmptyState icon="∞" title="حافظه هنوز خالی است." text="وقتی اولین تصمیم را به نتیجه واقعی برگردانی، اینجا شروع به یادگیری می‌کند." />}</div></div>; }
function MemoryNode({ color, label, text }: any) { return <div className={`memory-node ${color}`}><span>{label}</span><b>{text}</b></div>; }
function SettingsView({ userName, userEmail, remaining, onSignOut }: any) { return <div className="view-stack"><div className="page-heading"><div><span className="eyebrow">SETTINGS</span><h1>حساب و workspace.</h1><p>اطلاعات اصلی حساب و ظرفیت فعلی را ببین.</p></div></div><div className="settings-grid"><section className="settings-card profile-settings"><div className="settings-title"><span className="avatar large">{initials(userName)}</span><div><span className="eyebrow">ACCOUNT</span><h3>{userName}</h3><p>{userEmail}</p></div></div><div className="setting-row"><span>نام نمایشی</span><b>{userName}</b></div><div className="setting-row"><span>ایمیل</span><b>{userEmail}</b></div></section><section className="settings-card"><span className="eyebrow">PLAN & USAGE</span><h3>Free workspace</h3><div className="usage-large"><b>{remaining}</b><span>تحلیل باقی‌مانده</span></div><div className="plan-bar large"><i style={{ width: `${Math.max(0, Math.min(100, remaining / 3 * 100))}%` }}/></div><a className="console-primary full-link" href="/#pricing">افزایش ظرفیت</a></section><section className="settings-card danger-card"><span className="eyebrow">SESSION</span><h3>خروج از این دستگاه</h3><p>توکن محلی پاک می‌شود و برای ورود بعدی دوباره احراز هویت لازم است.</p><button className="danger-button" onClick={onSignOut}>خروج از OMIND</button></section></div></div>; }

function AnalysisSurface({ analysis, onDecision }: { analysis: Analysis; onDecision: () => void }) { const signals = analysis.signals || []; return <section className="live-analysis"><div className="analysis-banner"><div><span className="eyebrow">ANALYSIS RESULT · LIVE</span><h2>{analysis.priorities[0] || signals[0]?.title || 'سیگنال اصلی'}</h2><p>{(analysis as any).summary || analysis.hypotheses[0] || 'شواهد کافی برای یک جمع‌بندی قوی‌تر لازم است.'}</p></div><div className="result-readiness"><small>CONFIDENCE</small><b>{analysis.confidence}%</b><div className="readiness-bar"><i style={{ width: `${analysis.confidence}%` }}/></div></div></div><div className="result-grid"><div className="result-card signals-card"><div className="panel-head"><div><span className="eyebrow">WHAT MATTERS</span><h3>سیگنال‌های اصلی</h3></div><span className="panel-count">{signals.length}</span></div>{signals.slice(0, 5).map((s, i) => <div className="signal-result" key={`${s.title}-${i}`}><span className={`priority-pill ${String(s.priority).toLowerCase().includes('high') ? 'high' : 'normal'}`}>{s.priority}</span><div><b>{s.title}</b><p>{s.detail}</p><small>score {s.score}</small></div></div>)}</div><div className="result-card next-card"><div className="panel-head"><div><span className="eyebrow">NEXT ACTION</span><h3>قدم بعدی</h3></div><span className="next-symbol">→</span></div>{analysis.actions.slice(0, 4).map((a, i) => <div className="next-action" key={`${a}-${i}`}><span>{String(i + 1).padStart(2, '0')}</span><b>{a}</b></div>)}<button className="console-primary full" onClick={onDecision}>این تحلیل را به یک تصمیم تبدیل کن →</button></div></div><div className="trace-strip"><span>12 reasoning modules</span><span>Evidence-first</span><span>Decision readiness · {(analysis as any).decision_readiness || 'investigate'}</span></div></section>; }
function Modal({ title, eyebrow, onClose, children }: any) { return <div className="console-modal-backdrop"><section className="console-modal"><button className="modal-x" onClick={onClose}>×</button><span className="eyebrow">{eyebrow}</span><h2>{title}</h2><div className="modal-form">{children}</div></section></div>; }
