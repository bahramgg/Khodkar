/**
 * Storage boundary for tenant creation + membership-based access, so the
 * tenant service is testable with an in-memory fake (see tenant-store.memory).
 */
import { and, eq } from 'drizzle-orm';
import { tenants, memberships, users, type Database } from '@khodkar/db';
import type { Vertical, UserRole } from '@khodkar/shared';

export interface TenantSummary {
  id: string;
  name: string;
  vertical: Vertical;
  role: UserRole;
}

export interface TenantStore {
  /** Create a tenant, make `ownerUserId` its owner, and set it active. */
  createTenantWithOwner(params: {
    name: string;
    vertical: Vertical;
    ownerUserId: string;
  }): Promise<{ tenantId: string }>;
  /** Tenants the user may access (via membership), with their role in each. */
  listAccessibleTenants(userId: string): Promise<TenantSummary[]>;
  /** The user's role in a tenant, or null if they are not a member. */
  getMembershipRole(userId: string, tenantId: string): Promise<UserRole | null>;
  /** Point the user's active tenant at `tenantId` (+ mirror their role). */
  setActiveTenant(userId: string, tenantId: string, role: UserRole): Promise<void>;
}

export class DrizzleTenantStore implements TenantStore {
  constructor(private readonly db: Database) {}

  async createTenantWithOwner(params: {
    name: string;
    vertical: Vertical;
    ownerUserId: string;
  }): Promise<{ tenantId: string }> {
    return this.db.transaction(async (tx) => {
      const [tenant] = await tx
        .insert(tenants)
        .values({ name: params.name, vertical: params.vertical, status: 'onboarding' })
        .returning();
      if (!tenant) throw new Error('failed to create tenant');

      await tx
        .insert(memberships)
        .values({ tenantId: tenant.id, userId: params.ownerUserId, role: 'owner' });

      await tx
        .update(users)
        .set({ tenantId: tenant.id, role: 'owner' })
        .where(eq(users.id, params.ownerUserId));

      return { tenantId: tenant.id };
    });
  }

  async listAccessibleTenants(userId: string): Promise<TenantSummary[]> {
    const rows = await this.db
      .select({
        id: tenants.id,
        name: tenants.name,
        vertical: tenants.vertical,
        role: memberships.role,
      })
      .from(memberships)
      .innerJoin(tenants, eq(tenants.id, memberships.tenantId))
      .where(eq(memberships.userId, userId));
    return rows;
  }

  async getMembershipRole(userId: string, tenantId: string): Promise<UserRole | null> {
    const rows = await this.db
      .select({ role: memberships.role })
      .from(memberships)
      .where(and(eq(memberships.userId, userId), eq(memberships.tenantId, tenantId)))
      .limit(1);
    return rows[0]?.role ?? null;
  }

  async setActiveTenant(userId: string, tenantId: string, role: UserRole): Promise<void> {
    await this.db.update(users).set({ tenantId, role }).where(eq(users.id, userId));
  }
}
