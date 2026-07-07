/**
 * Auth orchestration — request + verify OTP, mint a session. Depends only on
 * the {@link AuthStore} interface and an {@link SmsProvider}, so the full flow
 * is testable with in-memory fakes (no DB, no network).
 */
import {
  normalizeIranMobile,
  generateOtpCode,
  issueOtp,
  verifyOtp,
  signSession,
  type SessionPayload,
} from '@khodkar/shared';
import { otpSmsText, type SmsProvider } from '@khodkar/channels';
import type { AuthStore } from './auth-store.js';

/** Max OTP requests allowed per phone inside the rolling window. */
export const OTP_RATE_LIMIT = 3;
export const OTP_RATE_WINDOW_SECONDS = 60;

export interface AuthDeps {
  store: AuthStore;
  sms: SmsProvider;
  secret: string;
  ttlSeconds: number;
  codeLength: number;
  /** Injected clock for tests. */
  now?: () => Date;
}

export type RequestOtpResult =
  | { ok: true; phone: string }
  | { ok: false; error: 'invalid_phone' | 'rate_limited' };

export async function requestOtp(deps: AuthDeps, rawPhone: string): Promise<RequestOtpResult> {
  const now = deps.now?.() ?? new Date();
  const phone = normalizeIranMobile(rawPhone);
  if (!phone) return { ok: false, error: 'invalid_phone' };

  const since = new Date(now.getTime() - OTP_RATE_WINDOW_SECONDS * 1000);
  const recent = await deps.store.countOtpsSince(phone, since);
  if (recent >= OTP_RATE_LIMIT) return { ok: false, error: 'rate_limited' };

  const code = generateOtpCode(deps.codeLength);
  const { hash, expiresAt } = issueOtp({
    code,
    phone,
    secret: deps.secret,
    ttlSeconds: deps.ttlSeconds,
    now,
  });
  await deps.store.insertOtp({ phone, hash, expiresAt });
  await deps.sms.send({ to: phone, text: otpSmsText(code) });

  return { ok: true, phone };
}

export type VerifyOtpResult =
  | { ok: true; token: string; session: SessionPayload }
  | { ok: false; error: 'invalid_phone' | 'no_code' | 'expired' | 'consumed' | 'too_many_attempts' | 'mismatch' };

export async function verifyOtpAndLogin(
  deps: AuthDeps,
  rawPhone: string,
  code: string,
): Promise<VerifyOtpResult> {
  const now = deps.now?.() ?? new Date();
  const phone = normalizeIranMobile(rawPhone);
  if (!phone) return { ok: false, error: 'invalid_phone' };

  const record = await deps.store.latestOtp(phone);
  if (!record) return { ok: false, error: 'no_code' };

  const result = verifyOtp({ code, phone, secret: deps.secret, record, now });
  if (!result.ok) {
    // Count the failed attempt (except when already consumed/expired — those
    // aren't guessing attempts).
    if (result.reason === 'mismatch') await deps.store.incrementAttempts(record.id);
    return { ok: false, error: result.reason };
  }

  await deps.store.consumeOtp(record.id, now);
  const user = await deps.store.findOrCreateUser(phone);
  const session: SessionPayload = {
    sub: user.id,
    tenantId: user.tenantId,
    phone: user.phone,
    role: user.role,
  };
  const token = await signSession(session, deps.secret);
  return { ok: true, token, session };
}
