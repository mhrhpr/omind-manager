import '../styles.css'

export default function Home() {
  return <main className="page"><div className="brand">OMIND</div><p className="eyebrow">BUSINESS INTELLIGENCE, SIMPLIFIED</p><h1>فایل را بده.<br/><em>سؤال را پیدا کن.</em><br/>اقدام بعدی را بگیر.</h1><p className="lead">OMIND داده را می‌خواند، کیفیتش را می‌سنجد و مهم‌ترین سؤال‌ها و اقدام‌های بعدی را بیرون می‌کشد.</p><a className="button" href="#analyze">شروع تحلیل رایگان ←</a><section id="analyze" className="card"><h2>تحلیل‌گر OMIND</h2><p>نسخه‌ی اولیه آماده است. موتور تحلیل فایل در مرحله‌ی بعد به همین رابط متصل می‌شود.</p><div className="steps"><span>01 فایل</span><span>02 پروفایل</span><span>03 سؤال</span><span>04 تصمیم</span></div></section></main>
}
