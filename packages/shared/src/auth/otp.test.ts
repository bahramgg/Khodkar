import { describe, it, expect } from 'vitest';
import {
  generateOtpCode,
  hashOtp,
  issueOtp,
  verifyOtp,
  MAX_OTP_ATTEMPTS,
  type OtpRecord,
} from './otp.js';

const secret = 'test-secret-at-least-32-chars-long-000';
const phone = '+989121234567';

describe('generateOtpCode', () => {
  it('produces zero-padded numeric codes of the requested length', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateOtpCode(5);
      expect(code).toMatch(/^\d{5}$/);
    }
  });
  it('rejects out-of-range lengths', () => {
    expect(() => generateOtpCode(2)).toThrow();
    expect(() => generateOtpCode(11)).toThrow();
  });
});

describe('hashOtp', () => {
  it('is deterministic and phone-bound', () => {
    expect(hashOtp('12345', phone, secret)).toBe(hashOtp('12345', phone, secret));
    expect(hashOtp('12345', phone, secret)).not.toBe(hashOtp('12345', '+989120000000', secret));
  });
});

function baseRecord(over: Partial<OtpRecord> = {}): OtpRecord {
  const now = new Date('2026-07-07T10:00:00Z');
  const { hash, expiresAt } = issueOtp({ code: '12345', phone, secret, ttlSeconds: 300, now });
  return { hash, expiresAt, consumedAt: null, attempts: 0, ...over };
}

describe('verifyOtp', () => {
  const now = new Date('2026-07-07T10:01:00Z'); // 1 min later, within TTL

  it('accepts the correct code within TTL', () => {
    expect(verifyOtp({ code: '12345', phone, secret, record: baseRecord(), now }).ok).toBe(true);
  });

  it('rejects a wrong code', () => {
    const r = verifyOtp({ code: '99999', phone, secret, record: baseRecord(), now });
    expect(r).toEqual({ ok: false, reason: 'mismatch' });
  });

  it('rejects an expired code', () => {
    const late = new Date('2026-07-07T10:10:00Z'); // past 5-min TTL
    const r = verifyOtp({ code: '12345', phone, secret, record: baseRecord(), now: late });
    expect(r).toEqual({ ok: false, reason: 'expired' });
  });

  it('rejects an already-consumed code', () => {
    const r = verifyOtp({
      code: '12345',
      phone,
      secret,
      record: baseRecord({ consumedAt: new Date() }),
      now,
    });
    expect(r).toEqual({ ok: false, reason: 'consumed' });
  });

  it('locks out after too many attempts', () => {
    const r = verifyOtp({
      code: '12345',
      phone,
      secret,
      record: baseRecord({ attempts: MAX_OTP_ATTEMPTS }),
      now,
    });
    expect(r).toEqual({ ok: false, reason: 'too_many_attempts' });
  });
});
