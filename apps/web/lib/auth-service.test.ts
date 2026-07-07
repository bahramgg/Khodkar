import { describe, it, expect, beforeEach } from 'vitest';
import { MockSmsProvider } from '@khodkar/channels';
import { InMemoryAuthStore } from './auth-store.memory.js';
import {
  requestOtp,
  verifyOtpAndLogin,
  OTP_RATE_LIMIT,
  type AuthDeps,
} from './auth-service.js';

const SECRET = 'test-session-secret-at-least-32-chars-000';
const PHONE = '09121234567';
const CANON = '+989121234567';

let clock: Date;
let store: InMemoryAuthStore;
let sms: MockSmsProvider;
let deps: AuthDeps;

beforeEach(() => {
  clock = new Date('2026-07-07T12:00:00Z');
  store = new InMemoryAuthStore();
  store.clock = () => clock;
  sms = new MockSmsProvider();
  deps = { store, sms, secret: SECRET, ttlSeconds: 300, codeLength: 5, now: () => clock };
});

/** Pull the OTP out of the mock SMS text (tests only). */
function sentCode(): string {
  const text = sms.sent.at(-1)?.text ?? '';
  const m = text.match(/(\d{5})/);
  if (!m) throw new Error('no code in sms');
  return m[1] as string;
}

describe('requestOtp', () => {
  it('normalizes the phone, stores an OTP, and sends one SMS', async () => {
    const res = await requestOtp(deps, PHONE);
    expect(res).toEqual({ ok: true, phone: CANON });
    expect(sms.sent).toHaveLength(1);
    expect(sms.sent[0]?.to).toBe(CANON);
    expect(store.otps).toHaveLength(1);
  });

  it('rejects an invalid phone without sending', async () => {
    const res = await requestOtp(deps, 'not-a-phone');
    expect(res).toEqual({ ok: false, error: 'invalid_phone' });
    expect(sms.sent).toHaveLength(0);
  });

  it('rate-limits after the threshold within the window', async () => {
    for (let i = 0; i < OTP_RATE_LIMIT; i++) {
      expect((await requestOtp(deps, PHONE)).ok).toBe(true);
    }
    const res = await requestOtp(deps, PHONE);
    expect(res).toEqual({ ok: false, error: 'rate_limited' });
  });

  it('allows a new request once the window has passed', async () => {
    for (let i = 0; i < OTP_RATE_LIMIT; i++) await requestOtp(deps, PHONE);
    clock = new Date('2026-07-07T12:05:00Z'); // 5 min later
    expect((await requestOtp(deps, PHONE)).ok).toBe(true);
  });
});

describe('verifyOtpAndLogin', () => {
  it('logs in with the correct code and mints a session', async () => {
    await requestOtp(deps, PHONE);
    const res = await verifyOtpAndLogin(deps, PHONE, sentCode());
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.token.split('.')).toHaveLength(3); // JWT
      expect(res.session.phone).toBe(CANON);
      expect(res.session.tenantId).toBeNull();
    }
    // user was created
    expect(store.users).toHaveLength(1);
  });

  it('rejects a wrong code and counts the attempt', async () => {
    await requestOtp(deps, PHONE);
    const res = await verifyOtpAndLogin(deps, PHONE, '00000');
    // (guard against the 1-in-100k chance the real code is 00000)
    if (sentCode() !== '00000') {
      expect(res).toEqual({ ok: false, error: 'mismatch' });
      expect(store.otps[0]?.attempts).toBe(1);
    }
  });

  it('rejects when no code was requested', async () => {
    const res = await verifyOtpAndLogin(deps, PHONE, '12345');
    expect(res).toEqual({ ok: false, error: 'no_code' });
  });

  it('rejects an expired code', async () => {
    await requestOtp(deps, PHONE);
    const code = sentCode();
    clock = new Date('2026-07-07T12:10:00Z'); // past 5-min TTL
    const res = await verifyOtpAndLogin(deps, PHONE, code);
    expect(res).toEqual({ ok: false, error: 'expired' });
  });

  it('does not allow reusing a consumed code', async () => {
    await requestOtp(deps, PHONE);
    const code = sentCode();
    expect((await verifyOtpAndLogin(deps, PHONE, code)).ok).toBe(true);
    const again = await verifyOtpAndLogin(deps, PHONE, code);
    expect(again).toEqual({ ok: false, error: 'consumed' });
  });
});
