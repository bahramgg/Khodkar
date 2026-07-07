/** Pilot feedback: NPS + bug/idea list (§15 week 12). */
import { sql } from 'drizzle-orm';
import type { Database } from './client.js';
import { npsResponses, feedback } from './schema.js';

// ── NPS ───────────────────────────────────────────────────────────────────────

export async function insertNps(
  db: Database,
  params: { tenantId: string; source?: string; score: number; comment?: string },
): Promise<void> {
  await db.insert(npsResponses).values({
    tenantId: params.tenantId,
    source: params.source ?? 'owner',
    score: params.score,
    comment: params.comment,
  });
}

export interface NpsSummary {
  responses: number;
  promoters: number;
  detractors: number;
  passives: number;
  /** NPS = %promoters − %detractors, range −100..100. */
  nps: number;
}

/** Net Promoter Score across all tenants (or one if `tenantId` given). */
export async function npsSummary(db: Database, tenantId?: string): Promise<NpsSummary> {
  const scope = tenantId ? sql`where tenant_id = ${tenantId}` : sql``;
  const rows = (await db.execute(sql`
    select
      count(*)::int as responses,
      count(*) filter (where score >= 9)::int as promoters,
      count(*) filter (where score <= 6)::int as detractors,
      count(*) filter (where score in (7,8))::int as passives
    from nps_responses ${scope}
  `)) as unknown as { responses: number; promoters: number; detractors: number; passives: number }[];
  const r = rows[0] ?? { responses: 0, promoters: 0, detractors: 0, passives: 0 };
  const nps = r.responses > 0 ? Math.round(((r.promoters - r.detractors) / r.responses) * 100) : 0;
  return { ...r, nps };
}

// ── Feedback / bug list ─────────────────────────────────────────────────────────

export async function insertFeedback(
  db: Database,
  params: { tenantId?: string | null; kind: string; text: string },
): Promise<void> {
  await db.insert(feedback).values({
    tenantId: params.tenantId ?? null,
    kind: params.kind,
    text: params.text,
  });
}

export interface FeedbackRow {
  id: string;
  kind: string;
  text: string;
  status: string;
  createdAt: string;
}

export async function listFeedback(
  db: Database,
  opts: { status?: string; limit?: number } = {},
): Promise<FeedbackRow[]> {
  const scope = opts.status ? sql`where status = ${opts.status}` : sql``;
  return (await db.execute(sql`
    select id, kind, text, status, created_at as "createdAt"
    from feedback ${scope}
    order by created_at desc limit ${opts.limit ?? 100}
  `)) as unknown as FeedbackRow[];
}
