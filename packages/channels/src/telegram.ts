/**
 * Telegram channel via grammY — multi-bot (one bot/token per tenant), webhook
 * driven. Token validation + webhook setup use the Bot API directly (injectable
 * fetch for tests). The bot instance is built per update in the webhook route.
 */
import { Bot, webhookCallback } from 'grammy';
import type { UserFromGetMe } from 'grammy/types';

export type TgFetcher = (url: string, init?: RequestInit) => Promise<Response>;

const API = 'https://api.telegram.org';

export interface TelegramCredentials {
  token: string;
  webhookSecret: string;
  botInfo: UserFromGetMe;
}

export type VerifyResult =
  | { ok: true; botInfo: UserFromGetMe }
  | { ok: false; error: string };

/** Validate a bot token via getMe and return the bot's identity. */
export async function verifyToken(token: string, fetcher: TgFetcher = fetch): Promise<VerifyResult> {
  if (!/^\d+:[\w-]+$/.test(token)) return { ok: false, error: 'malformed_token' };
  try {
    const res = await fetcher(`${API}/bot${token}/getMe`);
    const data = (await res.json()) as { ok?: boolean; result?: UserFromGetMe };
    if (!res.ok || !data.ok || !data.result) return { ok: false, error: 'rejected' };
    return { ok: true, botInfo: data.result };
  } catch {
    return { ok: false, error: 'unreachable' };
  }
}

/** Point Telegram at our webhook, guarded by a secret token. */
export async function setWebhook(
  token: string,
  url: string,
  secretToken: string,
  fetcher: TgFetcher = fetch,
): Promise<boolean> {
  const res = await fetcher(`${API}/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url, secret_token: secretToken, allowed_updates: ['message'] }),
  });
  const data = (await res.json()) as { ok?: boolean };
  return res.ok && data.ok === true;
}

/** Send a message to a chat via the Bot API (used by owner draft-approval). */
export async function sendTelegramMessage(
  token: string,
  chatId: string | number,
  text: string,
  fetcher: TgFetcher = fetch,
): Promise<boolean> {
  const res = await fetcher(`${API}/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  const data = (await res.json()) as { ok?: boolean };
  return res.ok && data.ok === true;
}

export interface BuildBotOptions {
  botInfo?: UserFromGetMe;
  /** Produce the reply text for an incoming message; empty string = no reply. */
  onText: (params: { chatId: number; text: string }) => Promise<string>;
}

/** Build a grammY bot wired to `onText`. Pass `botInfo` to skip a getMe call. */
export function buildTelegramBot(token: string, opts: BuildBotOptions): Bot {
  const bot = opts.botInfo ? new Bot(token, { botInfo: opts.botInfo }) : new Bot(token);
  bot.on('message:text', async (ctx) => {
    const reply = await opts.onText({ chatId: ctx.chat.id, text: ctx.message.text });
    if (reply) await ctx.reply(reply);
  });
  return bot;
}

/** grammY webhook adapter for a standard Request/Response runtime (Next route). */
export function telegramWebhookCallback(bot: Bot, secretToken?: string) {
  return webhookCallback(bot, 'std/http', {
    secretToken,
  });
}
