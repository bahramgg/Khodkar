/**
 * Tenant-scoping helpers — the master plan's "RLS-style scope in the repo layer".
 *
 * Rule (CLAUDE.md): every query against a tenant-owned table must be filtered by
 * `tenant_id`. `tenantScope(tenantId)` builds that predicate so call sites can't
 * forget it, and `assertOwned` guards writes/reads of a fetched row.
 */
import { eq } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';

/** Build an `eq(column, tenantId)` predicate for a table's `tenantId` column. */
export function tenantScope(tenantColumn: PgColumn, tenantId: string) {
  if (!tenantId) throw new Error('tenantScope requires a non-empty tenantId');
  return eq(tenantColumn, tenantId);
}

/**
 * Assert a fetched row belongs to `tenantId`. Throws on cross-tenant access —
 * a defence-in-depth check for code paths that load by primary key.
 */
export function assertOwned<T extends { tenantId: string | null }>(
  row: T | undefined | null,
  tenantId: string,
): T {
  if (!row || row.tenantId !== tenantId) {
    throw new Error('not found or not owned by tenant');
  }
  return row;
}
