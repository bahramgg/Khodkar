import { describe, it, expect } from 'vitest';
import { parseAmount, fromMinorUnits, toToman } from './price.js';

describe('parseAmount', () => {
  it('parses plain and separated numbers', () => {
    expect(parseAmount('1250000')).toBe(1250000);
    expect(parseAmount('1,250,000')).toBe(1250000);
    expect(parseAmount(1250000)).toBe(1250000);
  });
  it('handles Persian digits and separators + currency words', () => {
    expect(parseAmount('۱٬۲۵۰٬۰۰۰ تومان')).toBe(1250000);
    expect(parseAmount('۴۵۰۰۰۰ ریال')).toBe(450000);
  });
  it('keeps decimals', () => {
    expect(parseAmount('12500.50')).toBe(12500.5);
  });
  it('returns null when there is no number', () => {
    expect(parseAmount('تماس بگیرید')).toBeNull();
    expect(parseAmount('')).toBeNull();
    expect(parseAmount(null)).toBeNull();
    expect(parseAmount(undefined)).toBeNull();
  });
});

describe('fromMinorUnits', () => {
  it('divides by 10^minorUnit', () => {
    expect(fromMinorUnits('1250000', 2)).toBe(12500);
    expect(fromMinorUnits('1250000', 0)).toBe(1250000);
  });
  it('treats missing/invalid minor unit as 0', () => {
    expect(fromMinorUnits('999', Number.NaN)).toBe(999);
  });
});

describe('toToman', () => {
  it('converts IRR (rial) to toman', () => {
    expect(toToman(1250000, 'IRR')).toBe(125000);
    expect(toToman(1250000, 'rial')).toBe(125000);
  });
  it('leaves toman/unknown as-is', () => {
    expect(toToman(1250000, 'IRT')).toBe(1250000);
    expect(toToman(1250000, 'TOMAN')).toBe(1250000);
    expect(toToman(1250000)).toBe(1250000);
  });
});
