import { describe, expect, it } from 'vitest';
import { rankSignals, runReasoning } from './reasoning';

describe('OMIND reasoning core', () => {
  it('returns all 12 executable reasoning modules and carries the question into Intake', () => {
    const result = runReasoning([{ title: 'Missing data', score: 60, priority: 'high', evidence: '20% missing' }], 'چه چیزی مهم است؟');
    expect(result.steps).toHaveLength(12);
    expect(result.steps[0].module).toBe('Intake');
    expect(result.steps[0].input).toContain('چه چیزی مهم است؟');
    expect(result.steps[11].module).toBe('Loop');
  });

  it('ranks signals deterministically and independently of input order', () => {
    const a = [
      { title: 'A', score: 20, priority: 'low' as const, evidence: 'a' },
      { title: 'B', score: 80, priority: 'high' as const, evidence: 'b' },
    ];
    expect(rankSignals(a)).toEqual(rankSignals([...a].reverse()));
    expect(rankSignals(a)[0].title).toBe('B');
  });

  it('surfaces causal uncertainty explicitly', () => {
    const result = runReasoning([{ title: 'Sales drop', score: 70, priority: 'high', evidence: '15% decline' }], 'علت افت چیست؟');
    expect(result.steps.find(step => step.module === 'Causality')?.output[0]).toContain('همبستگی علت را اثبات نمی‌کند');
  });
});
