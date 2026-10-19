import {
  formatFrenchNumber,
  formatFrenchNumberWithPrecisionOf,
} from './format-number';

describe('formatFrenchNumber', () => {
  it('drops the decimal of a whole score and keeps a single one otherwise', () => {
    expect(formatFrenchNumber(90)).toBe('90');
    expect(formatFrenchNumber(90.1)).toBe('90,1');
    expect(formatFrenchNumber(74.84)).toBe('74,8');
  });
});

describe('formatFrenchNumberWithPrecisionOf', () => {
  it('counts in whole points toward a whole final score', () => {
    expect(formatFrenchNumberWithPrecisionOf(42.6, 90)).toBe('43');
    expect(formatFrenchNumberWithPrecisionOf(90, 90)).toBe('90');
  });

  it('keeps one decimal all along toward a decimal final score', () => {
    expect(formatFrenchNumberWithPrecisionOf(42, 90.1)).toBe('42,0');
    expect(formatFrenchNumberWithPrecisionOf(90.1, 90.1)).toBe('90,1');
  });
});
