import { NextResponse } from 'next/server';
import { getDb, insertNps, recordEvent } from '@khodkar/db';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.tenantId)
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  let body: { score?: number; comment?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
  }
  const score = Number(body.score);
  if (!Number.isInteger(score) || score < 0 || score > 10)
    return NextResponse.json({ ok: false, error: 'bad_score' }, { status: 400 });

  await insertNps(getDb(), { tenantId: session.tenantId, source: 'owner', score, comment: body.comment });
  await recordEvent(getDb(), { event: 'nps', tenantId: session.tenantId, meta: { score } });
  return NextResponse.json({ ok: true });
}
