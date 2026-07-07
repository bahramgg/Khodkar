import { NextResponse } from 'next/server';
import { buildAuthDeps } from '@/lib/auth';
import { requestOtp } from '@/lib/auth-service';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_phone' }, { status: 400 });
  }
  const phone = (body as { phone?: string })?.phone ?? '';

  const result = await requestOtp(buildAuthDeps(), phone);
  if (!result.ok) {
    const status = result.error === 'rate_limited' ? 429 : 400;
    return NextResponse.json(result, { status });
  }
  // Never return the code. Mock provider logs it to the server console in dev.
  return NextResponse.json({ ok: true, phone: result.phone });
}
