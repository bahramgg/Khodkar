import { fa, toPersianDigits, formatToman, PLAN_CATALOG, type Plan } from '@khodkar/shared';
import { getDb, getBillingState, sumUsage } from '@khodkar/db';
import { requireTenant } from '@/lib/tenant';
import { BillingActions } from '../billing-actions';

export const runtime = 'nodejs';

const ORDER: Plan[] = ['trial', 'basic', 'pro'];

export default async function BillingPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const { tenant } = await requireTenant();
  const db = getDb();
  const [billing, msgs] = await Promise.all([
    getBillingState(db, tenant.id),
    sumUsage(db, tenant.id, 'msg'),
  ]);
  const current = billing?.plan ?? 'trial';

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-bold">{fa.plans.title}</h2>
        <p className="text-sm text-ink-muted">{fa.plans.usageThisMonth(toPersianDigits(msgs))}</p>
      </div>

      {searchParams.status === 'success' && (
        <p className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {fa.plans.success}
        </p>
      )}
      {searchParams.status === 'failed' && (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {fa.plans.failed}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {ORDER.map((id) => {
          const def = PLAN_CATALOG[id];
          const isCurrent = id === current;
          return (
            <div
              key={id}
              className={`rounded-2xl border p-4 ${
                isCurrent ? 'border-accent bg-accent/5' : 'border-surface-border bg-surface-card'
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-bold">{fa.plans.names[id]}</span>
                <span className="nums text-sm text-accent-ink">
                  {def.priceToman === 0
                    ? fa.plans.free
                    : `${formatToman(def.priceToman)} / ماه`}
                </span>
              </div>
              <ul className="mb-3 flex flex-col gap-1 text-sm text-ink-muted">
                {fa.plans.features[id].map((f) => (
                  <li key={f}>• {f}</li>
                ))}
              </ul>
              {isCurrent ? (
                <span className="inline-block rounded-full bg-accent/15 px-3 py-1 text-xs text-accent-ink">
                  {fa.plans.current}
                </span>
              ) : (
                def.priceToman > 0 && <BillingActions plan={id} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
