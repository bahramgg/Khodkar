import { NextResponse } from 'next/server';
import { buildTenantDeps } from '@/lib/tenant';
import { createTenant } from '@/lib/tenant-service';
import { getSession, issueSession } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_name' }, { status: 400 });
  }
  const { name = '', vertical = '' } = (body as { name?: string; vertical?: string }) ?? {};

  const result = await createTenant(
    buildTenantDeps(),
    { userId: session.sub, phone: session.phone },
    { name, vertical },
  );
  if (!result.ok) return NextResponse.json(result, { status: 400 });

  await issueSession(result.session);
  return NextResponse.json({ ok: true, redirectTo: '/panel' });
}
