import { describe, expect, it } from 'vitest';
import { FIBONACCI, fibonacciSensitivity, rankSignals, runReasoning } from './reasoning';

describe('OMIND reasoning core', () => {
  it('uses the defined Fibonacci sequence', () => {
    expect([...FIBONACCI]).toEqual([1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89]);
  });

  it('returns all 12 executable reasoning modules', () => {
    const result = runReasoning([{ title: 'Missing data', score: 60, priority: 'high', evidence: '20% missing' }], 'چه چیزی مهم است؟');
    expect(result.steps).toHaveLength(12);
    expect(result.steps[0].module).toBe('Intake');
    expect(result.steps[11].module).toBe('Loop');
    expect(result.steps.every(step => step.trace.includes('Fibonacci='))).toBe(true);
  });

  it('ranks signals deterministically', () => {
    const ranked = rankSignals([
      { title: 'A', score: 20, priority: 'low', evidence: 'a' },
      { title: 'B', score: 80, priority: 'high', evidence: 'b' },
    ]);
    expect(ranked[0].title).toBe('B');
    expect(ranked[0].score).toBe(6);
    expect(ranked).toEqual(rankSignals([
      { title: 'A', score: 20, priority: 'low', evidence: 'a' },
      { title: 'B', score: 80, priority: 'high', evidence: 'b' },
    ]));
  });

  it('exposes Fibonacci sensitivity instead of hiding weighting effects', () => {
    const result = fibonacciSensitivity([10, 20, 30]);
    expect(result.baseline).not.toBe(result.reordered);
  });
});
