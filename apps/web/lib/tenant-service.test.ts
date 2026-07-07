import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryTenantStore } from './tenant-store.memory.js';
import {
  createTenant,
  switchTenant,
  listAccessibleTenants,
  type TenantDeps,
  type Actor,
} from './tenant-service.js';

let store: InMemoryTenantStore;
let deps: TenantDeps;
const actor: Actor = { userId: 'user_1', phone: '+989121234567' };

beforeEach(() => {
  store = new InMemoryTenantStore();
  deps = { store };
});

describe('createTenant', () => {
  it('creates a tenant, owner membership, active tenant, and a session', async () => {
    const res = await createTenant(deps, actor, { name: 'مزون آرزو', vertical: 'mazon' });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.session.tenantId).toBe(res.tenantId);
      expect(res.session.role).toBe('owner');
      expect(res.session.sub).toBe('user_1');
    }
    const list = await listAccessibleTenants(deps, 'user_1');
    expect(list).toHaveLength(1);
    expect(list[0]?.name).toBe('مزون آرزو');
    expect(list[0]?.role).toBe('owner');
  });

  it('trims and collapses whitespace in the name', async () => {
    const res = await createTenant(deps, actor, { name: '  مزون   آرزو  ', vertical: 'mazon' });
    expect(res.ok).toBe(true);
    const list = await listAccessibleTenants(deps, 'user_1');
    expect(list[0]?.name).toBe('مزون آرزو');
  });

  it('rejects an empty/too-short name', async () => {
    expect(await createTenant(deps, actor, { name: ' ', vertical: 'mazon' })).toEqual({
      ok: false,
      error: 'invalid_name',
    });
  });

  it('rejects an unknown vertical', async () => {
    expect(await createTenant(deps, actor, { name: 'Shop', vertical: 'spaceship' })).toEqual({
      ok: false,
      error: 'invalid_vertical',
    });
  });
});

describe('switchTenant (secure)', () => {
  it('switches into a tenant the user is a member of', async () => {
    const a = await createTenant(deps, actor, { name: 'شعبه ۱', vertical: 'mazon' });
    const b = await createTenant(deps, actor, { name: 'شعبه ۲', vertical: 'boutique' });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;

    const res = await switchTenant(deps, actor, a.tenantId);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.session.tenantId).toBe(a.tenantId);
  });

  it('refuses to switch into a tenant the user does not belong to', async () => {
    // A tenant owned by someone else.
    await store.createTenantWithOwner({ name: 'غریبه', vertical: 'mazon', ownerUserId: 'user_2' });
    const other = (await listAccessibleTenants(deps, 'user_2'))[0]!;

    const res = await switchTenant(deps, actor, other.id);
    expect(res).toEqual({ ok: false, error: 'forbidden' });
  });

  it('refuses to switch into a non-existent tenant', async () => {
    expect(await switchTenant(deps, actor, 'tenant_does_not_exist')).toEqual({
      ok: false,
      error: 'forbidden',
    });
  });

  it('lists all tenants a user can access', async () => {
    await createTenant(deps, actor, { name: 'شعبه یک', vertical: 'mazon' });
    await createTenant(deps, actor, { name: 'شعبه دو', vertical: 'jewelry' });
    const list = await listAccessibleTenants(deps, 'user_1');
    expect(list.map((t) => t.name).sort()).toEqual(['شعبه دو', 'شعبه یک'].sort());
  });
});
