'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const LOOP = [
  ['01','Observe','چه چیزی تغییر کرده؟','سیگنال‌های واقعی را از داده پیدا کن.'],
  ['02','Prioritize','چه چیزی مهم‌تر است؟','اثر و شواهد را کنار هم ببین.'],
  ['03','Decide','حالا چه کنیم؟','یک اقدام مشخص با نتیجه مورد انتظار ثبت کن.'],
  ['04','Learn','چه چیزی یاد گرفتیم؟','نتیجه واقعی را برگردان و تصمیم بعدی را بهتر کن.'],
];

const SOLUTIONS = [
  ['مدیریت','Management','از KPI به تصمیم و اقدام.'],
  ['فروش','Sales','افت، رشد و فرصت‌های پنهان را سریع پیدا کن.'],
  ['مالی','Finance','انحراف‌ها و نقاط حساس را اولویت‌بندی کن.'],
  ['منابع انسانی','People','الگوهای مهم کارکنان را به اقدام تبدیل کن.'],
  ['عملیات','Operations','گلوگاه، تأخیر و ریسک عملیاتی را پیدا کن.'],
];

export default function LandingPage() {
  const [active, setActive] = useState(0);
  useEffect(() => { const id = window.setInterval(() => setActive(v => (v + 1) % LOOP.length), 2400); return () => window.clearInterval(id); }, []);
  return <main className="landing">
    <header className="site-nav">
      <Link className="wordmark" href="/"><span>O</span><strong>OMIND</strong></Link>
      <nav><a href="#product">محصول</a><a href="#solutions">کاربردها</a><a href="#how">جریان تصمیم</a><a href="#proof">چرا OMIND</a><a href="#pricing">قیمت</a></nav>
      <div className="nav-actions"><Link className="nav-login" href="/login">ورود</Link><Link className="nav-cta" href="/signup">شروع رایگان</Link></div>
    </header>

    <section className="hero" id="product">
      <div className="hero-copy">
        <div className="kicker"><i /> DECISION INTELLIGENCE FOR REAL WORK</div>
        <h1>داده را ببین.<br /><em>تصمیم را روشن کن.</em></h1>
        <p>OMIND فایل‌های کاری شما را به یک مسیر قابل فهم تبدیل می‌کند: <b>سیگنال → اولویت → تصمیم → اقدام → نتیجه</b>. بدون SQL، بدون dashboard overload و بدون حدس‌زدن.</p>
        <div className="hero-actions"><Link className="primary hero-primary" href="/signup">اولین تحلیل رایگان <span>←</span></Link><a className="hero-secondary" href="#how">دیدن محصول در ۹۰ ثانیه</a></div>
        <div className="trust-row"><span>CSV</span><span>XLSX</span><span>JSON</span><i /><small>۳ تحلیل رایگان · شروع در چند دقیقه · مناسب مدیران و تیم‌ها</small></div>
      </div>

      <div className="hero-visual" aria-label="OMIND decision workspace preview">
        <div className="glow" />
        <div className="float-chip chip-one">Signal · Sales ↓ 12.4%</div>
        <div className="float-chip chip-two">Decision readiness · 81%</div>
        <div className="decision-window">
          <div className="window-top"><span>OMIND / Decision Workspace</span><small>LIVE ANALYSIS · 024</small></div>
          <div className="window-body">
            <div className="mini-label">WHAT MATTERS NOW</div>
            <h3>کاهش فروش در منطقه شرق</h3>
            <p>فروش ۲۸٪ پایین‌تر از baseline ماه قبل است؛ بیشترین اثر از سه حساب کلیدی آمده. سیستم برای اقدام فوری آماده است.</p>
            <div className="signal-line"><span>Priority / Evidence</span><b>HIGH · 3 SIGNALS</b></div>
            <div className="window-grid"><div><small>HEALTH</small><strong>92 / 100</strong></div><div><small>CONFIDENCE</small><strong>81%</strong></div></div>
            <div className="window-action"><span>→</span><div><small>NEXT ACTION</small><b>سه حساب کلیدی را تا جمعه بازبینی کن</b></div></div>
          </div>
        </div>
      </div>
    </section>

    <section className="proof-strip" id="proof"><div><b>BI tells you what happened.</b><span>OMIND کمک می‌کند بفهمی چه چیزی مهم است، چه تصمیمی باید بگیری و بعداً آیا تصمیم درست بوده یا نه.</span></div><div className="proof-stats"><b>01</b><span>Evidence-first</span><b>02</b><span>Traceable</span><b>03</b><span>Outcome-aware</span></div></section>

    <section className="decision-intro"><div><small>THE PRODUCT IDEA</small><h2>پنل بیشتر نمی‌خواهی.<br />وضوح بیشتری می‌خواهی.</h2></div><p>OMIND یک لایه روی داده کاری می‌سازد تا مدیر از «چه اتفاقی افتاده؟» به «الان چه کاری انجام بدهم؟» برسد. خروجی نهایی یک نمودار زیبا نیست؛ یک تصمیم قابل دفاع و قابل پیگیری است.</p></section>

    <section className="flow-section" id="how"><div className="section-intro"><small>THE OMIND LOOP</small><h2>هر تحلیل باید جایی در دنیای واقعی تمام شود.</h2><p>چهار مرحله، یک مسیر واحد. از مشاهده تا یادگیری؛ با شواهد، trace و outcome در همان workspace.</p></div><div className="flow-grid">{LOOP.map(([n,t,d,x],i)=><div key={t} className={`flow-card ${i===active?'active':''}`}><small>{n}</small><b>{d}</b><span>{x}</span><div className="flow-dot" /><em>{t}</em></div>)}</div></section>

    <section className="solutions-section" id="solutions"><div className="section-intro"><small>DESIGNED AROUND BUSINESS QUESTIONS</small><h2>یک موتور. چند نوع تصمیم.</h2><p>OMIND را بر اساس ابزارهای داده نمی‌چینیم؛ بر اساس مسئله‌ی آدم‌هایی می‌چینیم که باید تصمیم بگیرند.</p></div><div className="solution-grid">{SOLUTIONS.map(([fa,en,desc],i)=><article className={`solution-card solution-${i}`} key={en}><span>0{i+1}</span><small>{en}</small><h3>{fa}</h3><p>{desc}</p><Link href="/signup">شروع با این سناریو <b>←</b></Link></article>)}</div></section>

    <section className="feature-section"><div className="feature-copy"><small>WHY IT IS DIFFERENT</small><h2>سیستم از تو جواب قشنگ نمی‌خواهد؛ جواب قابل دفاع می‌خواهد.</h2><p>هسته‌ی OMIND از داده و قواعد شروع می‌کند و AI را به‌عنوان لایه‌ی تقویتی استفاده می‌کند. هر جا شواهد کافی نیست، عدم‌قطعیت باید دیده شود، نه پنهان.</p><div className="feature-points"><div><b>01</b><span><strong>Evidence</strong> هر insight باید به محاسبه و داده برسد.</span></div><div><b>02</b><span><strong>Priority</strong> مسئله‌ها بر اساس اثر و شواهد مرتب می‌شوند.</span></div><div><b>03</b><span><strong>Decision Memory</strong> مسئله، تصمیم، outcome و lesson کنار هم می‌مانند.</span></div><div><b>04</b><span><strong>Learning Loop</strong> نتیجه واقعی تصمیم بعدی را بهتر می‌کند.</span></div></div></div><div className="architect-card"><div className="arch-head"><span>DECISION GRAPH</span><i>CONNECTED</i></div><div className="arch-node main">DATA</div><div className="arch-link l1" /><div className="arch-node n1">SIGNAL</div><div className="arch-link l2" /><div className="arch-node n2">PRIORITY</div><div className="arch-link l3" /><div className="arch-node n3">DECISION</div><div className="arch-link l4" /><div className="arch-node n4">OUTCOME</div></div></section>

    <section className="proof-section"><div className="proof-section-head"><div><small>DESIGNED FOR ADOPTION</small><h2>شروع ساده است. عمق بعداً می‌آید.</h2></div><p>اولین تجربه باید برای یک مدیر غیرمتخصص قابل فهم باشد؛ اما معماری درون محصول برای یک سازمان واقعی ساخته می‌شود.</p></div><div className="adoption-grid"><div><b>۰۱</b><strong>ورود</strong><span>یک فایل کاری واقعی.</span></div><div><b>۰۲</b><strong>فهم</strong><span>پروفایل، سلامت و سیگنال.</span></div><div><b>۰۳</b><strong>تصمیم</strong><span>اولویت و اقدام مشخص.</span></div><div><b>۰۴</b><strong>یادگیری</strong><span>نتیجه واقعی و حافظه سازمانی.</span></div></div></section>

    <section className="pricing-section" id="pricing"><div><small>START SMALL · SCALE WITH THE WORK</small><h2>سه تحلیل برای دیدن تفاوت.</h2><p>برای شروع نیاز به قرارداد پیچیده یا تیم داده نداری. وقتی تصمیم‌ها بیشتر شدند، workspace را بزرگ‌تر می‌کنی.</p></div><div className="pricing-actions"><Link className="primary" href="/signup">ساخت workspace رایگان <span>←</span></Link><span>۳ تحلیل · بدون کارت بانکی</span></div></section>

    <footer className="site-footer"><Link className="wordmark" href="/"><span>O</span><strong>OMIND</strong></Link><div><a href="#product">Product</a><a href="#solutions">Solutions</a><a href="#pricing">Pricing</a></div><span>Data × AI × Decisions · © 2026</span></footer>
  </main>;
}
