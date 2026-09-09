'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_OMIND_API_URL?.replace(/\/$/, '');

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!API_BASE) return setError('آدرس API تنظیم نشده است.');
    setBusy(true); setError('');
    try {
      const response = await fetch(`${API_BASE}/auth/signup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'ساخت حساب ناموفق بود.');
      localStorage.setItem('omind-session-token', data.access_token);
      localStorage.setItem('omind-workspace-id', data.workspace.id);
      localStorage.setItem('omind-workspace-token', data.access_token);
      window.location.href = '/app';
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'ساخت حساب ناموفق بود.'); }
    finally { setBusy(false); }
  }

  return <main className="auth-screen">
    <div className="auth-orbit" aria-hidden="true" />
    <section className="auth-card">
      <Link href="/" className="auth-brand"><span>O</span><b>OMIND</b></Link>
      <div className="auth-copy"><small>START WITH A DECISION</small><h1>workspace تصمیم خودت را بساز.</h1><p>یک حساب بساز، فایل اول را وارد کن و اولین تصمیم قابل پیگیری را در چند دقیقه ثبت کن.</p></div>
      <form onSubmit={submit} className="auth-form">
        <label>نام<input value={name} onChange={e => setName(e.target.value)} autoComplete="name" required placeholder="نام شما" /></label>
        <label>ایمیل کاری<input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required placeholder="you@company.com" /></label>
        <label>رمز عبور<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" minLength={8} required placeholder="حداقل ۸ کاراکتر" /></label>
        {error && <div className="form-error">{error}</div>}
        <button className="primary auth-submit" disabled={busy}>{busy ? 'در حال ساخت workspace…' : 'ساخت workspace رایگان'}</button>
      </form>
      <p className="auth-foot">حساب داری؟ <Link href="/login">ورود به workspace</Link></p>
    </section>
    <section className="auth-side" aria-label="OMIND decision flow">
      <span>02 · START WITH EVIDENCE</span>
      <b>فضای کاری که تصمیم‌ها را فراموش نمی‌کند.</b>
      <p>هر تحلیل یک ردپا می‌سازد: داده، شواهد، تصمیم، اقدام، نتیجه و چیزی که تیم از آن یاد گرفته است.</p>
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
        <div className="auth-flow-note">EVIDENCE → DECISION → OUTCOME → LEARNING</div>
        <div className="auth-flow-badge">READY</div>
      </div>
      <div className="auth-side-metrics"><b>FREE START</b><span>۳ تحلیل</span><span>بدون کارت بانکی</span><span>داده‌محور</span></div>
    </section>
  </main>;
}
