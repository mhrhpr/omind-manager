import type { Row, Cell, ColumnProfile } from './omind-engine';

export type CleaningReport = {
  inputRows: number;
  outputRows: number;
  removedDuplicateRows: number;
  normalizedCells: number;
  emptyCells: number;
  changedHeaders: number;
};

export type ValidationReport = {
  valid: boolean;
  score: number;
  columns: { name: string; type: string; missing: number; unique: number; issues: string[] }[];
  warnings: string[];
};

export type DataModel = {
  grain: string;
  key: string | null;
  dateColumn: string | null;
  measures: string[];
  dimensions: string[];
  textColumns: string[];
  relationships: string[];
};

export type PipelineResult = {
  rawRows: Row[];
  cleanedRows: Row[];
  cleaning: CleaningReport;
  validation: ValidationReport;
  model: DataModel;
};

function toAsciiDigits(value: string) {
  return value.replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

function normalizeText(value: string) {
  return value.replace(/[\u200c\u200f\ufeff]/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeValue(value: Cell): Cell {
  if (typeof value !== 'string') return value;
  const text = normalizeText(value);
  if (!text) return null;
  const digits = toAsciiDigits(text).replace(/[,،\s]/g, '');
  if (/^-?(?:\d+|\d*\.\d+)$/.test(digits)) return Number(digits);
  return text;
}

function normalizeHeader(header: string) {
  return normalizeText(header).replace(/\s+/g, '_');
}

function uniqueHeaders(headers: string[]) {
  const counts = new Map<string, number>();
  return headers.map(h => {
    const count = (counts.get(h) || 0) + 1;
    counts.set(h, count);
    return count === 1 ? h : `${h}_${count}`;
  });
}

export function runDataPipeline(input: Row[]): PipelineResult {
  const rawRows = input.map(row => ({ ...row }));
  const rawHeaders = Array.from(new Set(rawRows.flatMap(row => Object.keys(row))));
  const headers = uniqueHeaders(rawHeaders.map(normalizeHeader));
  const headerMap = new Map(rawHeaders.map((h, i) => [h, headers[i]]));
  let normalizedCells = 0;
  let emptyCells = 0;

  const staged = rawRows.map(row => {
    const out: Row = {};
    for (const oldHeader of rawHeaders) {
      const nextHeader = headerMap.get(oldHeader) || oldHeader;
      const before = row[oldHeader];
      const after = normalizeValue(before);
      if (before !== after) normalizedCells += 1;
      if (after === null) emptyCells += 1;
      out[nextHeader] = after;
    }
    return out;
  });

  const seen = new Set<string>();
  const cleanedRows = staged.filter(row => {
    const key = JSON.stringify(headers.map(h => row[h] ?? null));
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const duplicateCount = staged.length - cleanedRows.length;
  const changedHeaders = rawHeaders.reduce((count, oldHeader, i) => count + (oldHeader !== headers[i] ? 1 : 0), 0);
  const cleaning: CleaningReport = {
    inputRows: rawRows.length,
    outputRows: cleanedRows.length,
    removedDuplicateRows: duplicateCount,
    normalizedCells,
    emptyCells,
    changedHeaders,
  };

  const profiles: ColumnProfile[] = headers.map(name => {
    const values = cleanedRows.map(row => row[name]).filter(v => v !== null && v !== '');
    const unique = new Set(values.map(v => String(v))).size;
    const numericRatio = values.length ? values.filter(v => typeof v === 'number' && Number.isFinite(v)).length / values.length : 0;
    const dateRatio = values.length ? values.filter(v => /^(?:\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{4})$/.test(String(v))).length / values.length : 0;
    const lower = name.toLowerCase();
    let role: ColumnProfile['role'] = 'text';
    let type: ColumnProfile['type'] = 'text';
    if (dateRatio >= .7 || /date|time|تاریخ|روز|ماه|سال/.test(lower)) { role = 'date'; type = 'date'; }
    else if (numericRatio >= .8) { role = 'measure'; type = 'number'; }
    else if (unique <= Math.max(20, cleanedRows.length * .1)) role = 'category';
    if (/^id$|_id$|code|شناسه|کد/.test(lower) || (unique === cleanedRows.length && cleanedRows.length > 0)) role = 'key';
    return { name, role, type, missing: cleanedRows.length - values.length, unique };
  });

  const validationColumns = profiles.map(profile => {
    const issues: string[] = [];
    if (!profile.name) issues.push('نام ستون خالی است');
    if (profile.missing === cleanedRows.length && cleanedRows.length > 0) issues.push('تمام مقادیر خالی هستند');
    if (profile.unique === 0 && cleanedRows.length > 0) issues.push('مقدار قابل استفاده ندارد');
    return { name: profile.name, type: profile.type, missing: profile.missing, unique: profile.unique, issues };
  });
  const warnings = validationColumns.flatMap(c => c.issues.map(issue => `${c.name}: ${issue}`));
  const missingCells = validationColumns.reduce((sum, c) => sum + c.missing, 0);
  const totalCells = Math.max(1, cleanedRows.length * Math.max(1, headers.length));
  const score = Math.max(0, Math.round(100 - (missingCells / totalCells) * 35 - (duplicateCount / Math.max(1, staged.length)) * 25 - warnings.length * 3));
  const validation: ValidationReport = { valid: warnings.length === 0 && cleanedRows.length > 0 && headers.length > 0, score, columns: validationColumns, warnings: warnings.slice(0, 12) };

  const model: DataModel = {
    grain: cleanedRows.length ? `هر رکورد = یک سطر (${cleanedRows.length.toLocaleString('fa-IR')} رکورد)` : 'داده‌ای برای تعیین grain وجود ندارد',
    key: profiles.find(p => p.role === 'key')?.name || null,
    dateColumn: profiles.find(p => p.role === 'date')?.name || null,
    measures: profiles.filter(p => p.role === 'measure').map(p => p.name),
    dimensions: profiles.filter(p => p.role === 'dimension' || p.role === 'category').map(p => p.name),
    textColumns: profiles.filter(p => p.role === 'text').map(p => p.name),
    relationships: profiles.filter(p => p.role === 'key').slice(0, 4).map(p => `${p.name} → candidate dimension key`),
  };
  return { rawRows, cleanedRows, cleaning, validation, model };
}
