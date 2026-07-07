import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { sendWeeklyReport } from '@/lib/quality';

export const runtime = 'nodejs';

/** Generate the weekly quality report now and push it to the owner's Telegram. */
export async function POST() {
  const session = await getSession();
  if (!session?.tenantId)
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const r = await sendWeeklyReport(session.tenantId);
  return NextResponse.json({
    ok: true,
    delivered: r.delivered,
    hadTarget: r.hadTarget,
    score: r.report.score,
    summary: r.report.summary,
  });
}
