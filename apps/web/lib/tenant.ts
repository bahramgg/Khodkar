/** Production tenant wiring + server-side active-tenant guard. */
import 'server-only';
import { redirect } from 'next/navigation';
import { and, eq, sql } from 'drizzle-orm';
import { getDb, tenants, products } from '@khodkar/db';
import type { Vertical } from '@khodkar/shared';
import { DrizzleTenantStore } from './tenant-store.js';
import { listAccessibleTenants, type TenantDeps } from './tenant-service.js';
import { requireSession } from './session.js';

let _deps: TenantDeps | null = null;

export function buildTenantDeps(): TenantDeps {
  if (!_deps) _deps = { store: new DrizzleTenantStore(getDb()) };
  return _deps;
}

export interface ActiveTenant {
  id: string;
  name: string;
  vertical: Vertical;
  status: string;
}

/**
 * Require a session AND an active tenant the user is a member of.
 * - no session → /login
 * - session but no active tenant → /onboarding
 * - active tenant the user isn't a member of → /onboarding (defence in depth)
 */
export async function requireTenant(): Promise<{
  session: Awaited<ReturnType<typeof requireSession>>;
  tenant: ActiveTenant;
}> {
  const session = await requireSession();
  if (!session.tenantId) redirect('/onboarding');

  const deps = buildTenantDeps();
  const role = await deps.store.getMembershipRole(session.sub, session.tenantId);
  if (!role) redirect('/onboarding');

  const db = getDb();
  const [row] = await db
    .select({
      id: tenants.id,
      name: tenants.name,
      vertical: tenants.vertical,
      status: tenants.status,
    })
    .from(tenants)
    .where(eq(tenants.id, session.tenantId))
    .limit(1);
  if (!row) redirect('/onboarding');

  return { session, tenant: row };
}

/** Tenants the current user can switch between (for the header switcher). */
export async function getSwitchableTenants(userId: string) {
  return listAccessibleTenants(buildTenantDeps(), userId);
}

/** Count of products in the active tenant — tenant-scoped (catalog page). */
export async function countTenantProducts(tenantId: string): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(products)
    .where(eq(products.tenantId, tenantId));
  return rows[0]?.n ?? 0;
}

/** First page of products for the active tenant — tenant-scoped. */
export async function listTenantProducts(tenantId: string, limit = 60) {
  const db = getDb();
  return db
    .select({
      id: products.id,
      title: products.title,
      sku: products.sku,
      price: products.price,
      rentPrice: products.rentPrice,
      stock: products.stock,
    })
    .from(products)
    .where(and(eq(products.tenantId, tenantId)))
    .orderBy(products.sku)
    .limit(limit);
}
