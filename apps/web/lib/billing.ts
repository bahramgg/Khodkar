/** Checkout orchestration (Zarinpal/mock) + usage metering. */
import 'server-only';
import {
  getDb,
  insertPayment,
  getPaymentByAuthority,
  setPaymentStatus,
  insertSubscription,
  setTenantPlan,
  recordUsage,
} from '@khodkar/db';
import {
  createPaymentGateway,
  planAmountRial,
  planPeriodDays,
  PLAN_CATALOG,
  type Plan,
} from '@khodkar/shared';
import { env } from './env.js';

const gateway = createPaymentGateway({
  provider: env.paymentProvider,
  merchantId: env.zarinpalMerchantId,
  sandbox: env.zarinpalSandbox,
});

function isPlan(p: string): p is Plan {
  return p in PLAN_CATALOG;
}

export type CheckoutResult =
  | { ok: true; url: string }
  | { ok: false; error: 'invalid_plan' | 'free_plan' | 'gateway_error' };

/** Start a paid-plan checkout; returns the gateway URL to redirect the user to. */
export async function startCheckout(tenantId: string, plan: string): Promise<CheckoutResult> {
  if (!isPlan(plan)) return { ok: false, error: 'invalid_plan' };
  const amount = planAmountRial(plan);
  if (amount <= 0) return { ok: false, error: 'free_plan' };

  try {
    const { authority, startUrl } = await gateway.request({
      amount,
      description: `اشتراک پلن ${plan} خودکار`,
      callbackUrl: `${env.appUrl}/api/billing/callback`,
    });
    await insertPayment(getDb(), { tenantId, authority, amount, plan });
    return { ok: true, url: startUrl };
  } catch {
    return { ok: false, error: 'gateway_error' };
  }
}

export type CompleteResult =
  | { ok: true; plan: Plan }
  | { ok: false; error: 'not_found' | 'cancelled' | 'verify_failed' };

/** Verify a returned payment and, on success, activate the subscription/plan. */
export async function completeCheckout(
  authority: string,
  status: string,
): Promise<CompleteResult> {
  const db = getDb();
  const payment = await getPaymentByAuthority(db, authority);
  if (!payment) return { ok: false, error: 'not_found' };
  if (payment.status === 'paid') return { ok: true, plan: payment.plan }; // idempotent

  if (status !== 'OK') {
    await setPaymentStatus(db, authority, 'failed');
    return { ok: false, error: 'cancelled' };
  }

  const v = await gateway.verify({ authority, amount: payment.amount });
  if (!v.ok) {
    await setPaymentStatus(db, authority, 'failed');
    return { ok: false, error: 'verify_failed' };
  }

  await setPaymentStatus(db, authority, 'paid', v.refId);
  const paidUntil = new Date(Date.now() + planPeriodDays(payment.plan) * 86_400_000);
  await insertSubscription(db, {
    tenantId: payment.tenantId,
    plan: payment.plan,
    period: PLAN_CATALOG[payment.plan].period,
    paidUntil,
    gatewayRef: v.refId,
  });
  await setTenantPlan(db, payment.tenantId, payment.plan);
  return { ok: true, plan: payment.plan };
}

/** Meter one handled customer message toward the tenant's usage. */
export async function recordMessageUsage(tenantId: string): Promise<void> {
  await recordUsage(getDb(), { tenantId, kind: 'msg', qty: 1 });
}
