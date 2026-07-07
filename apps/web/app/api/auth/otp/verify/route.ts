import { NextResponse } from 'next/server';
import { buildAuthDeps } from '@/lib/auth';
import { verifyOtpAndLogin } from '@/lib/auth-service';
import { setSessionCookie } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'mismatch' }, { status: 400 });
  }
  const { phone = '', code = '' } = (body as { phone?: string; code?: string }) ?? {};

  const result = await verifyOtpAndLogin(buildAuthDeps(), phone, code);
  if (!result.ok) {
    const status = result.error === 'too_many_attempts' ? 429 : 400;
    return NextResponse.json({ ok: false, error: result.error }, { status });
  }

  setSessionCookie(result.token);
  const redirectTo = result.session.tenantId ? '/panel' : '/onboarding';
  return NextResponse.json({ ok: true, redirectTo });
}
