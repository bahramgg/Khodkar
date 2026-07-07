import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { convertUnansweredToFaq } from '@/lib/inbox';

export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.tenantId)
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  let body: { answer?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
  }

  const result = await convertUnansweredToFaq(session.tenantId, params.id, body.answer ?? '');
  if (!result.ok) {
    const status = result.error === 'not_found' ? 404 : 400;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}
