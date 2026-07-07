import { NextResponse } from 'next/server';
import { getDb, insertFeedback, recordEvent } from '@khodkar/db';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.tenantId)
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  let body: { kind?: string; text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
  }
  const kind = body.kind === 'idea' ? 'idea' : 'bug';
  const text = (body.text ?? '').trim();
  if (text.length < 3) return NextResponse.json({ ok: false, error: 'empty' }, { status: 400 });

  await insertFeedback(getDb(), { tenantId: session.tenantId, kind, text });
  await recordEvent(getDb(), { event: 'feedback', tenantId: session.tenantId, meta: { kind } });
  return NextResponse.json({ ok: true });
}
