/**
 * OTP core — pure, storage-agnostic logic for phone login codes.
 *
 * Codes are never stored in plaintext: we persist only an HMAC-SHA256 hash
 * (keyed by `SESSION_SECRET` and bound to the phone number). The DB layer owns
 * rows shaped like {@link OtpRecord}; this module owns the crypto + rules.
 */
import { createHmac, randomInt } from 'node:crypto';
import { safeEqual } from '../crypto.js';

export const DEFAULT_OTP_LENGTH = 5;
export const DEFAULT_OTP_TTL_SECONDS = 300;
export const MAX_OTP_ATTEMPTS = 5;

/** Generate a zero-padded numeric OTP of `length` digits using a CSPRNG. */
export function generateOtpCode(length = DEFAULT_OTP_LENGTH): string {
  if (length < 4 || length > 10) throw new Error('otp length must be 4..10');
  const max = 10 ** length;
  return String(randomInt(0, max)).padStart(length, '0');
}

/** HMAC hash of a code, bound to the phone so a leaked hash isn't portable. */
export function hashOtp(code: string, phone: string, secret: string): string {
  return createHmac('sha256', secret).update(`${phone}:${code}`).digest('hex');
}

export interface NewOtp {
  hash: string;
  expiresAt: Date;
}

/** Build the persisted fields for a freshly issued OTP. */
export function issueOtp(params: {
  code: string;
  phone: string;
  secret: string;
  ttlSeconds?: number;
  now?: Date;
}): NewOtp {
  const { code, phone, secret } = params;
  const ttl = params.ttlSeconds ?? DEFAULT_OTP_TTL_SECONDS;
  const now = params.now ?? new Date();
  return {
    hash: hashOtp(code, phone, secret),
    expiresAt: new Date(now.getTime() + ttl * 1000),
  };
}

/** The subset of an OTP DB row that verification needs. */
export interface OtpRecord {
  hash: string;
  expiresAt: Date;
  consumedAt: Date | null;
  attempts: number;
}

export type OtpVerifyResult =
  | { ok: true }
  | { ok: false; reason: 'expired' | 'consumed' | 'too_many_attempts' | 'mismatch' };

/**
 * Verify a candidate `code` against a stored record. Pure: the caller is
 * responsible for incrementing `attempts` / marking `consumedAt` in the store
 * based on the result.
 */
export function verifyOtp(params: {
  code: string;
  phone: string;
  secret: string;
  record: OtpRecord;
  now?: Date;
}): OtpVerifyResult {
  const { code, phone, secret, record } = params;
  const now = params.now ?? new Date();

  if (record.consumedAt) return { ok: false, reason: 'consumed' };
  if (record.attempts >= MAX_OTP_ATTEMPTS) return { ok: false, reason: 'too_many_attempts' };
  if (now.getTime() > record.expiresAt.getTime()) return { ok: false, reason: 'expired' };

  const candidate = hashOtp(code, phone, secret);
  if (!safeEqual(candidate, record.hash)) return { ok: false, reason: 'mismatch' };
  return { ok: true };
}
