import { describe, it, expect } from 'vitest';
import { normalizeIranMobile, isValidIranMobile, toEnglishDigits } from './phone.js';

describe('toEnglishDigits', () => {
  it('converts Persian and Arabic digits', () => {
    expect(toEnglishDigits('۰۹۱۲')).toBe('0912');
    expect(toEnglishDigits('٠٩١٢')).toBe('0912');
    expect(toEnglishDigits('abc۵')).toBe('abc5');
  });
});

describe('normalizeIranMobile', () => {
  const canonical = '+989121234567';

  it('accepts the common national format', () => {
    expect(normalizeIranMobile('09121234567')).toBe(canonical);
  });

  it('accepts +98, 0098, and bare-subscriber forms', () => {
    expect(normalizeIranMobile('+989121234567')).toBe(canonical);
    expect(normalizeIranMobile('00989121234567')).toBe(canonical);
    expect(normalizeIranMobile('9121234567')).toBe(canonical);
  });

  it('tolerates spaces, dashes, and Persian digits', () => {
    expect(normalizeIranMobile('0912 123 4567')).toBe(canonical);
    expect(normalizeIranMobile('0912-123-4567')).toBe(canonical);
    expect(normalizeIranMobile('۰۹۱۲۱۲۳۴۵۶۷')).toBe(canonical);
  });

  it('rejects invalid numbers', () => {
    expect(normalizeIranMobile('')).toBeNull();
    expect(normalizeIranMobile('12345')).toBeNull();
    expect(normalizeIranMobile('08121234567')).toBeNull(); // landline-ish, not 9-prefixed
    expect(normalizeIranMobile('0912123456')).toBeNull(); // too short
    expect(normalizeIranMobile('091212345678')).toBeNull(); // too long
  });

  it('isValidIranMobile mirrors normalize', () => {
    expect(isValidIranMobile('09121234567')).toBe(true);
    expect(isValidIranMobile('nope')).toBe(false);
  });
});
