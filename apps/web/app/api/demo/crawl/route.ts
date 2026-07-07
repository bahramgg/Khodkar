import { NextResponse } from 'next/server';
import { getDb, recordEvent } from '@khodkar/db';
import { demoCrawl, demoRateLimited } from '@/lib/demo';

export const runtime = 'nodejs';
export const maxDuration = 60;

function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anon';
}

export async function POST(req: Request) {
  if (demoRateLimited(clientIp(req)))
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });

  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_url' }, { status: 400 });
  }
  const url = (body.url ?? '').trim();
  if (!/^https?:\/\/|^[\w.-]+\.[a-z]{2,}/i.test(url))
    return NextResponse.json({ ok: false, error: 'invalid_url' }, { status: 400 });

  const r = await demoCrawl(url);
  await recordEvent(getDb(), {
    event: 'demo_crawl',
    meta: { ok: r.ok, source: r.ok ? r.source : undefined },
  });
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
