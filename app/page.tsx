'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const LOOP = [
  ['01','Observe','چه چیزی واقعاً تغییر کرده؟','سیگنال را از نویز جدا کن.'],
  ['02','Prioritize','کدام مسئله مهم‌تر است؟','اثر و کیفیت شواهد را وزن بده.'],
  ['03','Decide','الان چه تصمیمی قابل دفاع است؟','تصمیم را به اقدام و مالک وصل کن.'],
  ['04','Learn','نتیجه چه چیزی به ما یاد داد؟','Outcome را وارد حافظه تصمیم کن.'],
];

const QUESTS = [
  {k:'SALES · QUEST 01', title:'فروش شرق ۲۸٪ افت کرده. قدم بعدی چیست؟', clue:'سه حساب کلیدی بیشترین اثر را دارند؛ داده برای تغییر broad pricing هنوز کافی نیست.', options:['قیمت همه را کاهش بده','سه حساب را بررسی و یک intervention محدود اجرا کن','فعلاً کاری نکن'], answer:1, why:'شواهد فعلی برای مداخله محدود کافی است، نه تغییر سراسری.'},
  {k:'PEOPLE · QUEST 02', title:'غیبت یک تیم بالا رفته. دنبال چه چیزی می‌گردی؟', clue:'افزایش غیبت فقط در یک شیفت دیده می‌شود و با overtime هم‌زمان شده است.', options:['کل شرکت را بازطراحی کن','شیفت و overtime را به‌عنوان فرضیه بررسی کن','افراد را مقصر بدان'], answer:1, why:'الگوی موضعی یک فرضیه مشخص می‌سازد؛ قبل از intervention گسترده باید evidence جمع شود.'},
  {k:'OPS · QUEST 03', title:'زمان تحویل بالا رفته. اولین سؤال چیست؟', clue:'تاخیر فقط در دو مسیر و در روزهای پرترافیک دیده می‌شود.', options:['ظرفیت همه مسیرها را دو برابر کن','اثر مسیر و ترافیک را جدا کن','شاخص را حذف کن'], answer:1, why:'اول باید bottleneck واقعی را isolate کرد؛ افزایش ظرفیت سراسری زود است.'},
];

export default function LandingPage() {
  const [activeLoop, setActiveLoop] = useState(0);
  const [quest, setQuest] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(720);

  useEffect(() => {
    const id = window.setInterval(() => setActiveLoop(v => (v + 1) % LOOP.length), 2800);
    return () => window.clearInterval(id);
  }, []);

  const q = QUESTS[quest];
  const choose = (index: number) => {
    if (picked !== null) return;
    setPicked(index);
    setScore(v => v + (index === q.answer ? 80 : -35));
  };
  const nextQuest = () => { setQuest(v => (v + 1) % QUESTS.length); setPicked(null); };

  return <main className="landing-vnext">
    <section className="ln-hero" id="product">
      <header className="ln-nav">
        <Link href="/" className="ln-brand"><span className="ln-brand-mark">O</span><span className="ln-brand-copy"><strong>OMIND</strong><span>Decision Intelligence</span></span></Link>
        <nav className="ln-nav-links"><a href="#product">محصول</a><a href="#quest">Decision Quest</a><a href="#loop">جریان تصمیم</a><a href="#architecture">سیستم</a><a href="#pricing">قیمت</a></nav>
        <div className="ln-nav-actions"><Link href="/login" className="ln-login">ورود</Link><Link href="/signup" className="ln-cta">شروع رایگان</Link></div>
      </header>

      <div className="ln-hero-grid">
        <div className="ln-hero-copy">
          <span className="ln-kicker"><i/> DECISION INTELLIGENCE FOR REAL WORK</span>
          <h1>داده را <em>بازی کن.</em><br/>تصمیم را بساز.</h1>
          <p>OMIND فقط به تو نمی‌گوید «چه اتفاقی افتاده». تو را وادار می‌کند <b>بفهمی، سؤال بپرسی، فرضیه بسازی و تصمیم بگیری</b>؛ بعد نتیجه‌ی واقعی را به حافظه‌ی سازمان برمی‌گرداند.</p>
          <div className="ln-hero-actions"><Link href="/signup" className="ln-primary">اولین فایل را تحلیل کن <span>←</span></Link><Link href="/app" className="ln-secondary ln-workspace-link">ورود به Dashboard ↗</Link></div>
          <div className="ln-proof-mini"><span>CSV</span><span>XLSX</span><span>JSON</span><small>۳ تحلیل رایگان · داده‌ی واقعی خودت · بدون کارت بانکی</small></div>
          <div className="ln-hero-tagline"><b>Context → Curiosity → Evidence → Decision → Learning</b></div>
        </div>

        <div className="ln-hero-product" aria-label="OMIND live product preview">
          <div className="ln-product-halo" />
          <div className="ln-float-chip ln-chip-one">SIGNAL <b>Sales ↓ 28%</b></div>
          <div className="ln-float-chip ln-chip-two">COGNITIVE SCORE <b>{score}</b></div>
          <div className="ln-product-shell">
            <div className="ln-window-bar"><div className="ln-window-dots"><i/><i/><i/></div><span className="ln-window-meta">OMIND / DECISION WORKSPACE · LIVE</span><Link href="/app" className="ln-live-open">OPEN WORKSPACE ↗</Link></div>
            <div className="ln-product-main">
              <aside className="ln-product-side"><div className="ln-side-title">WORKSPACE</div><div className="ln-side-item active">⌂ <span>نمای کلی</span></div><div className="ln-side-item">＋ <span>تحلیل جدید</span></div><div className="ln-side-item">◫ <span>تحلیل‌ها</span><b>12</b></div><div className="ln-side-item">◇ <span>تصمیم‌ها</span><b>3</b></div><div className="ln-side-title" style={{marginTop:18}}>MEMORY</div><div className="ln-side-item">✓ <span>کارهای من</span></div><div className="ln-side-item">∞ <span>حافظه تصمیم</span></div></aside>
              <div className="ln-product-content">
                <div className="ln-product-top"><div><small>TODAY’S FOCUS</small><h3>کاهش فروش در منطقه شرق</h3><p>یک bottleneck واقعی پیدا شده؛ اکنون نوبت تصمیم است، نه گزارش بیشتر.</p></div><span className="ln-status">● LIVE</span></div>
                <div className="ln-score-row"><div className="ln-score"><small>DATA HEALTH</small><b>92</b></div><div className="ln-score"><small>CONFIDENCE</small><b>81%</b></div><div className="ln-score"><small>OPEN DECISIONS</small><b>3</b></div></div>
                <div className="ln-signal-card"><div className="ln-signal-head"><span>WHAT MATTERS</span><b>HIGH · 3 SIGNALS</b></div><div className="ln-signal-title">سه حساب کلیدی عامل اصلی افت هستند</div><div className="ln-signal-text">قبل از broad pricing، یک intervention محدود روی همین segment تست کن.</div><div className="ln-bar"><i/></div></div>
                <div className="ln-next-card"><small>NEXT ACTION</small><b>سه حساب کلیدی را بررسی کن، آزمایش را تعریف کن و outcome را ثبت کن.</b><div className="ln-next-meta"><span>OWNER · SALES</span><span>EXPERIMENT</span><span>MEMORY</span></div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section className="ln-section ln-quest-section" id="quest">
      <div className="ln-quest-head"><div><span className="ln-eyebrow">DECISION QUEST · COGNITIVE PLAYGROUND</span><h2>ببین مغزت با داده چه می‌کند.</h2><p>یک سناریو، چند مسیر. پاسخ سریع مهم نیست؛ کیفیت استدلال مهم است.</p></div><div className="ln-player"><span>DECISION XP</span><b>{score}</b><small>+80 برای evidence درست</small></div></div>
      <div className="ln-quest-board">
        <div className="ln-quest-story"><div className="ln-story-top"><span>{q.k}</span><span>ROUND {quest + 1} / {QUESTS.length}</span></div><div className="ln-story-icon">?</div><h3>{q.title}</h3><p>{q.clue}</p><div className="ln-clue-line"><i/><span>سرنخ را کامل بخوان. بعد تصمیم بگیر.</span></div></div>
        <div className="ln-quest-options">{q.options.map((o,i)=><button key={o} className={`ln-quest-option ${picked !== null ? (i === q.answer ? 'correct' : i === picked ? 'wrong' : 'muted') : ''}`} onClick={() => choose(i)}><span>0{i+1}</span><b>{o}</b>{picked !== null && i === q.answer ? <em>✓</em> : null}</button>)}{picked !== null && <div className={`ln-quest-feedback ${picked === q.answer ? 'good' : 'bad'}`}><b>{picked === q.answer ? 'Good call.' : 'Too early.'}</b><span>{q.why}</span><button onClick={nextQuest}>سناریوی بعدی →</button></div>}</div>
      </div>
    </section>

    <section className="ln-section" id="loop"><div className="ln-section-head"><div><span className="ln-eyebrow">THE OMIND LOOP</span><h2>هر تصمیم یک داستان دارد.</h2><p>کاربر فقط جواب نهایی را نمی‌بیند؛ مسیر رسیدن به آن را تجربه می‌کند.</p></div><span className="ln-section-note">Observation سؤال می‌سازد. سؤال فرضیه می‌سازد. فرضیه به آزمایش می‌رسد. Outcome داستان را کامل می‌کند.</span></div><div className="ln-loop">{LOOP.map(([n,t,d,x],i)=><button key={t} className={`ln-loop-card ln-step-${i+1} ${activeLoop===i ? 'is-active' : ''}`} onClick={() => setActiveLoop(i)}><strong>{n}</strong><h3>{d}</h3><p>{x}</p><span>{t}</span><i/></button>)}</div></section>

    <section className="ln-section" id="architecture"><div className="ln-architecture"><div className="ln-arch-copy"><span className="ln-eyebrow">UNDER THE SURFACE</span><h3>بازی روی سطح است؛ سیستم زیر آن واقعی است.</h3><p>داده، reasoning و memory سه لایه‌ای هستند که باعث می‌شوند تجربه‌ی playful به محصول enterprise تبدیل شود.</p><div className="ln-arch-points"><div className="ln-arch-point"><b>01</b><div><strong>Context Engine</strong><span>فایل، schema، health و context کاری.</span></div></div><div className="ln-arch-point"><b>02</b><div><strong>Reasoning Core</strong><span>Observe → Pattern → Hypothesis → Decision.</span></div></div><div className="ln-arch-point"><b>03</b><div><strong>Decision Memory</strong><span>Expected → Actual → Error → Lesson.</span></div></div></div><Link href="/app" className="ln-system-button">Dashboard و سیستم را باز کن ↗</Link></div><div className="ln-arch-visual"><div className="ln-graph-grid"/><span className="ln-arch-badge">SYSTEM CONNECTED</span><div className="ln-graph-shell"><div className="ln-graph-line"/>{[['DATA','فایل واقعی','n1'],['SIGNAL','نشانه','n2'],['PRIORITY','اهمیت','n3'],['DECISION','تصمیم','n4'],['OUTCOME','نتیجه','n5'],['MEMORY','حافظه','n6']].map(([a,b,c])=><div key={a} className={`ln-node ${c}`}><small>{a}</small><strong>{b}</strong></div>)}</div></div></div></section>

    <section className="ln-section" id="pricing"><div className="ln-pricing"><div><span className="ln-eyebrow">START SMALL · LEARN FAST</span><h3>با یک فایل شروع کن.</h3><p>۳ تحلیل رایگان. اول value را تجربه کن، بعد ظرفیت را بزرگ کن.</p></div><div className="ln-pricing-side"><Link href="/signup" className="ln-primary">تحلیل اول رایگان ←</Link><span>بدون قرارداد · بدون کارت</span></div></div></section>
    <footer className="ln-footer"><Link href="/" className="ln-brand"><span className="ln-brand-mark">O</span><span className="ln-brand-copy"><strong>OMIND</strong><span>Data × AI × Decisions</span></span></Link><nav><a href="#product">Product</a><a href="#quest">Quest</a><a href="#architecture">System</a><a href="#pricing">Pricing</a></nav><small>© 2026 OMIND</small></footer>
  </main>;
}
