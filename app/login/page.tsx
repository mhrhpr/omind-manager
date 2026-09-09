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
      <div className="auth-copy"><small>DECISION INTELLIGENCE</small><h1>از داده به تصمیم.</h1><p>به workspace خودت برگرد و آخرین تحلیل‌ها، تصمیم‌ها و نتایج را ادامه بده.</p></div>
      <form onSubmit={submit} className="auth-form">
        <label>ایمیل<input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required placeholder="you@company.com" /></label>
        <label>رمز عبور<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required placeholder="••••••••" /></label>
        {error && <div className="form-error">{error}</div>}
        <button className="primary auth-submit" disabled={busy}>{busy ? 'در حال ورود…' : 'ورود به OMIND'}</button>
      </form>
      <p className="auth-foot">حساب نداری؟ <Link href="/signup">ساخت حساب</Link></p>
    </section>
    <div className="auth-side"><span>01</span><b>See the signal.</b><p>OMIND داده را فقط نمایش نمی‌دهد؛ مسئله، اولویت و اقدام بعدی را کنار هم قرار می‌دهد.</p></div>
  </main>;
}
