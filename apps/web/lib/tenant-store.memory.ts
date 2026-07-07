/** In-memory {@link TenantStore} for tests. */
import type { Vertical, UserRole } from '@khodkar/shared';
import type { TenantStore, TenantSummary } from './tenant-store.js';

interface MemTenant {
  id: string;
  name: string;
  vertical: Vertical;
}
interface MemMembership {
  tenantId: string;
  userId: string;
  role: UserRole;
}
interface MemUser {
  id: string;
  tenantId: string | null;
  role: UserRole;
}

export class InMemoryTenantStore implements TenantStore {
  tenants: MemTenant[] = [];
  memberships: MemMembership[] = [];
  users: MemUser[] = [];
  private seq = 0;

  /** Seed a user so setActiveTenant has something to mutate (tests). */
  addUser(id: string): void {
    if (!this.users.find((u) => u.id === id)) {
      this.users.push({ id, tenantId: null, role: 'owner' });
    }
  }

  async createTenantWithOwner(params: {
    name: string;
    vertical: Vertical;
    ownerUserId: string;
  }): Promise<{ tenantId: string }> {
    const tenant: MemTenant = {
      id: `tenant_${++this.seq}`,
      name: params.name,
      vertical: params.vertical,
    };
    this.tenants.push(tenant);
    this.memberships.push({ tenantId: tenant.id, userId: params.ownerUserId, role: 'owner' });
    this.addUser(params.ownerUserId);
    const u = this.users.find((x) => x.id === params.ownerUserId)!;
    u.tenantId = tenant.id;
    u.role = 'owner';
    return { tenantId: tenant.id };
  }

  async listAccessibleTenants(userId: string): Promise<TenantSummary[]> {
    return this.memberships
      .filter((m) => m.userId === userId)
      .map((m) => {
        const t = this.tenants.find((x) => x.id === m.tenantId)!;
        return { id: t.id, name: t.name, vertical: t.vertical, role: m.role };
      });
  }

  async getMembershipRole(userId: string, tenantId: string): Promise<UserRole | null> {
    return this.memberships.find((m) => m.userId === userId && m.tenantId === tenantId)?.role ?? null;
  }

  async setActiveTenant(userId: string, tenantId: string, role: UserRole): Promise<void> {
    this.addUser(userId);
    const u = this.users.find((x) => x.id === userId)!;
    u.tenantId = tenantId;
    u.role = role;
  }
}
