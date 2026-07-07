import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { submitInterview, type InterviewAnswer } from '@/lib/onboarding';
import type { ToneProfile } from '@khodkar/shared';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.tenantId)
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  let body: { answers?: InterviewAnswer[]; toneStyle?: ToneProfile['style']; toneSamples?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
  }

  const result = await submitInterview(session.tenantId, {
    answers: Array.isArray(body.answers) ? body.answers : [],
    toneStyle: body.toneStyle,
    toneSamples: Array.isArray(body.toneSamples) ? body.toneSamples : [],
  });
  return NextResponse.json({ ok: true, ...result });
}
