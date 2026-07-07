import { handleWidgetMessage } from '@/lib/widget';

export const runtime = 'nodejs';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...CORS },
  });
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(req: Request): Promise<Response> {
  let body: { key?: string; sessionId?: string; text?: string };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: 'bad_request' }, 400);
  }
  const key = (body.key ?? '').trim();
  const sessionId = (body.sessionId ?? 'anon').trim();
  const text = (body.text ?? '').trim();
  if (!key || !text) return json({ ok: false, error: 'bad_request' }, 400);

  const r = await handleWidgetMessage(key, sessionId, text);
  if (!r.ok) return json(r, r.error === 'rate_limited' ? 429 : 404);
  return json({ ok: true, reply: r.reply, action: r.action });
}
