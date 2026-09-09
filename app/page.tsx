'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const STEPS = [
  ['01','Observe','What changed?'],
  ['02','Prioritize','What matters now?'],
  ['03','Decide','What should we do?'],
  ['04','Learn','What did we learn?'],
];

export default function LandingPage() {
  const [active, setActive] = useState(0);
  useEffect(() => { const id = window.setInterval(() => setActive(v => (v + 1) % STEPS.length), 2200); return () => window.clearInterval(id); }, []);
  return <main className="landing">
    <header className="site-nav">
      <Link className="wordmark" href="/"><span>O</span><strong>OMIND</strong></Link>
      <nav><a href="#product">محصول</a><a href="#how">چطور کار می‌کند</a><a href="#trust">اعتماد</a><a href="#pricing">قیمت</a></nav>
      <div className="nav-actions"><Link className="nav-login" href="/login">ورود</Link><Link className="nav-cta" href="/signup">شروع رایگان</Link></div>
    </header>

    <section className="hero" id="product">
      <div className="hero-copy">
        <div className="kicker"><i /> DECISION INTELLIGENCE FOR TEAMS</div>
        <h1>فایل را بده.<br /><em>تصمیم را روشن کن.</em></h1>
        <p>OMIND داده‌های کاری را به <b>سیگنال، اولویت، تصمیم و اقدام بعدی</b> تبدیل می‌کند؛ بدون نیاز به SQL یا تیم Data Science.</p>
        <div className="hero-actions"><Link className="primary hero-primary" href="/signup">اولین تحلیل رایگان <span>←</span></Link><a className="hero-secondary" href="#how">دیدن جریان محصول</a></div>
        <div className="trust-row"><span>CSV</span><span>XLSX</span><span>JSON</span><i /> <small>۳ تحلیل رایگان · بدون کارت بانکی</small></div>
      </div>

      <div className="hero-visual" aria-label="OMIND decision workspace preview">
        <div className="glow" />
        <div className="float-chip chip-one">Revenue ↓ 12.4%</div>
        <div className="float-chip chip-two">Priority · High</div>
        <div className="decision-window">
          <div className="window-top"><span>OMIND / workspace</span><small>Analysis #024</small></div>
          <div className="window-body">
            <div className="mini-label">MAIN SIGNAL</div>
            <h3>کاهش فروش در منطقه شرق</h3>
            <p>فروش ۲۸٪ پایین‌تر از baseline ماه قبل است؛ بیشترین اثر از سه حساب کلیدی آمده.</p>
            <div className="signal-line"><span>اثر احتمالی</span><b>High</b></div>
            <div className="window-grid"><div><small>Evidence</small><strong>3 signals</strong></div><div><small>Confidence</small><strong>81%</strong></div></div>
            <div className="window-action"><span>→</span><div><small>NEXT ACTION</small><b>سه حساب را قبل از Friday بازبینی کن</b></div></div>
          </div>
        </div>
      </div>
    </section>

    <section className="proof-strip" id="trust"><div><b>BI ≠ Decision.</b><span>Dashboard به تو می‌گوید چه اتفاقی افتاده. OMIND کمک می‌کند تصمیم بگیری با آن چه کنی.</span></div><div className="proof-stats"><b>01</b><span>Evidence-first</span><b>02</b><span>Traceable</span><b>03</b><span>Outcome-aware</span></div></section>

    <section className="flow-section" id="how"><div className="section-intro"><small>THE OMIND LOOP</small><h2>هر تحلیل باید به یک تصمیم ختم شود.</h2><p>همان pipeline را از بارگذاری تا یادگیری نگه می‌داریم؛ فقط interface را برای انسان طراحی می‌کنیم، نه برای analyst.</p></div><div className="flow-grid">{STEPS.map(([n,t,d],i)=><div key={t} className={`flow-card ${i===active?'active':''}`}><small>{n}</small><b>{t}</b><span>{d}</span><div className="flow-dot" /></div>)}</div></section>

    <section className="feature-section"><div className="feature-copy"><small>BUILT FOR REAL WORK</small><h2>نه Chatbot. نه Dashboard دیگر.</h2><p>OMIND بین داده خام و تصمیم مدیریتی یک لایه reasoning قابل بررسی می‌سازد.</p><div className="feature-points"><div><b>01</b><span><strong>Evidence</strong> هر claim به داده و محاسبه متصل است.</span></div><div><b>02</b><span><strong>Uncertainty</strong> وقتی شواهد کافی نیست، سیستم به‌جای حدس، سؤال پیشنهاد می‌دهد.</span></div><div><b>03</b><span><strong>Memory</strong> تصمیم، outcome و lesson در workspace باقی می‌ماند.</span></div></div></div><div className="architect-card"><div className="arch-head"><span>Decision Graph</span><i>LIVE</i></div><div className="arch-node main">DATA</div><div className="arch-link l1" /><div className="arch-node n1">SIGNAL</div><div className="arch-link l2" /><div className="arch-node n2">PRIORITY</div><div className="arch-link l3" /><div className="arch-node n3">DECISION</div><div className="arch-link l4" /><div className="arch-node n4">OUTCOME</div></div></section>

    <section className="pricing-section" id="pricing"><div><small>START SMALL</small><h2>سه تحلیل برای دیدن تفاوت.</h2><p>هیچ قرارداد یا کارت بانکی برای شروع لازم نیست.</p></div><Link className="primary" href="/signup">ساخت workspace <span>←</span></Link></section>

    <footer className="site-footer"><Link className="wordmark" href="/"><span>O</span><strong>OMIND</strong></Link><span>Data × AI × Decisions</span><span>© 2026 OMIND</span></footer>
  </main>;
}
