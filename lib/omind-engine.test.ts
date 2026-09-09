import { describe, expect, it } from 'vitest';
import { normalizeRows, profileRows, type Row } from './omind-engine';

describe('OMIND analytical core', () => {
  it('normalizes Persian and Arabic numerals without mutating the input', () => {
    const input: Row[] = [{ amount: '۱۲۳۴', label: '  فروش  ' }, { amount: '١٢٣٥', label: '' }];
    const output = normalizeRows(input);

    expect(output).toEqual([
      { amount: 1234, label: 'فروش' },
      { amount: 1235, label: null },
    ]);
    expect(input[0].amount).toBe('۱۲۳۴');
  });

  it('penalizes missing and duplicate data in health scoring', () => {
    const clean: Row[] = [
      { id: '1', amount: 100 },
      { id: '2', amount: 120 },
      { id: '3', amount: 110 },
      { id: '4', amount: 130 },
      { id: '5', amount: 125 },
    ];
    const dirty: Row[] = [
      ...clean,
      { id: '5', amount: 125 },
      { id: '6', amount: null },
    ];

    expect(profileRows(dirty).health).toBeLessThan(profileRows(clean).health);
    expect(profileRows(dirty).signals.some(s => s.type === 'missingness')).toBe(true);
  });

  it('does not fabricate analysis for an empty dataset', () => {
    const result = profileRows([]);
    expect(result.rows).toBe(0);
    expect(result.health).toBe(100);
    expect(result.columns).toEqual([]);
  });
});
