import { NextResponse } from 'next/server';
import { buildTenantDeps } from '@/lib/tenant';
import { switchTenant } from '@/lib/tenant-service';
import { getSession, issueSession } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 400 });
  }
  const tenantId = (body as { tenantId?: string })?.tenantId ?? '';

  const result = await switchTenant(buildTenantDeps(), { userId: session.sub, phone: session.phone }, tenantId);
  if (!result.ok) return NextResponse.json(result, { status: 403 });

  await issueSession(result.session);
  return NextResponse.json({ ok: true, redirectTo: '/panel' });
}
