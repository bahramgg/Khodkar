import { describe, it, expect } from 'vitest';
import type { UserFromGetMe } from 'grammy/types';
import { verifyToken, setWebhook, buildTelegramBot, type TgFetcher } from './telegram.js';

// Minimal bot identity (real getMe returns more fields we don't need here).
const BOT_INFO = {
  id: 42,
  is_bot: true,
  first_name: 'Khodkar Test',
  username: 'khodkar_test_bot',
  can_join_groups: true,
  can_read_all_group_messages: false,
  supports_inline_queries: false,
} as unknown as UserFromGetMe;

describe('verifyToken', () => {
  it('rejects a malformed token without any request', async () => {
    const r = await verifyToken('not-a-token');
    expect(r).toEqual({ ok: false, error: 'malformed_token' });
  });

  it('returns botInfo on a valid getMe', async () => {
    const fetcher: TgFetcher = async () =>
      new Response(JSON.stringify({ ok: true, result: BOT_INFO }), { status: 200 });
    const r = await verifyToken('123456:ABC-DEF_ghi', fetcher);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.botInfo.username).toBe('khodkar_test_bot');
  });

  it('rejects when Telegram says not ok', async () => {
    const fetcher: TgFetcher = async () =>
      new Response(JSON.stringify({ ok: false }), { status: 401 });
    expect((await verifyToken('123456:ABCDEF', fetcher)).ok).toBe(false);
  });
});

describe('setWebhook', () => {
  it('posts setWebhook with the secret token', async () => {
    let sentBody: unknown;
    const fetcher: TgFetcher = async (_url, init) => {
      sentBody = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ ok: true, result: true }), { status: 200 });
    };
    const ok = await setWebhook('123456:ABCDEF', 'https://x/hook', 'sekret', fetcher);
    expect(ok).toBe(true);
    expect((sentBody as { secret_token: string }).secret_token).toBe('sekret');
  });
});

describe('buildTelegramBot (grammY round-trip)', () => {
  it('replies to an incoming text message via the Bot API', async () => {
    const bot = buildTelegramBot('123456:ABCDEF', {
      botInfo: BOT_INFO,
      onText: async ({ text }) => `پاسخ: ${text}`,
    });

    const captured: { method: string; payload: any }[] = [];
    bot.api.config.use((async (_prev: unknown, method: string, payload: unknown) => {
      captured.push({ method, payload });
      return { ok: true, result: true };
    }) as never);

    await bot.handleUpdate({
      update_id: 1,
      message: {
        message_id: 10,
        date: 0,
        chat: { id: 99, type: 'private', first_name: 'U' },
        from: { id: 99, is_bot: false, first_name: 'U' },
        text: 'سلام',
      },
    } as never);

    const sent = captured.find((c) => c.method === 'sendMessage');
    expect(sent).toBeTruthy();
    expect(sent?.payload.chat_id).toBe(99);
    expect(sent?.payload.text).toBe('پاسخ: سلام');
  });
});
