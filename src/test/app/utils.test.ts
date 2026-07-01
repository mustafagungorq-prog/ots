import { describe, expect, it } from 'vitest';
import { getMonthKey, getMonthName } from '@/app/utils';

describe('app date helpers', () => {
  it('builds a stable year-month key', () => {
    expect(getMonthKey('2026-07-01')).toBe('2026-07');
    expect(getMonthKey('2024-01-09')).toBe('2024-01');
  });

  it('formats month names from the month key', () => {
    expect(getMonthName('2026-07')).toBe('Temmuz 2026');
    expect(getMonthName('2024-01')).toBe('Ocak 2024');
  });
});