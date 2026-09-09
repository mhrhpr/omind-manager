'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_OMIND_API_URL?.replace(/\/$/, '');

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!API_BASE) return setError('آدرس API تنظیم نشده است.');
    setBusy(true); setError('');
    try {
      const response = await fetch(`${API_BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'ورود ناموفق بود.');
      localStorage.setItem('omind-session-token', data.access_token);
      localStorage.setItem('omind-workspace-id', data.workspace.id);
      localStorage.setItem('omind-workspace-token', data.access_token);
      window.location.href = '/app';
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'ورود ناموفق بود.'); }
    finally { setBusy(false); }
  }

  return <main className="auth-screen">
    <div className="auth-orbit" aria-hidden="true" />
    <section className="auth-card">
      <Link href="/" className="auth-brand"><span>O</span><b>OMIND</b></Link>
      <div className="auth-copy"><small>DECISION INTELLIGENCE</small><h1>دوباره وارد جریان تصمیم شو.</h1><p>به workspace برگرد و تحلیل‌ها، تصمیم‌ها و نتایج واقعی خودت را ادامه بده.</p></div>
      <form onSubmit={submit} className="auth-form">
        <label>ایمیل کاری<input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required placeholder="you@company.com" /></label>
        <label>رمز عبور<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required placeholder="••••••••" /></label>
        {error && <div className="form-error">{error}</div>}
        <button className="primary auth-submit" disabled={busy}>{busy ? 'در حال ورود…' : 'ورود به workspace'}</button>
      </form>
      <p className="auth-foot">حساب OMIND نداری؟ <Link href="/signup">ساخت workspace رایگان</Link></p>
    </section>
    <section className="auth-side" aria-label="OMIND decision flow">
      <span>01 · DECISION FLOW</span>
      <b>از داده خام تا تصمیم قابل پیگیری.</b>
      <p>OMIND فقط گزارش تولید نمی‌کند. شواهد را پیدا می‌کند، مسئله را اولویت‌بندی می‌کند و تصمیم را تا نتیجه واقعی دنبال می‌کند.</p>
      <div className="auth-flow" aria-hidden="true">
        <div className="auth-flow-orb auth-flow-orb-a" />
        <div className="auth-flow-orb auth-flow-orb-b" />
        <svg className="auth-flow-svg" viewBox="0 0 760 300" preserveAspectRatio="none">
          <defs>
            <linearGradient id="flowBlue" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#2d75ea" stopOpacity="0"/><stop offset=".45" stopColor="#2d75ea"/><stop offset="1" stopColor="#6da5ed" stopOpacity="0"/></linearGradient>
            <linearGradient id="flowMint" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#169d7b" stopOpacity="0"/><stop offset=".5" stopColor="#169d7b"/><stop offset="1" stopColor="#78cdb6" stopOpacity="0"/></linearGradient>
          </defs>
          <g className="auth-flow-track"><path d="M0 148 C110 64 188 230 294 148 S498 70 760 148"/><path d="M0 154 C130 228 228 72 342 154 S530 222 760 145"/><path d="M0 142 C120 106 212 194 330 142 S560 104 760 153"/></g>
        </svg>
        <div className="auth-flow-track" />
        <div className="auth-node"><span>DATA</span><b>داده</b></div>
        <div className="auth-node is-signal"><span>SIGNAL</span><b>سیگنال</b></div>
        <div className="auth-node is-decision"><span>DECISION</span><b>تصمیم</b></div>
        <div className="auth-node"><span>OUTCOME</span><b>نتیجه</b></div>
        <div className="auth-flow-caption"><i/> OMIND / DECISION OS <i/></div>
        <div className="auth-flow-note">EVIDENCE FIRST · TRACEABLE · LEARNING LOOP</div>
        <div className="auth-flow-badge">LIVE SYSTEM</div>
      </div>
      <div className="auth-side-metrics"><b>BUILT FOR WORK</b><span>CSV</span><span>XLSX</span><span>JSON</span><span>3 FREE ANALYSES</span></div>
    </section>
  </main>;
}
