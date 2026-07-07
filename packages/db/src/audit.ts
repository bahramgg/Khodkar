/** Audit trail of agent decisions + owner/system actions (§11). */
import { sql } from 'drizzle-orm';
import type { Database } from './client.js';
import { auditLog } from './schema.js';

export async function recordAudit(
  db: Database,
  params: {
    tenantId: string;
    convId?: string | null;
    actor: 'agent' | 'owner' | 'system';
    action: string;
    meta?: Record<string, unknown>;
  },
): Promise<void> {
  await db.insert(auditLog).values({
    tenantId: params.tenantId,
    convId: params.convId ?? null,
    actor: params.actor,
    action: params.action,
    meta: params.meta ?? {},
  });
}

export interface AuditRow {
  id: string;
  actor: string;
  action: string;
  meta: Record<string, unknown>;
  createdAt: string;
}

export async function listAudit(
  db: Database,
  tenantId: string,
  limit = 50,
): Promise<AuditRow[]> {
  return (await db.execute(sql`
    select id, actor, action, meta, created_at as "createdAt"
    from audit_log where tenant_id = ${tenantId}
    order by created_at desc limit ${limit}
  `)) as unknown as AuditRow[];
}
