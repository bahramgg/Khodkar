/** Activation-funnel analytics (§16). Anonymous events allowed (null tenant). */
import { sql } from 'drizzle-orm';
import type { Database } from './client.js';
import { analyticsEvents } from './schema.js';

export async function recordEvent(
  db: Database,
  params: { event: string; tenantId?: string | null; meta?: Record<string, unknown> },
): Promise<void> {
  await db.insert(analyticsEvents).values({
    event: params.event,
    tenantId: params.tenantId ?? null,
    meta: params.meta ?? {},
  });
}

/** Count events of a type in the last `days` days. */
export async function countEvents(db: Database, event: string, days = 30): Promise<number> {
  const rows = (await db.execute(sql`
    select count(*)::int as n from analytics_events
    where event = ${event} and created_at >= now() - (${days} || ' days')::interval
  `)) as unknown as { n: number }[];
  return rows[0]?.n ?? 0;
}
