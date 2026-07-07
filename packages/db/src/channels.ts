/**
 * Channel + conversation persistence used by the messaging channels
 * (Telegram first). `credentials` is always an encrypted blob produced by the
 * caller (never plaintext here).
 */
import { sql } from 'drizzle-orm';
import type { Database } from './client.js';
import { channels, conversations, messages, drafts } from './schema.js';
import type { ChannelType, ChannelStatus, MessageRole } from '@khodkar/shared';

export interface ChannelRow {
  id: string;
  tenantId: string;
  type: ChannelType;
  credentials: string | null;
  status: string;
}

/** Insert or update the tenant's channel of a given type; returns its id. */
export async function upsertChannel(
  db: Database,
  params: { tenantId: string; type: ChannelType; credentials: string; status?: ChannelStatus },
): Promise<string> {
  const existing = (await db.execute(
    sql`select id from channels where tenant_id = ${params.tenantId} and type = ${params.type} limit 1`,
  )) as unknown as { id: string }[];

  if (existing[0]) {
    await db.execute(
      sql`update channels set credentials = ${params.credentials}, status = ${params.status ?? 'active'}, updated_at = now() where id = ${existing[0].id}`,
    );
    return existing[0].id;
  }

  const [row] = await db
    .insert(channels)
    .values({
      tenantId: params.tenantId,
      type: params.type,
      credentials: params.credentials,
      status: params.status ?? 'active',
    })
    .returning({ id: channels.id });
  if (!row) throw new Error('failed to upsert channel');
  return row.id;
}

export async function getChannelById(db: Database, channelId: string): Promise<ChannelRow | null> {
  const rows = (await db.execute(
    sql`select id, tenant_id as "tenantId", type, credentials, status from channels where id = ${channelId} limit 1`,
  )) as unknown as ChannelRow[];
  return rows[0] ?? null;
}

export async function getActiveChannel(
  db: Database,
  tenantId: string,
  type: ChannelType,
): Promise<ChannelRow | null> {
  const rows = (await db.execute(
    sql`select id, tenant_id as "tenantId", type, credentials, status
        from channels
        where tenant_id = ${tenantId} and type = ${type} and status = 'active'
        limit 1`,
  )) as unknown as ChannelRow[];
  return rows[0] ?? null;
}

/** Find the open conversation for a customer on a channel, or create one. */
export async function ensureConversation(
  db: Database,
  params: { tenantId: string; channelId: string; customerRef: string },
): Promise<string> {
  const existing = (await db.execute(
    sql`select id from conversations
        where tenant_id = ${params.tenantId} and channel_id = ${params.channelId}
          and customer_ref = ${params.customerRef} and status = 'open'
        order by created_at desc limit 1`,
  )) as unknown as { id: string }[];
  if (existing[0]) return existing[0].id;

  const [row] = await db
    .insert(conversations)
    .values({
      tenantId: params.tenantId,
      channelId: params.channelId,
      customerRef: params.customerRef,
      status: 'open',
    })
    .returning({ id: conversations.id });
  if (!row) throw new Error('failed to create conversation');
  return row.id;
}

export async function addMessage(
  db: Database,
  params: { convId: string; role: MessageRole; text: string; meta?: Record<string, unknown> },
): Promise<void> {
  await db.insert(messages).values({
    convId: params.convId,
    role: params.role,
    text: params.text,
    meta: params.meta ?? {},
  });
}

export async function createDraft(
  db: Database,
  params: { convId: string; proposedText: string; reason?: string },
): Promise<void> {
  await db.insert(drafts).values({
    convId: params.convId,
    proposedText: params.proposedText,
    reason: params.reason,
    status: 'pending',
  });
}
