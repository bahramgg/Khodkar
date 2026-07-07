/**
 * Session tokens — signed JWTs (HS256 via `jose`) stored in an httpOnly cookie.
 * Payload identifies the user and their active tenant so every request can be
 * tenant-scoped without a DB round-trip.
 */
import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'khodkar_session';
export const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export interface SessionPayload {
  /** user id */
  sub: string;
  /** active tenant id (null right after signup, before a tenant exists) */
  tenantId: string | null;
  phone: string;
  role: 'owner' | 'staff';
}

function secretKey(secret: string): Uint8Array {
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 chars');
  }
  return new TextEncoder().encode(secret);
}

/** Sign a session JWT. */
export async function signSession(
  payload: SessionPayload,
  secret: string,
  ttlSeconds = DEFAULT_SESSION_TTL_SECONDS,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSeconds)
    .sign(secretKey(secret));
}

/** Verify + decode a session JWT. Returns `null` on any invalid/expired token. */
export async function verifySession(
  token: string,
  secret: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(secret));
    if (typeof payload.sub !== 'string') return null;
    return {
      sub: payload.sub,
      tenantId: (payload.tenantId as string | null) ?? null,
      phone: String(payload.phone ?? ''),
      role: (payload.role as SessionPayload['role']) ?? 'owner',
    };
  } catch {
    return null;
  }
}
