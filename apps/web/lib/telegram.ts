/** Server wiring for the Telegram channel: connect, per-tenant agent, webhook. */
import 'server-only';
import { randomBytes } from 'node:crypto';
import {
  getDb,
  upsertChannel,
  getChannelById,
  getActiveChannel,
  ensureConversation,
  addMessage,
  createDraft,
  type ChannelRow,
} from '@khodkar/db';
import type { MessageRole } from '@khodkar/shared';
import { encrypt, decrypt, keyFromHex } from '@khodkar/shared';
import {
  DbRetriever,
  HashEmbedder,
  CatalogResponder,
  makeCustomerAgent,
  indexTenantCatalog,
} from '@khodkar/agent';
import {
  verifyToken,
  setWebhook,
  buildTelegramBot,
  handleCustomerText,
  type ConversationSink,
  type TelegramCredentials,
} from '@khodkar/channels';
import type { Update } from 'grammy/types';
import { env } from './env.js';

// Offline 1536-dim baseline embedder (OpenRouter embeddings drop in later).
const embedder = new HashEmbedder();

const credKey = () => keyFromHex(env.credentialsKey);
const encryptCreds = (c: TelegramCredentials): string => encrypt(JSON.stringify(c), credKey());
const decryptCreds = (s: string): TelegramCredentials => JSON.parse(decrypt(s, credKey()));

/** Conversation sink bound to one tenant + channel. */
class DrizzleConversationSink implements ConversationSink {
  constructor(private readonly tenantId: string, private readonly channelId: string) {}
  ensureConversation(customerRef: string): Promise<string> {
    return ensureConversation(getDb(), {
      tenantId: this.tenantId,
      channelId: this.channelId,
      customerRef,
    });
  }
  addMessage(convId: string, role: MessageRole, text: string, meta?: Record<string, unknown>) {
    return addMessage(getDb(), { convId, role, text, meta });
  }
  createDraft(convId: string, proposedText: string, reason?: string) {
    return createDraft(getDb(), { convId, proposedText, reason });
  }
}

/** Build the customer agent for a tenant (RAG over its catalog + facts). */
export function agentForTenant(tenantId: string) {
  return makeCustomerAgent({
    retriever: new DbRetriever(getDb(), tenantId, embedder),
    responder: new CatalogResponder(),
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

  const sink = new DrizzleConversationSink(channel.tenantId, channelId);
  const agent = agentForTenant(channel.tenantId);
  const bot = buildTelegramBot(creds.token, {
    botInfo: creds.botInfo,
    onText: async ({ chatId, text }) => {
      const r = await handleCustomerText({ sink, agent }, { customerRef: String(chatId), text });
      return r.reply;
    },
  });
  await bot.handleUpdate(update);
  return { ok: true };
}
