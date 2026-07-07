/**
 * Price parsing & normalization — the crux of "correct prices" in the DoD.
 * Handles Persian/Arabic digits, thousands separators (`,` `٬` `،`), currency
 * words, WooCommerce minor-units, and IRR→Toman conversion.
 */
import { toEnglishDigits } from '@khodkar/shared';

/**
 * Extract a numeric amount from messy text/number input.
 * `"۱٬۲۵۰٬۰۰۰ تومان"` → `1250000`; returns null when there's no number.
 */
export function parseAmount(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === 'number') return Number.isFinite(input) ? input : null;

  let s = toEnglishDigits(String(input));
  // Drop thousands separators & spaces: comma, Arabic thousands (٬ U+066C),
  // Arabic comma (، U+060C), NBSP, ordinary space.
  s = s.replace(/[,٬، \s]/g, '');
  const m = s.match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

/** Convert a WooCommerce Store-API minor-unit price string to major units. */
export function fromMinorUnits(
  price: string | number | null | undefined,
  minorUnit: number,
): number | null {
  const n = parseAmount(price);
  if (n === null) return null;
  const unit = Number.isFinite(minorUnit) && minorUnit > 0 ? minorUnit : 0;
  return n / 10 ** unit;
}

/**
 * Normalize an amount to Toman given its currency. Iranian sites quote either
 * Rial (IRR) or Toman (IRT/TOMAN); 1 Toman = 10 Rial.
 */
export function toToman(amount: number, currencyCode?: string | null): number {
  const c = (currencyCode ?? '').toUpperCase();
  if (c === 'IRR' || c === 'RIAL') return Math.round(amount / 10);
  return Math.round(amount);
}
