import { describe, it, expect } from 'vitest';
import { signSession, verifySession, type SessionPayload } from './session.js';

const secret = 'unit-test-session-secret-32-chars-min-000';
const payload: SessionPayload = {
  sub: 'user_1',
  tenantId: 'tenant_1',
  phone: '+989121234567',
  role: 'owner',
};

describe('session JWT', () => {
  it('signs and verifies a round-trip', async () => {
    const token = await signSession(payload, secret);
    const decoded = await verifySession(token, secret);
    expect(decoded).toMatchObject(payload);
  });

  it('carries a null tenantId (pre-tenant signup)', async () => {
    const token = await signSession({ ...payload, tenantId: null }, secret);
    const decoded = await verifySession(token, secret);
    expect(decoded?.tenantId).toBeNull();
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await signSession(payload, secret);
    expect(await verifySession(token, 'another-secret-32-chars-min-00000000')).toBeNull();
  });

  it('rejects a garbage token', async () => {
    expect(await verifySession('garbage.token.value', secret)).toBeNull();
  });

  it('rejects an expired token', async () => {
    const token = await signSession(payload, secret, -10); // already expired
    expect(await verifySession(token, secret)).toBeNull();
  });

  it('refuses to sign with a short secret', async () => {
    await expect(signSession(payload, 'too-short')).rejects.toThrow();
  });
});
