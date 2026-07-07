/** Tenant-level mutations used by onboarding (tone profile, status, vertical). */
import { sql } from 'drizzle-orm';
import type { Database } from './client.js';
import type { TenantStatus, ToneProfile } from '@khodkar/shared';

export async function setTenantToneProfile(
  db: Database,
  tenantId: string,
  tone: ToneProfile,
): Promise<void> {
  await db.execute(
    sql`update tenants set tone_profile = ${JSON.stringify(tone)}::jsonb, updated_at = now() where id = ${tenantId}`,
  );
}

export async function setTenantStatus(
  db: Database,
  tenantId: string,
  status: TenantStatus,
): Promise<void> {
  await db.execute(
    sql`update tenants set status = ${status}::tenant_status, updated_at = now() where id = ${tenantId}`,
  );
}

export async function getTenantMeta(
  db: Database,
  tenantId: string,
): Promise<{ vertical: string; status: string } | null> {
  const rows = (await db.execute(
    sql`select vertical, status from tenants where id = ${tenantId} limit 1`,
  )) as unknown as { vertical: string; status: string }[];
  return rows[0] ?? null;
}
