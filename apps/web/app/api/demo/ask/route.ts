import { NextResponse } from 'next/server';
import { getDb, recordEvent } from '@khodkar/db';
import { demoAsk, demoRateLimited } from '@/lib/demo';

export const runtime = 'nodejs';

function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anon';
}

export async function POST(req: Request) {
  if (demoRateLimited(clientIp(req)))
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });

  let body: { url?: string; question?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
  }
  const url = (body.url ?? '').trim();
  const question = (body.question ?? '').trim();
  if (!url || !question)
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });

  const r = await demoAsk(url, question);
  await recordEvent(getDb(), { event: 'demo_ask', meta: { ok: r.ok } });
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
