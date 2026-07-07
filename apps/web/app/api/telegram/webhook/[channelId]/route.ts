import { processTelegramUpdate } from '@/lib/telegram';
import type { Update } from 'grammy/types';

export const runtime = 'nodejs';

/** Per-tenant Telegram webhook. Telegram sends the secret token as a header. */
export async function POST(req: Request, { params }: { params: { channelId: string } }) {
  const secret = req.headers.get('x-telegram-bot-api-secret-token') ?? undefined;

  let update: Update;
  try {
    update = (await req.json()) as Update;
  } catch {
    return new Response('bad request', { status: 400 });
  }

  const { ok } = await processTelegramUpdate(params.channelId, update, secret);
  // 401 on bad secret / unknown channel; 200 so Telegram doesn't retry forever.
  return new Response(ok ? 'ok' : 'unauthorized', { status: ok ? 200 : 401 });
}
