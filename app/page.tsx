'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const LOOP = [
  ['01','Observe','چه چیزی تغییر کرده؟','سیگنال واقعی را از بین صدها ردیف داده بیرون بکش.'],
  ['02','Prioritize','چه چیزی مهم‌تر است؟','بدان کدام مسئله همین امروز ارزش توجه دارد.'],
  ['03','Decide','حالا چه کنیم؟','به یک اقدام مشخص، مالک مشخص و نتیجه مورد انتظار برس.'],
  ['04','Learn','چه چیزی یاد گرفتیم؟','نتیجه واقعی را برگردان تا تصمیم بعدی بهتر شود.'],
];

const SOLUTIONS = [
  ['مدیریت','Management','در چند دقیقه ببین کدام KPI واقعاً به تصمیم نیاز دارد.'],
  ['فروش','Sales','افت، فرصت و حساب‌های حساس را قبل از اینکه دیر شود پیدا کن.'],
  ['مالی','Finance','انحراف‌های مهم را از نویز جدا کن و اولویت بده.'],
  ['منابع انسانی','People','الگوهای مهم نیروی انسانی را به اقدام قابل پیگیری تبدیل کن.'],
  ['عملیات','Operations','گلوگاه، تأخیر و ریسک را از دل داده‌های روزمره پیدا کن.'],
];

export default function LandingPage() {
  const [active, setActive] = useState(0);
  useEffect(() => { const id = window.setInterval(() => setActive(v => (v + 1) % LOOP.length), 2300); return () => window.clearInterval(id); }, []);
  return <main className="landing">
    <header className="site-nav">
      <Link className="wordmark" href="/"><span>O</span><strong>OMIND</strong></Link>
      <nav><a href="#product">محصول</a><a href="#solutions">کاربردها</a><a href="#how">جریان تصمیم</a><a href="#proof">چرا OMIND</a><a href="#pricing">قیمت</a></nav>
      <div className="nav-actions"><Link className="nav-login" href="/login">ورود</Link><Link className="nav-cta" href="/signup">شروع رایگان</Link></div>
    </header>

    <section className="hero" id="product">
      <div className="hero-copy">
        <div className="kicker"><i /> DECISION INTELLIGENCE FOR REAL WORK</div>
        <h1>هر فایل، یک داستان دارد.<br /><em>OMIND می‌گوید حالا چه کنیم.</em></h1>
        <p>فایل کاری‌ات را وارد کن. OMIND از دل داده، <b>مهم‌ترین سیگنال</b> را پیدا می‌کند، آن را اولویت می‌دهد و به یک اقدام قابل پیگیری تبدیل می‌کند؛ بدون SQL و بدون غرق‌شدن در dashboard.</p>
        <div className="hero-actions"><Link className="primary hero-primary" href="/signup">فایل اولت را تحلیل کن <span>←</span></Link><a className="hero-secondary" href="#how">ببین OMIND چطور فکر می‌کند</a></div>
        <div className="trust-row"><span>CSV</span><span>XLSX</span><span>JSON</span><i /><small>۳ تحلیل رایگان · بدون کارت بانکی · شروع با داده واقعی خودت</small></div>
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
            <p>فروش ۲۸٪ پایین‌تر از baseline ماه قبل است؛ بیشترین اثر از سه حساب کلیدی آمده. سیستم شواهد کافی برای اقدام فوری دارد.</p>
            <div className="signal-line"><span>Priority / Evidence</span><b>HIGH · 3 SIGNALS</b></div>
            <div className="window-grid"><div><small>HEALTH</small><strong>92 / 100</strong></div><div><small>CONFIDENCE</small><strong>81%</strong></div></div>
            <div className="window-action"><span>→</span><div><small>NEXT ACTION</small><b>سه حساب کلیدی را تا جمعه بازبینی کن</b></div></div>
          </div>
        </div>
      </div>
    </section>

    <section className="proof-strip" id="proof"><div><b>گزارش به تو می‌گوید چه شد؛ تصمیم به تو می‌گوید چه کنی.</b><span>OMIND فاصله‌ی بین داده و اقدام را کوتاه می‌کند و نتیجه‌ی تصمیم را هم به سیستم برمی‌گرداند.</span></div><div className="proof-stats"><b>01</b><span>Evidence-first</span><b>02</b><span>Traceable</span><b>03</b><span>Outcome-aware</span></div></section>

    <section className="decision-intro"><div><small>THE PRODUCT IDEA</small><h2>داده بیشتر، الزاماً تصمیم بهتر نمی‌سازد.<br />وضوح می‌سازد.</h2></div><p>OMIND به جای اینکه تو را با ده‌ها نمودار تنها بگذارد، مسیر را از «چه اتفاقی افتاد؟» به «چه چیزی مهم است؟» و بعد «الان چه کنیم؟» می‌برد. خروجی اصلی یک chart نیست؛ یک تصمیم قابل دفاع است.</p></section>

    <section className="flow-section" id="how"><div className="section-intro"><small>THE OMIND LOOP</small><h2>از فایل خام تا تصمیمی که بتوانی فردا نتیجه‌اش را بسنجی.</h2><p>چهار مرحله، یک حلقه. هر مرحله چیزی به مرحله بعدی تحویل می‌دهد و outcome واقعی دوباره وارد حافظه تصمیم می‌شود.</p></div><div className="flow-grid">{LOOP.map(([n,t,d,x],i)=><div key={t} className={`flow-card ${i===active?'active':''}`}><small>{n}</small><b>{d}</b><span>{x}</span><div className="flow-dot" /><em>{t}</em></div>)}</div></section>

    <section className="solutions-section" id="solutions"><div className="section-intro"><small>DESIGNED AROUND BUSINESS QUESTIONS</small><h2>تو با «داده» وارد می‌شوی؛ با «مسئله» کار می‌کنی.</h2><p>OMIND خودش را با منوی ابزارها معرفی نمی‌کند؛ با سوال‌هایی که هر روز مدیران و تیم‌ها باید جواب بدهند.</p></div><div className="solution-grid">{SOLUTIONS.map(([fa,en,desc],i)=><article className={`solution-card solution-${i}`} key={en}><span>0{i+1}</span><small>{en}</small><h3>{fa}</h3><p>{desc}</p><Link href="/signup">این سناریو را امتحان کن <b>←</b></Link></article>)}</div></section>

    <section className="feature-section"><div className="feature-copy"><small>WHY IT IS DIFFERENT</small><h2>AI اینجا جواب را قشنگ نمی‌کند؛ تصمیم را قابل بررسی می‌کند.</h2><p>هسته‌ی OMIND از داده، قواعد و شواهد شروع می‌کند. وقتی شواهد کافی نیست، سیستم عدم‌قطعیت را نشان می‌دهد و به جای ساختن یک جواب خیالی، سؤال یا آزمایش بعدی پیشنهاد می‌کند.</p><div className="feature-points"><div><b>01</b><span><strong>Evidence</strong> هر insight باید به داده و محاسبه برسد.</span></div><div><b>02</b><span><strong>Priority</strong> مسئله‌ها بر اساس اثر، اهمیت و شواهد مرتب می‌شوند.</span></div><div><b>03</b><span><strong>Decision Memory</strong> مسئله، تصمیم، outcome و lesson کنار هم می‌مانند.</span></div><div><b>04</b><span><strong>Learning Loop</strong> نتیجه‌ی واقعی، تصمیم بعدی را بهتر می‌کند.</span></div></div></div><div className="architect-card"><div className="arch-head"><span>DECISION GRAPH</span><i>CONNECTED</i></div><div className="arch-node main">DATA</div><div className="arch-link l1" /><div className="arch-node n1">SIGNAL</div><div className="arch-link l2" /><div className="arch-node n2">PRIORITY</div><div className="arch-link l3" /><div className="arch-node n3">DECISION</div><div className="arch-link l4" /><div className="arch-node n4">OUTCOME</div></div></section>

    <section className="proof-section"><div className="proof-section-head"><div><small>DESIGNED FOR ADOPTION</small><h2>شروعش ساده است؛ عمقی که سازمانت لازم دارد از همان زیر ساخته شده.</h2></div><p>کاربر مجبور نیست Data Scientist باشد. ولی معماری محصول می‌تواند از یک فایل کوچک شروع کند و بعداً به حافظه‌ی تصمیم یک تیم تبدیل شود.</p></div><div className="adoption-grid"><div><b>۰۱</b><strong>ورود</strong><span>فایل کاری واقعی، نه demo data.</span></div><div><b>۰۲</b><strong>فهم</strong><span>سلامت داده، سیگنال و اولویت.</span></div><div><b>۰۳</b><strong>تصمیم</strong><span>اقدام، مالک و نتیجه مورد انتظار.</span></div><div><b>۰۴</b><strong>یادگیری</strong><span>Outcome و حافظه سازمانی.</span></div></div></section>

    <section className="pricing-section" id="pricing"><div><small>START SMALL · SCALE WITH THE WORK</small><h2>یک فایل واقعی بیاور؛ تفاوت را خودت ببین.</h2><p>۳ تحلیل رایگان برای شروع. بدون قرارداد، بدون کارت بانکی و بدون نیاز به ساختن data stack جدید.</p></div><div className="pricing-actions"><Link className="primary" href="/signup">اولین تحلیل رایگان <span>←</span></Link><span>۳ تحلیل · بدون کارت بانکی</span></div></section>

    <footer className="site-footer"><Link className="wordmark" href="/"><span>O</span><strong>OMIND</strong></Link><div><a href="#product">Product</a><a href="#solutions">Solutions</a><a href="#pricing">Pricing</a></div><span>Data × AI × Decisions · © 2026</span></footer>
  </main>;
}
