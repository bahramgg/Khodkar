import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { sandboxReply } from '@/lib/onboarding';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.tenantId)
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
  }
  const text = (body.text ?? '').trim();
  if (!text) return NextResponse.json({ ok: false, error: 'empty' }, { status: 400 });

  const r = await sandboxReply(session.tenantId, text);
  return NextResponse.json({ ok: true, ...r });
}
