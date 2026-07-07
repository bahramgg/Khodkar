/** Subscription plans (master-plan §13). Prices in Toman; quotas per period. */
import type { Plan } from './types.js';

export interface PlanQuotas {
  conversations: number;
  channels: number;
  catalog: number;
}

export interface PlanDef {
  id: Plan;
  priceToman: number;
  period: 'monthly' | 'yearly';
  quotas: PlanQuotas;
}

export const PLAN_CATALOG: Record<Plan, PlanDef> = {
  trial: { id: 'trial', priceToman: 0, period: 'monthly', quotas: { conversations: 50, channels: 1, catalog: 100 } },
  basic: { id: 'basic', priceToman: 2_500_000, period: 'monthly', quotas: { conversations: 1_000, channels: 2, catalog: 500 } },
  pro: { id: 'pro', priceToman: 6_000_000, period: 'monthly', quotas: { conversations: 5_000, channels: 5, catalog: 5_000 } },
};

/** Zarinpal amounts are in Rial; 1 Toman = 10 Rial. */
export function planAmountRial(plan: Plan): number {
  return PLAN_CATALOG[plan].priceToman * 10;
}

/** Days a paid period lasts. */
export function planPeriodDays(plan: Plan): number {
  return PLAN_CATALOG[plan].period === 'yearly' ? 365 : 30;
}
