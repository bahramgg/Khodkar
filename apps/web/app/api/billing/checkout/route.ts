import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { startCheckout } from '@/lib/billing';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.tenantId)
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  let body: { plan?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_plan' }, { status: 400 });
  }

  const result = await startCheckout(session.tenantId, body.plan ?? '');
  if (!result.ok) return NextResponse.json(result, { status: 400 });
  return NextResponse.json({ ok: true, url: result.url });
}
