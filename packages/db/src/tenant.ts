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

/** Delete a tenant by name (idempotent seeding). Cascades to its rows. */
export async function deleteTenantByName(db: Database, name: string): Promise<void> {
  await db.execute(sql`delete from tenants where name = ${name}`);
}

/** Ids of all active tenants (used by scheduled jobs). */
export async function listActiveTenantIds(db: Database): Promise<string[]> {
  const rows = (await db.execute(
    sql`select id from tenants where status = 'active'`,
  )) as unknown as { id: string }[];
  return rows.map((r) => r.id);
}

/** Kill-switch: toggle the tenant's bot on/off (merges into settings jsonb). */
export async function setBotEnabled(
  db: Database,
  tenantId: string,
  enabled: boolean,
): Promise<void> {
  await db.execute(sql`
    update tenants
    set settings = coalesce(settings, '{}'::jsonb) || ${JSON.stringify({ botEnabled: enabled })}::jsonb,
        updated_at = now()
    where id = ${tenantId}
  `);
}

/** Whether the bot is enabled (defaults to true when unset). */
export async function isBotEnabled(db: Database, tenantId: string): Promise<boolean> {
  const rows = (await db.execute(
    sql`select coalesce((settings->>'botEnabled')::boolean, true) as enabled from tenants where id = ${tenantId} limit 1`,
  )) as unknown as { enabled: boolean }[];
  return rows[0]?.enabled ?? true;
}
