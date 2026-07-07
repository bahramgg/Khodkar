import { NextResponse } from 'next/server';
import { getDb, setBotEnabled, recordAudit } from '@khodkar/db';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.tenantId)
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  let body: { enabled?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
  }
  const enabled = body.enabled !== false;

  await setBotEnabled(getDb(), session.tenantId, enabled);
  await recordAudit(getDb(), {
    tenantId: session.tenantId,
    actor: 'owner',
    action: enabled ? 'bot_enabled' : 'bot_paused',
  });
  return NextResponse.json({ ok: true, enabled });
}
