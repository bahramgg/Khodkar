/** Server wiring for the Telegram channel: connect, per-tenant agent, webhook. */
import 'server-only';
import { randomBytes } from 'node:crypto';
import {
  getDb,
  upsertChannel,
  getChannelById,
  getActiveChannel,
  insertUnanswered,
  type ChannelRow,
} from '@khodkar/db';
import {
  DbRetriever,
  CatalogResponder,
  makeCustomerAgent,
  indexTenantCatalog,
} from '@khodkar/agent';
import {
  verifyToken,
  setWebhook,
  buildTelegramBot,
  handleCustomerText,
  type TelegramCredentials,
} from '@khodkar/channels';
import type { Update } from 'grammy/types';
import { env } from './env.js';
import { embedder } from './embeddings.js';
import { encryptTelegramCredentials, decryptTelegramCredentials } from './telegram-creds.js';
import { recordLeadFromText } from './inbox.js';
import { makeConversationSink } from './conversation-sink.js';

const encryptCreds = encryptTelegramCredentials;
const decryptCreds = decryptTelegramCredentials;

/** Build the customer agent for a tenant (RAG over its catalog + facts). */
export function agentForTenant(tenantId: string) {
  return makeCustomerAgent({
    retriever: new DbRetriever(getDb(), tenantId, embedder),
    responder: new CatalogResponder(),
    logUnanswered: (question) => insertUnanswered(getDb(), { tenantId, question }),
  });
}

export type ConnectResult = { ok: true; username: string } | { ok: false; error: 'invalid_token' };

/** Validate a token, store encrypted creds, register the webhook, index catalog. */
export async function connectTelegram(tenantId: string, token: string): Promise<ConnectResult> {
  const v = await verifyToken(token);
  if (!v.ok) return { ok: false, error: 'invalid_token' };

  const creds: TelegramCredentials = {
    token,
    webhookSecret: randomBytes(16).toString('hex'),
    botInfo: v.botInfo,
  };
  const channelId = await upsertChannel(getDb(), {
    tenantId,
    type: 'telegram',
    credentials: encryptCreds(creds),
    status: 'active',
  });

  if (env.telegramWebhookBase) {
    await setWebhook(
      token,
      `${env.telegramWebhookBase}/api/telegram/webhook/${channelId}`,
      creds.webhookSecret,
    ).catch(() => false);
  }

  // Make sure the catalog is embedded so the bot can answer from it.
  await indexTenantCatalog(getDb(), tenantId, embedder);

  return { ok: true, username: v.botInfo.username ?? '' };
}

/** The active telegram channel + bot username for a tenant, if connected. */
export async function telegramStatus(
  tenantId: string,
): Promise<{ connected: boolean; username?: string }> {
  const ch = await getActiveChannel(getDb(), tenantId, 'telegram');
  if (!ch || !ch.credentials) return { connected: false };
  try {
    return { connected: true, username: decryptCreds(ch.credentials).botInfo.username };
  } catch {
    return { connected: true };
  }
}

/** Process one Telegram webhook update after verifying the secret token. */
export async function processTelegramUpdate(
  channelId: string,
  update: Update,
  secret: string | undefined,
): Promise<{ ok: boolean }> {
  const channel: ChannelRow | null = await getChannelById(getDb(), channelId);
  if (!channel || channel.type !== 'telegram' || !channel.credentials) return { ok: false };

  const creds = decryptCreds(channel.credentials);
  if (creds.webhookSecret !== secret) return { ok: false };

  const sink = makeConversationSink(channel.tenantId, channelId);
  const agent = agentForTenant(channel.tenantId);
  const bot = buildTelegramBot(creds.token, {
    botInfo: creds.botInfo,
    onText: async ({ chatId, text }) => {
      await recordLeadFromText(channel.tenantId, text);
      const r = await handleCustomerText({ sink, agent }, { customerRef: String(chatId), text });
      return r.reply;
    },
  });
  await bot.handleUpdate(update);
  return { ok: true };
}
