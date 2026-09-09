'use client';

import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { profileRows, type Analysis, type Row } from '../lib/omind-engine';

type Tab = 'workspace' | 'history' | 'pricing';
type FilePersona = { key: string; label: string; icon: string; accent: string; message: string };
type Session = { id: string; file: string; question: string; analysis: Analysis; createdAt: string };
type Decision = {
  id: string;
  analysis_id: string;
  problem: string;
  decision: string;
  expected_outcome: string;
  experiment: string;
  actual_outcome?: string | null;
  lesson?: string | null;
  status: string;
  created_at: string;
};

const PERSONAS: Record<string, FilePersona> = {
  excel: { key: 'excel', label: 'Excel', icon: '▦', accent: '#21A366', message: 'اکسل را گرفتم. ساختارش را بررسی می‌کنم.' },
  csv: { key: 'csv', label: 'CSV', icon: '≡', accent: '#4F8EF7', message: 'داده خام رسید. ساختارش را بررسی می‌کنم.' },
  json: { key: 'json', label: 'JSON', icon: '{}', accent: '#F2C94C', message: 'ساختار JSON را بررسی می‌کنم.' },
  default: { key: 'default', label: 'OMIND', icon: 'O', accent: '#64A9FF', message: 'داده را بده تا از مشاهده به تصمیم برویم.' },
};

const ROLE_LABELS: Record<string, string> = {
  manager: 'مدیر',
  sales: 'فروش',
  finance: 'مالی',
  hr: 'منابع انسانی',
  ops: 'عملیات',
};

const API_BASE = process.env.NEXT_PUBLIC_OMIND_API_URL?.replace(/\/$/, '');

function personaFor(name?: string): FilePersona {
  const value = (name ?? '').toLowerCase();
  if (value.endsWith('.xlsx') || value.endsWith('.xls')) return PERSONAS.excel;
  if (value.endsWith('.csv')) return PERSONAS.csv;
  if (value.endsWith('.json')) return PERSONAS.json;
  return PERSONAS.default;
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

async function parseLocal(file: File): Promise<Row[]> {
  const buffer = await file.arrayBuffer();
  const name = file.name.toLowerCase();
  if (name.endsWith('.json')) {
    const parsed = JSON.parse(new TextDecoder().decode(buffer));
    const rows = Array.isArray(parsed) ? parsed : parsed?.data;
    if (!Array.isArray(rows) || !rows.every((item) => item && typeof item === 'object' && !Array.isArray(item))) {
      throw new Error('JSON باید آرایه‌ای از objectها یا دارای data باشد.');
    }
    return rows as Row[];
  }
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  if (!workbook.SheetNames.length) throw new Error('فایل Excel هیچ sheet قابل تحلیلی ندارد.');
  return XLSX.utils.sheet_to_json<Row>(workbook.Sheets[workbook.SheetNames[0]], { defval: null, raw: true });
}

export default function Home() {
  const [tab, setTab] = useState<Tab>('workspace');
  const [file, setFile] = useState<File | null>(null);
  const [role, setRole] = useState('manager');
  const [question, setQuestion] = useState('');
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState<string | null>(null);
  const [feedback, setFeedback] = useState({ actual_outcome: '', lesson: '', status: 'success' });
  const [decisionForm, setDecisionForm] = useState({ problem: '', decision: '', expected_outcome: '', experiment: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [token, setToken] = useState('');
  const [remaining, setRemaining] = useState(3);

  const persona = useMemo(() => personaFor(file?.name), [file?.name]);
  const roleLabel = ROLE_LABELS[role] ?? 'مدیر';
  const openDecision = () => setDecisionOpen(true);

  useEffect(() => {
    if (!API_BASE) return;
    let cancelled = false;
    const boot = async () => {
      try {
        let id = localStorage.getItem('omind-workspace-id') ?? '';
        let accessToken = localStorage.getItem('omind-workspace-token') ?? '';
        if (!id || !accessToken) {
          const response = await fetch(`${API_BASE}/workspaces`, { method: 'POST' });
          if (!response.ok) throw new Error('ساخت workspace ناموفق بود.');
          const data = await response.json();
          id = data.id;
          accessToken = data.access_token;
          localStorage.setItem('omind-workspace-id', id);
          localStorage.setItem('omind-workspace-token', accessToken);
        }
        if (cancelled) return;
        setWorkspaceId(id);
        setToken(accessToken);
        const headers = authHeaders(accessToken);
        const [workspaceResponse, analysesResponse, decisionsResponse] = await Promise.all([
          fetch(`${API_BASE}/workspaces/${id}`, { headers }),
          fetch(`${API_BASE}/workspaces/${id}/analyses`, { headers }),
          fetch(`${API_BASE}/decisions?workspace_id=${id}`, { headers }),
        ]);
        if (!workspaceResponse.ok || !analysesResponse.ok || !decisionsResponse.ok) {
          throw new Error('بازیابی workspace ناموفق بود.');
        }
        const workspace = await workspaceResponse.json();
        const analyses = await analysesResponse.json();
        const storedDecisions = await decisionsResponse.json();
        if (cancelled) return;
        setRemaining(workspace.remaining);
        setSessions(
          analyses.map((item: any) => ({
            id: item.id,
            file: item.filename,
            question: item.question,
            analysis: item.result,
            createdAt: new Date(item.created_at).toLocaleString('fa-IR'),
          })),
        );
        setDecisions(storedDecisions);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'اتصال به سرویس ناموفق بود.');
      }
    };
    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  async function analyze() {
    if (!file) {
      setError('ابتدا یک فایل CSV، XLSX، XLS یا JSON انتخاب کن.');
      return;
    }
    if (remaining <= 0) {
      setError('سهمیه تحلیل شما تمام شده است.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (!API_BASE) {
        const rows = await parseLocal(file);
        if (!rows.length) throw new Error('فایل داده قابل تحلیل ندارد.');
        const result = profileRows(rows, question, role);
        const resolvedQuestion = question.trim() || result.questions[0] || 'مهم‌ترین مسئله این داده چیست؟';
        const session: Session = {
          id: crypto.randomUUID(),
          file: file.name,
          question: resolvedQuestion,
          analysis: result,
          createdAt: new Date().toLocaleString('fa-IR'),
        };
        setAnalysis(result);
        setQuestion(resolvedQuestion);
        setSessions((current) => [session, ...current]);
        setRemaining((value) => Math.max(0, value - 1));
        return;
      }
      if (!workspaceId || !token) throw new Error('workspace آماده نیست.');
      const body = new FormData();
      body.append('file', file);
      body.append('question', question.trim());
      body.append('role', role);
      body.append('workspace_id', workspaceId);
      const response = await fetch(`${API_BASE}/analyses`, {
        method: 'POST',
        headers: authHeaders(token),
        body,
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(response.status === 402 ? 'سهمیه تحلیل شما تمام شده است.' : text || 'تحلیل سرور ناموفق بود.');
      }
      const data = await response.json();
      setAnalysis(data.result);
      setQuestion(data.question);
      setRemaining((value) => Math.max(0, value - 1));
      const session: Session = {
        id: data.id,
        file: data.filename,
        question: data.question,
        analysis: data.result,
        createdAt: new Date(data.created_at).toLocaleString('fa-IR'),
      };
      setSessions((current) => [session, ...current.filter((item) => item.id !== session.id)]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تحلیل ناموفق بود.');
    } finally {
      setBusy(false);
    }
  }

  async function createDecision() {
    if (!analysis || !decisionForm.problem || !decisionForm.decision || !decisionForm.expected_outcome || !decisionForm.experiment) {
      setError('تمام فیلدهای تصمیم را کامل کن.');
      return;
    }
    if (!API_BASE || !token) {
      setError('ثبت تصمیم نیازمند backend است.');
      return;
    }
    const currentSession = sessions.find((item) => item.analysis === analysis);
    if (!currentSession) {
      setError('تحلیل فعلی در workspace پیدا نشد.');
      return;
    }
    const payload = {
      analysis_id: currentSession.id,
      problem: decisionForm.problem,
      evidence: { signals: analysis.signals, health: analysis.health },
      assumptions: [],
      hypotheses: analysis.hypotheses,
      decision: decisionForm.decision,
      expected_outcome: decisionForm.expected_outcome,
      experiment: decisionForm.experiment,
    };
    try {
      const response = await fetch(`${API_BASE}/decisions`, {
        method: 'POST',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('ثبت تصمیم ناموفق بود.');
      const created = await response.json();
      setDecisions((current) => [created, ...current]);
      setDecisionOpen(false);
      setDecisionForm({ problem: '', decision: '', expected_outcome: '', experiment: '' });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ثبت تصمیم ناموفق بود.');
    }
  }

  async function submitFeedback(id: string) {
    if (!API_BASE || !token) return;
    try {
      const response = await fetch(`${API_BASE}/decisions/${id}/outcome`, {
        method: 'PATCH',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify(feedback),
      });
      if (!response.ok) throw new Error('ثبت outcome ناموفق بود.');
      const updated = await response.json();
      setDecisions((current) => current.map((item) => (item.id === id ? updated : item)));
      setFeedbackOpen(null);
      setFeedback({ actual_outcome: '', lesson: '', status: 'success' });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ثبت outcome ناموفق بود.');
    }
  }

  function reset() {
    setFile(null);
    setAnalysis(null);
    setQuestion('');
    setError('');
  }

  return (
    <main className="app-shell" style={{ '--persona-accent': persona.accent } as React.CSSProperties}>
      <header className="topbar">
        <button className="brand" onClick={() => setTab('workspace')}>
          <span className="brand-mark">O</span>
          <span><strong>OMIND</strong><small>DATA → DECISION</small></span>
        </button>
        <nav>
          <button className={tab === 'workspace' ? 'active' : ''} onClick={() => setTab('workspace')}>تحلیل‌گر</button>
          <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>حافظه تصمیم</button>
          <button className={tab === 'pricing' ? 'active' : ''} onClick={() => setTab('pricing')}>قیمت</button>
        </nav>
        <div className="quota"><span>{API_BASE ? 'SERVER' : 'LOCAL'}</span><b>{remaining}</b><small>تحلیل</small></div>
      </header>

      {tab === 'workspace' && (
        <section className="workspace-page">
          <div className="hero-row">
            <div className="hero-copy">
              <span className="eyebrow">INTELLIGENCE FOR REAL BUSINESS DATA</span>
              <h1>فایل را بده.<br /><em>مسئله را پیدا کن.</em><br />اقدام بعدی را بگیر.</h1>
              <p>OMIND داده را پروفایل می‌کند، کیفیت و سیگنال‌ها را پیدا می‌کند و تحلیل را به سؤال، اولویت و اقدام تبدیل می‌کند.</p>
              <div className="proof"><span>۳ تحلیل رایگان</span><span>Excel · CSV · JSON</span><span>شفاف و قابل ردیابی</span></div>
            </div>
            <OmindAgent persona={persona} busy={busy} analysis={Boolean(analysis)} />
          </div>

          <div className="workspace-grid">
            <div className="panel main-panel">
              <div className="panel-head">
                <div><span className="eyebrow">01 / INGEST</span><h2>داده‌ات را وارد کن</h2></div>
                <button className="ghost" onClick={reset}>پاک کردن</button>
              </div>
              <label className="dropzone" data-persona={persona.key}>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,.json"
                  onChange={(event) => {
                    setFile(event.target.files?.[0] ?? null);
                    setAnalysis(null);
                    setError('');
                  }}
                />
                <span className="upload-icon">↑</span>
                <strong>{file ? file.name : 'فایل را اینجا بکش یا انتخاب کن'}</strong>
                <small>CSV · XLSX · XLS · JSON</small>
              </label>
              <div className="agent-status"><span className="status-dot" /><b>{persona.label}</b><span>{persona.message}</span></div>
              <div className="controls">
                <label>نقش شما
                  <select value={role} onChange={(event) => setRole(event.target.value)}>
                    {Object.entries(ROLE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                  </select>
                </label>
                <label className="wide">سؤال یا هدف تحلیل
                  <textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={`مثلاً: مهم‌ترین مسئله ${roleLabel} در این داده چیست؟`} rows={3} />
                </label>
              </div>
              {analysis && (
                <div className="question-list">
                  <span className="eyebrow">QUESTIONS</span>
                  {analysis.questions.map((item) => <button key={item} onClick={() => setQuestion(item)}>{item}</button>)}
                </div>
              )}
              {error && <div className="error">{error}</div>}
              <button className="primary full" onClick={() => void analyze()} disabled={busy || remaining <= 0}>{busy ? 'در حال تحلیل…' : 'اجرای تحلیل ←'}</button>
            </div>
            <aside className="panel engine-panel">
              <span className="eyebrow">OMIND ENGINE</span>
              <h3>از داده تا تصمیم</h3>
              <div className="pipeline">
                {['Intake', 'Observe', 'Decompose', 'Pattern', 'Hypothesis', 'Causality', 'Decision', 'Scenarios', 'Experiment', 'Action', 'Feedback', 'Loop'].map((item, index) => (
                  <div key={item}><i>{String(index + 1).padStart(2, '0')}</i><span>{item}</span></div>
                ))}
              </div>
              <p>هسته تحلیل deterministic و قابل توضیح است؛ AI فقط در لایه تقویتی قرار می‌گیرد.</p>
            </aside>
          </div>

          {analysis && <AnalysisView analysis={analysis} question={question} onCreateDecision={openDecision} />}
        </section>
      )}

      {tab === 'history' && (
        <section className="content-page">
          <span className="eyebrow">DECISION MEMORY</span>
          <h1>حافظه تصمیم</h1>
          <p>{API_BASE ? 'تصمیم‌ها از workspace سرور بارگذاری می‌شوند.' : 'حالت محلی فعال است.'}</p>
          {decisions.length > 0 ? decisions.map((decision) => (
            <article className="history-card" key={decision.id}>
              <div><b>{decision.problem}</b><small>{new Date(decision.created_at).toLocaleString('fa-IR')}</small></div>
              <h3>{decision.decision}</h3>
              <span>وضعیت: {decision.status}</span>
              {decision.actual_outcome && <p>Outcome: {decision.actual_outcome}</p>}
              {decision.lesson && <p>Lesson: {decision.lesson}</p>}
              {!decision.actual_outcome && API_BASE && <button className="primary" onClick={() => setFeedbackOpen(decision.id)}>ثبت نتیجه</button>}
              {feedbackOpen === decision.id && (
                <div className="controls">
                  <label className="wide">نتیجه واقعی<textarea value={feedback.actual_outcome} onChange={(event) => setFeedback((value) => ({ ...value, actual_outcome: event.target.value }))} /></label>
                  <label className="wide">درس آموخته‌شده<textarea value={feedback.lesson} onChange={(event) => setFeedback((value) => ({ ...value, lesson: event.target.value }))} /></label>
                  <label>وضعیت
                    <select value={feedback.status} onChange={(event) => setFeedback((value) => ({ ...value, status: event.target.value }))}>
                      <option value="success">موفق</option>
                      <option value="incomplete">ناقص</option>
                      <option value="failure">ناموفق</option>
                      <option value="retest">بازآزمایی</option>
                    </select>
                  </label>
                  <button className="primary" onClick={() => void submitFeedback(decision.id)}>ذخیره</button>
                </div>
              )}
            </article>
          )) : sessions.length > 0 ? sessions.map((session) => (
            <article className="history-card" key={session.id}>
              <div><b>{session.file}</b><small>{session.createdAt}</small></div>
              <h3>{session.question}</h3>
              <span>Health {session.analysis.health}/100 · Confidence {session.analysis.confidence}%</span>
            </article>
          )) : <div className="empty">هنوز سابقه‌ای وجود ندارد.</div>}
        </section>
      )}

      {tab === 'pricing' && (
        <section className="content-page pricing-page">
          <span className="eyebrow">PAY WHEN VALUE IS PROVEN</span>
          <h1>سه تحلیل را رایگان امتحان کن.</h1>
          <div className="prices">
            <Price title="تحلیل تکی" price="۳۹۰٬۰۰۰" detail="یک تحلیل کامل فایل" />
            <Price title="Pro" price="۲٬۴۹۰٬۰۰۰" detail="۳۰ تحلیل + حافظه" featured />
            <Price title="Team" price="۶٬۹۰۰٬۰۰۰" detail="تا ۱۰ کاربر + فضای تیمی" featured />
          </div>
        </section>
      )}

      {decisionOpen && analysis && (
        <div className="modal-backdrop">
          <div className="panel modal-card">
            <div className="panel-head">
              <div><span className="eyebrow">DECISION</span><h2>ثبت تصمیم</h2></div>
              <button className="ghost" onClick={() => setDecisionOpen(false)}>بستن</button>
            </div>
            <div className="controls">
              <label className="wide">مسئله<input value={decisionForm.problem} onChange={(event) => setDecisionForm((value) => ({ ...value, problem: event.target.value }))} /></label>
              <label className="wide">تصمیم<input value={decisionForm.decision} onChange={(event) => setDecisionForm((value) => ({ ...value, decision: event.target.value }))} /></label>
              <label className="wide">Outcome مورد انتظار<textarea value={decisionForm.expected_outcome} onChange={(event) => setDecisionForm((value) => ({ ...value, expected_outcome: event.target.value }))} /></label>
              <label className="wide">آزمایش<textarea value={decisionForm.experiment} onChange={(event) => setDecisionForm((value) => ({ ...value, experiment: event.target.value }))} /></label>
            </div>
            <button className="primary full" onClick={() => void createDecision()}>ثبت در حافظه تصمیم</button>
          </div>
        </div>
      )}
    </main>
  );
}

function OmindAgent({ persona, busy, analysis }: { persona: FilePersona; busy: boolean; analysis: boolean }) {
  return (
    <div className={`agent-wrap ${busy ? 'thinking' : ''} ${analysis ? 'success' : ''}`} aria-label="OMIND agent">
      <div className="agent-bubble" style={{ borderColor: persona.accent }}><span>{busy ? 'در حال فکر…' : persona.message}</span></div>
      <div className="agent-avatar" style={{ '--agent-color': persona.accent } as React.CSSProperties}>
        <div className="agent-aura" />
        <div className="agent-body"><span className="tie" /></div>
        <div className="agent-head">
          <span className="ear left" /><span className="ear right" /><span className="face" />
          <span className="glasses"><i /><i /></span><span className="beard" /><span className="nose" /><span className="mouth" />
        </div>
        <div className="agent-badge">{persona.icon}</div>
      </div>
      <div className="agent-label"><b>OMIND Agent</b><span>{persona.label}</span></div>
    </div>
  );
}

function AnalysisView({ analysis, question, onCreateDecision }: { analysis: Analysis; question: string; onCreateDecision: () => void }) {
  return (
    <section className="analysis-section">
      <div className="result-header">
        <div><span className="eyebrow">DECISION ROOM</span><h2>{question}</h2></div>
        <div className="score"><b>{analysis.health}</b><span>DATA HEALTH</span></div>
      </div>
      <div className="metric-grid">
        <Metric label="ردیف" value={analysis.rows.toLocaleString('fa-IR')} />
        <Metric label="ستون" value={analysis.columns.length.toLocaleString('fa-IR')} />
        <Metric label="سیگنال" value={analysis.signals.length.toLocaleString('fa-IR')} />
        <Metric label="Confidence" value={`${analysis.confidence}%`} />
      </div>
      <div className="result-grid">
        <ResultCard title="Key Signals">
          {analysis.signals.length ? analysis.signals.map((signal) => (
            <div className="signal" key={signal.title}><span className={`priority ${signal.priority}`}>{signal.priority === 'high' ? 'HIGH' : signal.priority === 'medium' ? 'MED' : 'LOW'}</span><div><b>{signal.title}</b><p>{signal.detail}</p></div></div>
          )) : <p>سیگنال قابل توجهی پیدا نشد.</p>}
        </ResultCard>
        <ResultCard title="Top Priorities">{analysis.priorities.map((item) => <p className="bullet" key={item}>{item}</p>)}</ResultCard>
        <ResultCard title="Hypotheses">{analysis.hypotheses.map((item) => <p className="hypothesis" key={item}>{item}</p>)}</ResultCard>
        <ResultCard title="Recommended Actions">{analysis.actions.map((item, index) => <p className="action" key={item}><b>{index + 1}</b>{item}</p>)}</ResultCard>
      </div>
      <details className="trace" open>
        <summary>Reasoning Trace — 12 modules</summary>
        <div>{analysis.reasoning.steps.map((step) => <article key={step.module}><b>{step.module}</b><small>confidence {step.confidence}%</small>{step.output.map((output, index) => <p key={`${step.module}-${index}`}>{output}</p>)}</article>)}</div>
      </details>
      <button className="primary full" onClick={onCreateDecision}>تبدیل تحلیل به تصمیم ←</button>
      <div className="columns">
        <h3>Data Model</h3>
        {analysis.columns.map((column) => <div key={column.name}><b>{column.name}</b><span>{column.role}</span><small>{column.type} · missing {column.missing}</small></div>)}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="metric"><span>{label}</span><b>{value}</b></div>;
}

function ResultCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <article className="result-card"><span className="eyebrow">{title}</span><div>{children}</div></article>;
}

function Price({ title, price, detail, featured = false }: { title: string; price: string; detail: string; featured?: boolean }) {
  return <article className={`price ${featured ? 'featured' : ''}`}><span>{title}</span><b>{price}</b><small>تومان / ماه</small><p>{detail}</p><button className={featured ? 'primary' : 'ghost'}>به‌زودی</button></article>;
}
