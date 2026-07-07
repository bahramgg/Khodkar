import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { activateTenant } from '@/lib/onboarding';

export const runtime = 'nodejs';

export async function POST() {
  const session = await getSession();
  if (!session?.tenantId)
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  await activateTenant(session.tenantId);
  return NextResponse.json({ ok: true, redirectTo: '/panel' });
}
