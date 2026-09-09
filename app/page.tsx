'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const LOOP = [
  ['01','Observe','اول بفهم چه چیزی تغییر کرده','سیگنال واقعی را از نویز جدا می‌کنیم.'],
  ['02','Prioritize','بعد می‌فهمیم چه چیزی مهم‌تر است','اثر، اهمیت و کیفیت شواهد را کنار هم می‌گذاریم.'],
  ['03','Decide','بعد تصمیم را قابل اجرا می‌کنیم','تصمیم، مالک، آزمایش و نتیجه‌ی مورد انتظار مشخص می‌شود.'],
  ['04','Learn','و در آخر یاد می‌گیریم','Outcome واقعی برمی‌گردد تا حافظه‌ی سازمانی ساخته شود.'],
];

const SOLUTIONS = [
  ['01','MANAGEMENT','مدیریت','بدان امروز کدام KPI واقعاً نیاز به تصمیم دارد.'],
  ['02','SALES','فروش','افت، فرصت و حساب‌های حساس را زودتر پیدا کن.'],
  ['03','FINANCE','مالی','انحراف‌های مهم را از نویز جدا و اولویت‌بندی کن.'],
  ['04','PEOPLE','منابع انسانی','الگوهای مهم نیروی انسانی را به اقدام تبدیل کن.'],
  ['05','OPERATIONS','عملیات','گلوگاه، تأخیر و ریسک را از داده‌ی روزمره بیرون بکش.'],
];

export default function LandingPage() {
  const [active, setActive] = useState(0);
  useEffect(() => { const id = window.setInterval(() => setActive(v => (v + 1) % LOOP.length), 2500); return () => window.clearInterval(id); }, []);

  return <main className="landing-vnext">
    <header className="ln-nav">
      <Link href="/" className="ln-brand"><span className="ln-brand-mark">O</span><span className="ln-brand-copy"><strong>OMIND</strong><span>Decision Intelligence</span></span></Link>
      <nav className="ln-nav-links"><a href="#product">محصول</a><a href="#solutions">کاربردها</a><a href="#loop">جریان تصمیم</a><a href="#proof">اعتماد</a><a href="#pricing">قیمت</a></nav>
      <div className="ln-nav-actions"><Link href="/login" className="ln-login">ورود</Link><Link href="/signup" className="ln-cta">شروع رایگان</Link></div>
    </header>

    <section className="ln-hero" id="product">
      <div className="ln-hero-copy">
        <span className="ln-kicker"><i/> DECISION INTELLIGENCE FOR REAL WORK</span>
        <h1>از داده عبور کن.<br/><em>به تصمیم برس.</em></h1>
        <p>OMIND فایل کاری تو را می‌خواند، <b>مهم‌ترین سیگنال</b> را پیدا می‌کند، آن را اولویت می‌دهد و به اقدام بعدی وصل می‌کند؛ بعد نتیجه‌ی واقعی تصمیم را دوباره وارد حافظه می‌کند.</p>
        <div className="ln-hero-actions"><Link href="/signup" className="ln-primary">اولین فایل را تحلیل کن <span>←</span></Link><a href="#loop" className="ln-secondary">ببین چطور کار می‌کند</a></div>
        <div className="ln-proof-mini"><span>CSV</span><span>XLSX</span><span>JSON</span><small>۳ تحلیل رایگان · بدون کارت بانکی · با داده‌ی واقعی خودت</small></div>
      </div>

      <div className="ln-hero-product" aria-label="OMIND product preview">
        <div className="ln-product-halo" />
        <div className="ln-float-chip ln-chip-one">Signal <b>Sales ↓ 12.4%</b></div>
        <div className="ln-float-chip ln-chip-two">Decision readiness <b>81%</b></div>
        <div className="ln-product-shell">
          <div className="ln-window-bar"><div className="ln-window-dots"><i/><i/><i/></div><span className="ln-window-meta">OMIND / DECISION WORKSPACE · LIVE</span></div>
          <div className="ln-product-main">
            <aside className="ln-product-side"><div className="ln-side-title">WORKSPACE</div><div className="ln-side-item active">⌂ <span>نمای کلی</span></div><div className="ln-side-item">＋ <span>تحلیل جدید</span></div><div className="ln-side-item">◫ <span>تحلیل‌ها</span><b>12</b></div><div className="ln-side-item">◇ <span>تصمیم‌ها</span><b>3</b></div><div className="ln-side-title" style={{marginTop:18}}>MEMORY</div><div className="ln-side-item">✓ <span>کارهای من</span></div><div className="ln-side-item">∞ <span>حافظه تصمیم</span></div></aside>
            <div className="ln-product-content">
              <div className="ln-product-top"><div><small>TODAY’S FOCUS</small><h3>کاهش فروش در منطقه شرق</h3><p>فروش این ناحیه ۲۸٪ پایین‌تر از baseline است و سه حساب کلیدی بیشترین اثر را دارند.</p></div><span className="ln-status">● LIVE</span></div>
              <div className="ln-score-row"><div className="ln-score"><small>DATA HEALTH</small><b>92</b></div><div className="ln-score"><small>CONFIDENCE</small><b>81%</b></div><div className="ln-score"><small>OPEN DECISIONS</small><b>3</b></div></div>
              <div className="ln-signal-card"><div className="ln-signal-head"><span>WHAT MATTERS</span><b>HIGH · 3 SIGNALS</b></div><div className="ln-signal-title">سه حساب کلیدی عامل اصلی افت هستند</div><div className="ln-signal-text">قبل از تغییر broad pricing، این segment را بررسی کن؛ شواهد فعلی برای یک intervention محدود کافی است.</div><div className="ln-bar"><i/></div></div>
              <div className="ln-next-card"><small>NEXT ACTION</small><b>سه حساب کلیدی را تا جمعه بازبینی کن و نتیجه را در Decision Memory ثبت کن.</b><div className="ln-next-meta"><span>OWNER · SALES</span><span>EXPERIMENT</span><span>FOLLOW-UP</span></div></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section className="ln-strip"><div><b>گزارش نیست؛ سیستم تصمیم است.</b><span>OMIND فاصله‌ی بین داده و اقدام را کم می‌کند.</span></div><div><strong>Evidence-first</strong><small>هر insight به داده وصل است.</small></div><div><strong>Traceable</strong><small>مسیر reasoning قابل مشاهده است.</small></div><div><strong>Outcome-aware</strong><small>نتیجه به حافظه برمی‌گردد.</small></div></section>

    <section className="ln-section" id="loop"><div className="ln-section-head"><div><span className="ln-eyebrow">THE OMIND LOOP</span><h2>یک حلقه‌ی واقعی برای تصمیم‌گیری.</h2><p>از فایل خام شروع می‌کنیم و به تصمیمی می‌رسیم که فردا می‌توانی نتیجه‌اش را بسنجی.</p></div><span className="ln-section-note">هر مرحله خروجی مشخصی به مرحله بعد می‌دهد؛ سیستم برای زیبایی dashboard طراحی نشده، برای باز کردن bottleneck تصمیم طراحی شده است.</span></div><div className="ln-loop">{LOOP.map(([n,t,d,x],i)=><article key={t} className={`ln-loop-card ln-step-${i+1}`}><strong>{n}</strong><h3>{d}</h3><p>{x}</p><span>{t}</span></article>)}</div></section>

    <section className="ln-section" id="solutions"><div className="ln-section-head"><div><span className="ln-eyebrow">BUSINESS QUESTIONS</span><h2>کاربر ابزار نمی‌خرد؛ جواب می‌خواهد.</h2><p>به‌جای فهرست قابلیت‌ها، سناریوهایی را نشان می‌دهیم که تیم‌ها واقعاً برایشان تصمیم می‌گیرند.</p></div></div><div className="ln-solutions">{SOLUTIONS.map(([n,en,fa,desc],i)=><article key={en} className={`ln-solution ln-sol-${i+1}`}><small>{n} · {en}</small><h3>{fa}</h3><p>{desc}</p><Link href="/signup">این سناریو را امتحان کن ←</Link></article>)}</div></section>

    <section className="ln-section" id="proof"><div className="ln-section-head"><div><span className="ln-eyebrow">TRUST & CLARITY</span><h2>اعتماد را با حرف نمی‌سازیم؛ با trace می‌سازیم.</h2><p>معماری OMIND از شواهد و قواعد شروع می‌شود. هرجا داده کافی نباشد، عدم‌قطعیت باید دیده شود، نه اینکه با متن قانع‌کننده پوشانده شود.</p></div></div><div className="ln-proof"><div className="ln-proof-main"><span className="ln-eyebrow">WHY IT FEELS DIFFERENT</span><h3>محصول باید به کاربر دلیل بدهد، نه فقط جواب.</h3><p>در هر تحلیل، داده، سیگنال، اولویت، تصمیم و outcome در یک زنجیره قرار می‌گیرند. این ساختار است که به‌مرور Decision Memory می‌سازد.</p><div className="ln-proof-grid"><div className="ln-proof-item"><b>01</b><strong>Evidence</strong><span>ریشه‌ی هر insight در داده و محاسبه مشخص است.</span></div><div className="ln-proof-item"><b>02</b><strong>Priority</strong><span>مهم‌ترین مسئله قبل از هر action مشخص می‌شود.</span></div><div className="ln-proof-item"><b>03</b><strong>Memory</strong><span>Outcome و Lesson برای تصمیم‌های بعدی می‌مانند.</span></div></div></div><div className="ln-proof-aside"><div className="ln-quote"><span className="ln-eyebrow">PRODUCT PRINCIPLE</span><p>«وقتی شواهد ضعیف است، OMIND باید uncertainty را زیاد کند؛ نه اعتمادبه‌نفس متن را.»</p><footer>Evidence-first decision design</footer></div><div className="ln-trust-row"><div className="ln-trust"><strong>01</strong><span>Readable trace</span></div><div className="ln-trust"><strong>02</strong><span>Real workspace</span></div><div className="ln-trust"><strong>03</strong><span>Decision loop</span></div><div className="ln-trust"><strong>04</strong><span>Outcome memory</span></div></div></div></div></section>

    <section className="ln-section"><div className="ln-architecture"><div className="ln-arch-copy"><span className="ln-eyebrow">UNDER THE SURFACE</span><h3>یک لایه UI نیست؛ یک سیستم تصمیم است.</h3><p>کاربر می‌تواند با یک فایل شروع کند؛ معماری زیر آن برای context، data، decisions و organizational memory ساخته می‌شود.</p><div className="ln-arch-points"><div className="ln-arch-point"><b>01</b><div><strong>Data context</strong><span>فایل، schema، health و relationshipهای قابل فهم.</span></div></div><div className="ln-arch-point"><b>02</b><div><strong>Reasoning core</strong><span>Observe → Decompose → Pattern → Hypothesis → Decision.</span></div></div><div className="ln-arch-point"><b>03</b><div><strong>Learning loop</strong><span>Expected → Actual → Error → Lesson.</span></div></div></div></div><div className="ln-arch-visual"><div className="ln-graph-grid"/><span className="ln-arch-badge">SYSTEM CONNECTED</span><div className="ln-graph-shell"><div className="ln-graph-line"/>{[['DATA','فایل واقعی','n1'],['SIGNAL','نشانه','n2'],['PRIORITY','اهمیت','n3'],['DECISION','تصمیم','n4'],['OUTCOME','نتیجه','n5'],['MEMORY','حافظه','n6']].map(([a,b,c])=><div key={a} className={`ln-node ${c}`}><small>{a}</small><strong>{b}</strong></div>)}</div></div></div></section>

    <section className="ln-section" id="pricing"><div className="ln-pricing"><div><span className="ln-eyebrow">START SMALL · SCALE WITH THE WORK</span><h3>با یک فایل شروع کن.</h3><p>۳ تحلیل رایگان. بعد، ظرفیت بیشتر را بر اساس حجم واقعی کار فعال کن.</p></div><div className="ln-pricing-side"><Link href="/signup" className="ln-primary">تحلیل اول رایگان ←</Link><span>بدون کارت بانکی · بدون قرارداد</span></div></div></section>

    <footer className="ln-footer"><Link href="/" className="ln-brand"><span className="ln-brand-mark">O</span><span className="ln-brand-copy"><strong>OMIND</strong><span>Data × AI × Decisions</span></span></Link><nav><a href="#product">Product</a><a href="#solutions">Solutions</a><a href="#proof">Trust</a><a href="#pricing">Pricing</a></nav><small>© 2026 OMIND</small></footer>
  </main>;
}
