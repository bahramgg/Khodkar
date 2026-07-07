import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { resolveDraft, type DraftAction } from '@/lib/inbox';

export const runtime = 'nodejs';

const ACTIONS: DraftAction[] = ['approve', 'edit', 'reject'];

export async function POST(req: Request, { params }: { params: { draftId: string } }) {
  const session = await getSession();
  if (!session?.tenantId)
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  let body: { action?: string; text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
  }
  const action = body.action as DraftAction;
  if (!ACTIONS.includes(action))
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });

  const result = await resolveDraft(session.tenantId, params.draftId, action, body.text);
  if (!result.ok) {
    const status = result.error === 'not_found' ? 404 : 400;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}
