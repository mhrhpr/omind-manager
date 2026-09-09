export const FIBONACCI = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89] as const;

export type ReasoningModule =
  | 'Intake' | 'Observe' | 'Decompose' | 'Pattern' | 'Hypothesis' | 'Causality'
  | 'Decision' | 'Scenarios' | 'Experiment' | 'Action' | 'Feedback' | 'Loop';

export type ReasoningStep = {
  module: ReasoningModule;
  input: string[];
  output: string[];
  confidence: number;
  trace: string;
};

export type SignalEvidence = {
  title: string;
  score: number;
  priority: 'high' | 'medium' | 'low';
  evidence: string;
};

export type ReasoningResult = {
  steps: ReasoningStep[];
  priorities: string[];
  hypotheses: string[];
  actions: string[];
  confidence: number;
};

const MODULES: ReasoningModule[] = ['Intake','Observe','Decompose','Pattern','Hypothesis','Causality','Decision','Scenarios','Experiment','Action','Feedback','Loop'];

function fibWeight(index: number) { return FIBONACCI[Math.min(index, FIBONACCI.length - 1)]; }
function clamp(n: number, min = 0, max = 100) { return Math.max(min, Math.min(max, Math.round(n))); }

export function rankSignals(signals: SignalEvidence[]): SignalEvidence[] {
  const base = [...signals]
    .map(s => ({ ...s, score: clamp(s.score) }))
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

  return base
    .map((s, i) => ({ ...s, score: clamp(s.score * fibWeight(Math.min(i + 1, 10)) / 13) }))
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
}

export function runReasoning(signals: SignalEvidence[], question: string): ReasoningResult {
  const ranked = rankSignals(signals);
  const top = ranked.slice(0, 3);
  const confidence = clamp(45 + top.reduce((sum, s) => sum + s.score, 0) / Math.max(1, top.length) * 0.45);
  const steps: ReasoningStep[] = MODULES.map((module, i) => {
    const input = i === 0 ? [question || 'تحلیل داده'] : i === 1 ? top.map(s => s.title) : top.slice(0, 2).map(s => s.evidence);
    const output = i === 2 ? top.map(s => `مسئله: ${s.title}`) : i === 3 ? top.map(s => `الگو: ${s.evidence}`) : i === 4 ? top.map(s => `فرضیه: ${s.evidence}`) : i === 5 ? ['نیازمند اعتبارسنجی علی؛ همبستگی به‌تنهایی علت را اثبات نمی‌کند.'] : i === 6 ? top.slice(0, 1).map(s => `اولویت تصمیم: ${s.title}`) : i === 7 ? ['سناریوی محافظه‌کارانه', 'سناریوی پایه', 'سناریوی مداخله'] : i === 8 ? ['یک آزمایش کوچک با معیار نتیجه مشخص تعریف کن.'] : i === 9 ? ['مالک اقدام مشخص شود و نتیجه مورد انتظار ثبت شود.'] : i === 10 ? ['نتیجه واقعی با نتیجه پیش‌بینی‌شده مقایسه شود.'] : ['یادگیری حاصل از نتیجه به چرخه تصمیم بعدی منتقل شود.'];
    return { module, input, output, confidence: clamp(confidence - Math.max(0, i - 4) * 2), trace: `${String(i + 1).padStart(2, '0')} ${module} | Fibonacci=${fibWeight(Math.min(i, 10))}` };
  });
  return {
    steps,
    priorities: top.map(s => s.title),
    hypotheses: top.map(s => `فرضیه قابل آزمون: ${s.evidence}`),
    actions: [
      top.length ? `سیگنال «${top[0].title}» را با اولویت ${top[0].priority} بررسی کن.` : 'ابتدا شواهد کافی برای اولویت‌بندی جمع‌آوری کن.',
      'یک آزمایش محدود با معیار موفقیت و بازه زمانی مشخص اجرا کن.',
      'Outcome واقعی را ثبت کن و اختلاف پیش‌بینی/نتیجه را به Decision Memory برگردان.',
    ],
    confidence,
  };
}

export function fibonacciSensitivity(values: number[]): { baseline: number; reordered: number } {
  const baseline = values.reduce((sum, value, i) => sum + value * fibWeight(i), 0);
  const reordered = [...values].reverse().reduce((sum, value, i) => sum + value * fibWeight(i), 0);
  return { baseline: Math.round(baseline), reordered: Math.round(reordered) };
}
