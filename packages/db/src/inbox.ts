/**
 * Owner inbox: draft approval, leads, and unanswered questions. Reads use raw
 * SQL (tsx-safe + easy joins); writes use drizzle inserts. All tenant-scoped.
 */
import { eq, sql } from 'drizzle-orm';
import type { Database } from './client.js';
import { drafts, leads, facts, unansweredQuestions } from './schema.js';
import type { DraftStatus } from '@khodkar/shared';

// ── Drafts ────────────────────────────────────────────────────────────────────

export interface PendingDraft {
  draftId: string;
  proposedText: string;
  reason: string | null;
  createdAt: string;
  convId: string;
  customerRef: string;
  channelId: string | null;
  question: string | null;
}

export async function listPendingDrafts(db: Database, tenantId: string): Promise<PendingDraft[]> {
  return (await db.execute(sql`
    select d.id as "draftId", d.proposed_text as "proposedText", d.reason, d.created_at as "createdAt",
           c.id as "convId", c.customer_ref as "customerRef", c.channel_id as "channelId",
           (select m.text from messages m
             where m.conv_id = c.id and m.role = 'customer'
             order by m.created_at desc limit 1) as "question"
    from drafts d
    join conversations c on c.id = d.conv_id
    where c.tenant_id = ${tenantId} and d.status = 'pending'
    order by d.created_at desc
  `)) as unknown as PendingDraft[];
}

export async function countPendingDrafts(db: Database, tenantId: string): Promise<number> {
  const rows = (await db.execute(sql`
    select count(*)::int as n from drafts d
    join conversations c on c.id = d.conv_id
    where c.tenant_id = ${tenantId} and d.status = 'pending'
  `)) as unknown as { n: number }[];
  return rows[0]?.n ?? 0;
}

export interface DraftForResolve {
  draftId: string;
  proposedText: string;
  status: string;
  convId: string;
  customerRef: string;
  channelId: string | null;
  channelType: string | null;
  credentials: string | null;
}

/** Load a draft with its channel, scoped to the tenant (defence in depth). */
export async function getDraftForTenant(
  db: Database,
  draftId: string,
  tenantId: string,
): Promise<DraftForResolve | null> {
  const rows = (await db.execute(sql`
    select d.id as "draftId", d.proposed_text as "proposedText", d.status,
           c.id as "convId", c.customer_ref as "customerRef",
           ch.id as "channelId", ch.type as "channelType", ch.credentials
    from drafts d
    join conversations c on c.id = d.conv_id
    left join channels ch on ch.id = c.channel_id
    where d.id = ${draftId} and c.tenant_id = ${tenantId}
    limit 1
  `)) as unknown as DraftForResolve[];
  return rows[0] ?? null;
}

export async function setDraftStatus(
  db: Database,
  draftId: string,
  status: DraftStatus,
): Promise<void> {
  await db.execute(
    sql`update drafts set status = ${status}, updated_at = now() where id = ${draftId}`,
  );
}

// ── Leads ─────────────────────────────────────────────────────────────────────

/** Create a lead for a phone, or return the existing one (dedupe per tenant). */
export async function upsertLead(
  db: Database,
  params: { tenantId: string; phone: string; name?: string; source?: string },
): Promise<{ id: string; created: boolean }> {
  const existing = (await db.execute(
    sql`select id from leads where tenant_id = ${params.tenantId} and phone = ${params.phone} limit 1`,
  )) as unknown as { id: string }[];
  if (existing[0]) return { id: existing[0].id, created: false };

  const [row] = await db
    .insert(leads)
    .values({
      tenantId: params.tenantId,
      phone: params.phone,
      name: params.name,
      source: params.source,
    })
    .returning({ id: leads.id });
  if (!row) throw new Error('failed to create lead');
  return { id: row.id, created: true };
}

export async function countLeads(db: Database, tenantId: string): Promise<number> {
  const rows = (await db.execute(
    sql`select count(*)::int as n from leads where tenant_id = ${tenantId}`,
  )) as unknown as { n: number }[];
  return rows[0]?.n ?? 0;
}

/** Conversations started today (home "today chats" stat). */
export async function countTodayConversations(db: Database, tenantId: string): Promise<number> {
  const rows = (await db.execute(sql`
    select count(*)::int as n from conversations
    where tenant_id = ${tenantId} and created_at >= date_trunc('day', now())
  `)) as unknown as { n: number }[];
  return rows[0]?.n ?? 0;
}

// ── Unanswered questions ──────────────────────────────────────────────────────

/** Record an unanswered question (dedupes against an existing open one). */
export async function insertUnanswered(
  db: Database,
  params: { tenantId: string; question: string; convId?: string | null },
): Promise<void> {
  const q = params.question.trim();
  if (!q) return;
  const existing = (await db.execute(
    sql`select id from unanswered_questions
        where tenant_id = ${params.tenantId} and status = 'open' and question = ${q} limit 1`,
  )) as unknown as { id: string }[];
  if (existing[0]) return;

  await db.insert(unansweredQuestions).values({
    tenantId: params.tenantId,
    question: q,
    convId: params.convId ?? null,
  });
}

export interface UnansweredRow {
  id: string;
  question: string;
  createdAt: string;
}

export async function listUnanswered(db: Database, tenantId: string): Promise<UnansweredRow[]> {
  return (await db.execute(sql`
    select id, question, created_at as "createdAt"
    from unanswered_questions
    where tenant_id = ${tenantId} and status = 'open'
    order by created_at desc
  `)) as unknown as UnansweredRow[];
}

export async function getUnanswered(
  db: Database,
  id: string,
  tenantId: string,
): Promise<{ id: string; question: string } | null> {
  const rows = (await db.execute(
    sql`select id, question from unanswered_questions where id = ${id} and tenant_id = ${tenantId} limit 1`,
  )) as unknown as { id: string; question: string }[];
  return rows[0] ?? null;
}

export async function setUnansweredStatus(
  db: Database,
  id: string,
  status: 'open' | 'converted' | 'dismissed',
): Promise<void> {
  await db.execute(sql`update unanswered_questions set status = ${status} where id = ${id}`);
}

/** Insert a FAQ/fact for a tenant; returns its id (caller then embeds it). */
export async function insertFact(
  db: Database,
  params: { tenantId: string; q: string; a: string },
): Promise<string> {
  const [row] = await db
    .insert(facts)
    .values({ tenantId: params.tenantId, q: params.q, a: params.a })
    .returning({ id: facts.id });
  if (!row) throw new Error('failed to insert fact');
  return row.id;
}
