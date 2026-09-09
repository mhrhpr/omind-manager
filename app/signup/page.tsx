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
      <div className="auth-copy"><small>START WITH A DECISION</small><h1>workspace خودت را بساز.</h1><p>فایل را وارد کن، سؤال بپرس و اولین تصمیم قابل پیگیری را ثبت کن.</p></div>
      <form onSubmit={submit} className="auth-form">
        <label>نام<input value={name} onChange={e => setName(e.target.value)} autoComplete="name" required placeholder="نام شما" /></label>
        <label>ایمیل کاری<input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required placeholder="you@company.com" /></label>
        <label>رمز عبور<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" minLength={8} required placeholder="حداقل ۸ کاراکتر" /></label>
        {error && <div className="form-error">{error}</div>}
        <button className="primary auth-submit" disabled={busy}>{busy ? 'در حال ساخت…' : 'ساخت workspace'}</button>
      </form>
      <p className="auth-foot">حساب داری؟ <Link href="/login">ورود</Link></p>
    </section>
    <div className="auth-side"><span>02</span><b>Keep the decision.</b><p>هر تحلیل به یک artifact قابل بازبینی تبدیل می‌شود: evidence، تصمیم، outcome و lesson.</p></div>
  </main>;
}
