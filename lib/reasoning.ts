export type ReasoningModule =
  | 'Intake' | 'Observe' | 'Decompose' | 'Pattern' | 'Hypothesis' | 'Causality'
  | 'Decision' | 'Scenarios' | 'Experiment' | 'Action' | 'Feedback' | 'Loop';

export type ReasoningStep = { module: ReasoningModule; input: string[]; output: string[]; confidence: number; trace: string };
export type SignalEvidence = { title: string; score: number; priority: 'high' | 'medium' | 'low'; evidence: string };
export type ReasoningResult = { steps: ReasoningStep[]; priorities: string[]; hypotheses: string[]; actions: string[]; confidence: number };

const MODULES: ReasoningModule[] = ['Intake','Observe','Decompose','Pattern','Hypothesis','Causality','Decision','Scenarios','Experiment','Action','Feedback','Loop'];
const PRIORITY_WEIGHT = { high: 30, medium: 15, low: 0 } as const;
const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(n)));

export function rankSignals(signals: SignalEvidence[]): SignalEvidence[] {
  return [...signals].map(s => ({ ...s, score: clamp(s.score) }))
    .sort((a, b) => {
      const sa = a.score + PRIORITY_WEIGHT[a.priority];
      const sb = b.score + PRIORITY_WEIGHT[b.priority];
      return sb - sa || b.score - a.score || a.title.localeCompare(b.title);
    });
}

export function runReasoning(signals: SignalEvidence[], question: string): ReasoningResult {
  const ranked = rankSignals(signals);
  const top = ranked.slice(0, 3);
  const confidence = clamp(45 + top.reduce((sum, s) => sum + s.score, 0) / Math.max(1, top.length) * 0.45);
  const steps: ReasoningStep[] = MODULES.map((module, i) => {
    const input = i === 0 ? [question || 'تحلیل داده'] : i === 1 ? top.map(s => `${s.title}: ${s.score}`) : top.map(s => s.evidence);
    const output =
      i === 0 ? [`هدف تحلیل: ${question || 'تحلیل داده'}`] :
      i === 1 ? (top.length ? top.map(s => `شاهد: ${s.title}`) : ['شاهد قابل اتکا یافت نشد.']) :
      i === 2 ? top.map(s => `مسئله: ${s.title}`) :
      i === 3 ? top.map(s => `الگوی قابل بررسی: ${s.evidence}`) :
      i === 4 ? top.map(s => `فرضیه قابل آزمون: ${s.evidence}`) :
      i === 5 ? ['همبستگی علت را اثبات نمی‌کند؛ برای ادعای علی باید مقایسه یا آزمایش معتبر انجام شود.'] :
      i === 6 ? (top.length ? [`اولویت تصمیم: ${top[0].title}`] : ['با شواهد فعلی تصمیم قطعی پیشنهاد نمی‌شود.']) :
      i === 7 ? ['محافظه‌کارانه: پایش', 'پایه: تغییر محدود', 'مداخله: اقدام همراه با کنترل'] :
      i === 8 ? ['آزمایش محدود با معیار موفقیت و بازه زمانی مشخص.'] :
      i === 9 ? ['مالک، deadline و outcome مورد انتظار ثبت شود.'] :
      i === 10 ? ['Outcome واقعی با Outcome مورد انتظار مقایسه شود.'] :
      ['یادگیری به چرخه تصمیم بعدی منتقل شود.'];
    return { module, input, output, confidence: clamp(confidence - Math.max(0, i - 4) * 2), trace: `${String(i + 1).padStart(2, '0')} ${module}` };
  });
  return {
    steps,
    priorities: top.map(s => s.title),
    hypotheses: top.map(s => `فرضیه قابل آزمون: ${s.evidence}`),
    actions: [
      top.length ? `سیگنال «${top[0].title}» را با اولویت ${top[0].priority} بررسی کن.` : 'ابتدا شواهد کافی برای اولویت‌بندی جمع‌آوری کن.',
      'یک آزمایش محدود با معیار موفقیت و بازه زمانی مشخص اجرا کن.',
      'نتیجه واقعی اقدام را ثبت کن تا در چرخه تصمیم بعدی استفاده شود.',
    ],
    confidence,
  };
}
