/** Web-widget channel: provisioning + message handling for external sites. */
import 'server-only';
import { getDb, upsertChannel, getActiveChannel, getChannelById } from '@khodkar/db';
import { handleCustomerText } from '@khodkar/channels';
import { agentForTenant } from './telegram.js';
import { makeConversationSink } from './conversation-sink.js';
import { recordLeadFromText } from './inbox.js';

/** The widget key is the web channel's id (a public, unguessable uuid). */
export async function ensureWebChannel(tenantId: string): Promise<string> {
  const existing = await getActiveChannel(getDb(), tenantId, 'web');
  if (existing) return existing.id;
  return upsertChannel(getDb(), { tenantId, type: 'web', credentials: '', status: 'active' });
}

export async function getWebChannelKey(tenantId: string): Promise<string | null> {
  const ch = await getActiveChannel(getDb(), tenantId, 'web');
  return ch?.id ?? null;
}

// Light in-memory rate limit per (key, session): N messages / window.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 15;
const hits = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  hits.set(key, arr);
  return arr.length > MAX_PER_WINDOW;
}

export type WidgetResult =
  | { ok: true; reply: string; action: string }
  | { ok: false; error: 'unknown_widget' | 'rate_limited' };

/** Handle one widget message: resolve the tenant by key, run the agent. */
export async function handleWidgetMessage(
  key: string,
  sessionId: string,
  text: string,
): Promise<WidgetResult> {
  const channel = await getChannelById(getDb(), key);
  if (!channel || channel.type !== 'web' || channel.status !== 'active') {
    return { ok: false, error: 'unknown_widget' };
  }
  if (rateLimited(`${key}:${sessionId}`)) return { ok: false, error: 'rate_limited' };

  await recordLeadFromText(channel.tenantId, text, 'web');
  const sink = makeConversationSink(channel.tenantId, key);
  const agent = agentForTenant(channel.tenantId);
  const r = await handleCustomerText(
    { sink, agent },
    { customerRef: `web:${sessionId}`, text },
  );
  return { ok: true, reply: r.reply, action: r.action };
}
