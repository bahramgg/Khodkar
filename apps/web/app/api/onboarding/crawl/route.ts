import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { crawlAndImport } from '@/lib/onboarding';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.tenantId)
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
  }
  const url = (body.url ?? '').trim();
  if (!/^https?:\/\/|^[\w.-]+\.[a-z]{2,}/i.test(url))
    return NextResponse.json({ ok: false, error: 'invalid_url' }, { status: 400 });

  try {
    const summary = await crawlAndImport(session.tenantId, url);
    return NextResponse.json({ ok: true, ...summary });
  } catch {
    return NextResponse.json({ ok: false, error: 'crawl_failed' }, { status: 502 });
  }
}
