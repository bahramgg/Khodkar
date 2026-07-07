import { describe, it, expect } from 'vitest';
import { MockSmsProvider, createSmsProvider, otpSmsText } from './sms.js';

describe('MockSmsProvider', () => {
  it('records sent messages and returns an id', async () => {
    const p = new MockSmsProvider();
    const res = await p.send({ to: '+989121234567', text: 'hi' });
    expect(res.id).toMatch(/^mock_/);
    expect(p.sent).toHaveLength(1);
    expect(p.sent[0]?.to).toBe('+989121234567');
  });
});

describe('createSmsProvider', () => {
  it('returns the mock provider by name', () => {
    expect(createSmsProvider('mock').name).toBe('mock');
  });
  it('throws for unimplemented providers', () => {
    expect(() => createSmsProvider('kavenegar')).toThrow();
  });
});

describe('otpSmsText', () => {
  it('embeds the code', () => {
    expect(otpSmsText('12345')).toContain('12345');
  });
});
