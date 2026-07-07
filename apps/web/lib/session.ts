/** Session cookie read/write and the server-side "current user" accessor. */
import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  SESSION_COOKIE,
  DEFAULT_SESSION_TTL_SECONDS,
  verifySession,
  type SessionPayload,
} from '@khodkar/shared';
import { env } from './env.js';

export function setSessionCookie(token: string): void {
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    path: '/',
    maxAge: DEFAULT_SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(): void {
  cookies().delete(SESSION_COOKIE);
}

/** Read + verify the current session, or `null` if not logged in. */
export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token, env.sessionSecret);
}

/** Require a session in a server component; redirect to /login otherwise. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect('/login');
  return session;
}
