/** Weekly quality report: aggregate stats, storage, and owner-notify target. */
import { sql } from 'drizzle-orm';
import type { Database } from './client.js';
import { qualityReports } from './schema.js';

export interface ReportStats {
  conversations: number;
  autoSent: number;
  drafts: number;
  unanswered: number;
  leads: number;
}

/** Aggregate a tenant's activity over the last `days` days. */
export async function reportStats(
  db: Database,
  tenantId: string,
  days = 7,
): Promise<ReportStats> {
  const since = sql`now() - (${days} || ' days')::interval`;
  const rows = (await db.execute(sql`
    select
      (select count(*) from conversations c where c.tenant_id = ${tenantId} and c.created_at >= ${since})::int as "conversations",
      (select count(*) from messages m join conversations c on c.id = m.conv_id
        where c.tenant_id = ${tenantId} and m.role = 'agent' and m.meta->>'action' = 'send' and m.created_at >= ${since})::int as "autoSent",
      (select count(*) from drafts d join conversations c on c.id = d.conv_id
        where c.tenant_id = ${tenantId} and d.created_at >= ${since})::int as "drafts",
      (select count(*) from unanswered_questions u where u.tenant_id = ${tenantId} and u.created_at >= ${since})::int as "unanswered",
      (select count(*) from leads l where l.tenant_id = ${tenantId} and l.created_at >= ${since})::int as "leads"
  `)) as unknown as ReportStats[];
  return rows[0] ?? { conversations: 0, autoSent: 0, drafts: 0, unanswered: 0, leads: 0 };
}

export async function insertQualityReport(
  db: Database,
  params: {
    tenantId: string;
    week: string;
    score: number;
    issues: unknown[];
    missedSales: unknown[];
  },
): Promise<void> {
  await db
    .insert(qualityReports)
    .values({
      tenantId: params.tenantId,
      week: params.week,
      score: params.score,
      issues: params.issues,
      missedSales: params.missedSales,
    })
    .onConflictDoUpdate({
      target: [qualityReports.tenantId, qualityReports.week],
      set: {
        score: sql`excluded.score`,
        issues: sql`excluded.issues`,
        missedSales: sql`excluded.missed_sales`,
      },
    });
}

export interface OwnerTelegramTarget {
  chatId: number;
  credentials: string;
}

/** The owner's Telegram chat + the tenant's bot creds, if both exist. */
export async function getOwnerTelegramTarget(
  db: Database,
  tenantId: string,
): Promise<OwnerTelegramTarget | null> {
  const rows = (await db.execute(sql`
    select u.tg_chat_id as "chatId", ch.credentials
    from users u
    join channels ch on ch.tenant_id = u.tenant_id and ch.type = 'telegram' and ch.status = 'active'
    where u.tenant_id = ${tenantId} and u.role = 'owner' and u.tg_chat_id is not null
    limit 1
  `)) as unknown as OwnerTelegramTarget[];
  return rows[0] ?? null;
}
