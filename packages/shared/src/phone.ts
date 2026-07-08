/**
 * Mobile-number normalization for the target market.
 *
 * Accepts the many shapes users actually type — localized (non-Latin) digits,
 * spaces/dashes, `0912…`, `+98912…`, `0098912…`, `912…` — and canonicalizes
 * to E.164 `+989XXXXXXXXX`. Returns `null` when the input is not a valid
 * mobile number, so callers can treat "invalid phone" explicitly.
 */

const LOCAL_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

/** Convert localized (non-Latin) digit characters in a string to ASCII `0-9`. */
export function toEnglishDigits(input: string): string {
  let out = '';
  for (const ch of input) {
    const p = LOCAL_DIGITS.indexOf(ch);
    if (p !== -1) {
      out += String(p);
      continue;
    }
    const a = ARABIC_DIGITS.indexOf(ch);
    out += a !== -1 ? String(a) : ch;
  }
  return out;
}

/**
 * Normalize a mobile number to `+989XXXXXXXXX`, or `null` if invalid.
 * Mobile subscriber numbers are always `9` followed by 9 digits.
 */
export function normalizeIranMobile(raw: string): string | null {
  if (!raw) return null;
  // Localized (non-Latin) → ASCII, then strip everything but digits.
  let digits = toEnglishDigits(raw).replace(/\D/g, '');

  // Strip international/trunk prefixes down to the 10-digit subscriber number.
  if (digits.startsWith('0098')) digits = digits.slice(4);
  else if (digits.startsWith('98') && digits.length === 12) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = digits.slice(1);

  // Must now be a subscriber number: `9` + 9 digits = 10 digits total.
  if (!/^9\d{9}$/.test(digits)) return null;
  return `+98${digits}`;
}

/** True when `raw` is a normalizable mobile number. */
export function isValidIranMobile(raw: string): boolean {
  return normalizeIranMobile(raw) !== null;
}

/**
 * Scan free text for the first mobile number (e.g. a customer sharing
 * their number in a chat). Returns the canonical form or null.
 */
export function findIranMobile(text: string): string | null {
  if (!text) return null;
  const compact = toEnglishDigits(text).replace(/[\s-]/g, '');
  const matches = compact.match(/(?:0098|\+?98|0)?9\d{9}/g) ?? [];
  for (const m of matches) {
    const n = normalizeIranMobile(m);
    if (n) return n;
  }
  return null;
}
