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
    <div className="auth-flow" aria-hidden="true">
      <div className="auth-flow-orb auth-flow-orb-a" />
      <div className="auth-flow-orb auth-flow-orb-b" />
      <svg className="auth-flow-svg" viewBox="0 0 1100 900" preserveAspectRatio="none" role="presentation">
        <defs>
          <linearGradient id="flowBlue" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#3b82f6" stopOpacity="0" />
            <stop offset="0.5" stopColor="#3b82f6" stopOpacity="0.65" />
            <stop offset="1" stopColor="#59b7ff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="flowMint" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#2fb38a" stopOpacity="0" />
            <stop offset="0.52" stopColor="#2fb38a" stopOpacity="0.45" />
            <stop offset="1" stopColor="#65d6b0" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g className="auth-flow-track">
          <path d="M-80 210 C 120 60, 260 430, 470 275 S 810 110, 1180 260" />
          <path d="M-100 470 C 170 315, 290 650, 540 505 S 850 300, 1180 470" />
          <path d="M-80 690 C 150 520, 360 790, 610 640 S 870 485, 1190 650" />
        </g>
        <g className="auth-flow-stream auth-flow-stream-blue">
          <circle r="4"><animateMotion dur="8s" repeatCount="indefinite" path="M-80 210 C 120 60, 260 430, 470 275 S 810 110, 1180 260" /></circle>
          <circle r="3"><animateMotion dur="10s" begin="-3s" repeatCount="indefinite" path="M-100 470 C 170 315, 290 650, 540 505 S 850 300, 1180 470" /></circle>
        </g>
        <g className="auth-flow-stream auth-flow-stream-mint">
          <circle r="3"><animateMotion dur="11s" begin="-5s" repeatCount="indefinite" path="M-80 690 C 150 520, 360 790, 610 640 S 870 485, 1190 650" /></circle>
        </g>
      </svg>
      <div className="auth-flow-caption"><span>DATA</span><i /> <span>SIGNAL</span><i /> <span>DECISION</span></div>
    </div>

    <section className="auth-card">
      <Link href="/" className="auth-brand"><span>O</span><b>OMIND</b></Link>
      <div className="auth-copy"><small>DECISION INTELLIGENCE</small><h1>از داده به تصمیم.</h1><p>به workspace خودت برگرد و آخرین تحلیل‌ها، تصمیم‌ها و نتایج را ادامه بده.</p></div>
      <form onSubmit={submit} className="auth-form">
        <label>ایمیل<input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required placeholder="you@company.com" /></label>
        <label>رمز عبور<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required placeholder="••••••••" /></label>
        {error && <div className="form-error">{error}</div>}
        <button className="primary auth-submit" disabled={busy}>{busy ? 'در حال ورود…' : 'ورود به OMIND'}</button>
      </form>
      <p className="auth-foot">حساب نداری؟ <Link href="/signup">ساخت حساب</Link></p>
    </section>

    <div className="auth-side"><span>01</span><b>See the signal.</b><p>OMIND داده را فقط نمایش نمی‌دهد؛ مسئله، اولویت و اقدام بعدی را کنار هم قرار می‌دهد.</p><div className="auth-side-metrics"><span>DATA →</span><b>SIGNAL</b><span>→ DECISION</span></div></div>
  </main>;
}
