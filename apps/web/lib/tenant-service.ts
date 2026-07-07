/**
 * Tenant orchestration — create a tenant and securely switch the active one.
 * "Secure" = switching is allowed only to a tenant the user has a membership
 * in; otherwise it's rejected. Depends only on {@link TenantStore}.
 */
import { VERTICALS, type SessionPayload, type Vertical } from '@khodkar/shared';
import type { TenantStore, TenantSummary } from './tenant-store.js';

export const MAX_TENANT_NAME = 80;

export interface TenantDeps {
  store: TenantStore;
}

/** The authenticated user context a tenant action runs on behalf of. */
export interface Actor {
  userId: string;
  phone: string;
}

function cleanName(raw: string): string | null {
  const name = (raw ?? '').trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > MAX_TENANT_NAME) return null;
  return name;
}

function isVertical(v: string): v is Vertical {
  return (VERTICALS as readonly string[]).includes(v);
}

export type CreateTenantResult =
  | { ok: true; tenantId: string; session: SessionPayload }
  | { ok: false; error: 'invalid_name' | 'invalid_vertical' };

export async function createTenant(
  deps: TenantDeps,
  actor: Actor,
  input: { name: string; vertical: string },
): Promise<CreateTenantResult> {
  const name = cleanName(input.name);
  if (!name) return { ok: false, error: 'invalid_name' };
  if (!isVertical(input.vertical)) return { ok: false, error: 'invalid_vertical' };

  const { tenantId } = await deps.store.createTenantWithOwner({
    name,
    vertical: input.vertical,
    ownerUserId: actor.userId,
  });

  const session: SessionPayload = {
    sub: actor.userId,
    tenantId,
    phone: actor.phone,
    role: 'owner',
  };
  return { ok: true, tenantId, session };
}

export type SwitchTenantResult =
  | { ok: true; session: SessionPayload }
  | { ok: false; error: 'forbidden' };

export async function switchTenant(
  deps: TenantDeps,
  actor: Actor,
  tenantId: string,
): Promise<SwitchTenantResult> {
  // Secure check: only members may switch in.
  const role = await deps.store.getMembershipRole(actor.userId, tenantId);
  if (!role) return { ok: false, error: 'forbidden' };

  await deps.store.setActiveTenant(actor.userId, tenantId, role);
  const session: SessionPayload = { sub: actor.userId, tenantId, phone: actor.phone, role };
  return { ok: true, session };
}

export function listAccessibleTenants(
  deps: TenantDeps,
  userId: string,
): Promise<TenantSummary[]> {
  return deps.store.listAccessibleTenants(userId);
}
