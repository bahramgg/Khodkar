import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { connectTelegram } from '@/lib/telegram';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  if (!session.tenantId)
    return NextResponse.json({ ok: false, error: 'no_tenant' }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 400 });
  }
  const token = ((body as { token?: string })?.token ?? '').trim();

  const result = await connectTelegram(session.tenantId, token);
  if (!result.ok) return NextResponse.json(result, { status: 400 });
  return NextResponse.json({ ok: true, username: result.username });
}
