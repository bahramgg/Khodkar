/** Usage metering + payments + subscriptions. Reads raw SQL, writes drizzle. */
import { sql } from 'drizzle-orm';
import type { Database } from './client.js';
import { usageEvents, payments, subscriptions } from './schema.js';
import type { Plan, UsageKind } from '@khodkar/shared';

// ── Usage metering ──────────────────────────────────────────────────────────

export async function recordUsage(
  db: Database,
  params: { tenantId: string; kind: UsageKind; qty: number; cost?: number | null },
): Promise<void> {
  await db.insert(usageEvents).values({
    tenantId: params.tenantId,
    kind: params.kind,
    qty: params.qty,
    cost: params.cost ?? null,
  });
}

/** Sum of `qty` for a kind since `since` (defaults to the start of this month). */
export async function sumUsage(
  db: Database,
  tenantId: string,
  kind: UsageKind,
): Promise<number> {
  const rows = (await db.execute(sql`
    select coalesce(sum(qty), 0)::int as n from usage_events
    where tenant_id = ${tenantId} and kind = ${kind}
      and created_at >= date_trunc('month', now())
  `)) as unknown as { n: number }[];
  return rows[0]?.n ?? 0;
}

// ── Payments ────────────────────────────────────────────────────────────────

export async function insertPayment(
  db: Database,
  params: { tenantId: string; authority: string; amount: number; plan: Plan },
): Promise<void> {
  await db.insert(payments).values({
    tenantId: params.tenantId,
    authority: params.authority,
    amount: params.amount,
    plan: params.plan,
    status: 'pending',
  });
}

export interface PaymentRow {
  id: string;
  tenantId: string;
  authority: string;
  amount: number;
  plan: Plan;
  status: string;
  refId: string | null;
}

export async function getPaymentByAuthority(
  db: Database,
  authority: string,
): Promise<PaymentRow | null> {
  const rows = (await db.execute(sql`
    select id, tenant_id as "tenantId", authority, amount, plan, status, ref_id as "refId"
    from payments where authority = ${authority} limit 1
  `)) as unknown as PaymentRow[];
  return rows[0] ?? null;
}

export async function setPaymentStatus(
  db: Database,
  authority: string,
  status: 'pending' | 'paid' | 'failed',
  refId?: string,
): Promise<void> {
  await db.execute(
    sql`update payments set status = ${status}, ref_id = ${refId ?? null} where authority = ${authority}`,
  );
}

// ── Subscriptions ─────────────────────────────────────────────────────────────

export async function insertSubscription(
  db: Database,
  params: { tenantId: string; plan: Plan; period: string; paidUntil: Date; gatewayRef?: string },
): Promise<void> {
  await db.insert(subscriptions).values({
    tenantId: params.tenantId,
    plan: params.plan,
    period: params.period,
    paidUntil: params.paidUntil,
    gatewayRef: params.gatewayRef,
  });
}

export async function setTenantPlan(db: Database, tenantId: string, plan: Plan): Promise<void> {
  await db.execute(
    sql`update tenants set plan = ${plan}::plan, updated_at = now() where id = ${tenantId}`,
  );
}

export interface BillingState {
  plan: Plan;
  paidUntil: string | null;
}

export async function getBillingState(db: Database, tenantId: string): Promise<BillingState | null> {
  const rows = (await db.execute(sql`
    select t.plan,
           (select s.paid_until from subscriptions s
             where s.tenant_id = t.id order by s.created_at desc limit 1) as "paidUntil"
    from tenants t where t.id = ${tenantId} limit 1
  `)) as unknown as BillingState[];
  return rows[0] ?? null;
}
