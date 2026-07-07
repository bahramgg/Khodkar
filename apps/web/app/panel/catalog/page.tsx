import { fa, toPersianDigits, formatToman } from '@khodkar/shared';
import { requireTenant, listTenantProducts } from '@/lib/tenant';
import { EmptyState } from '../empty-state';

export const runtime = 'nodejs';

export default async function CatalogPage() {
  const { tenant } = await requireTenant();
  const items = await listTenantProducts(tenant.id);

  if (items.length === 0) {
    return <EmptyState title={fa.panel.catalog.title} message={fa.panel.catalog.empty} />;
  }

  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-bold">{fa.panel.catalog.title}</h2>
        <span className="text-sm text-ink-muted">
          {fa.panel.catalog.count(toPersianDigits(items.length))}
        </span>
      </div>

      <ul className="grid grid-cols-2 gap-3">
        {items.map((p) => (
          <li
            key={p.id}
            className="flex flex-col gap-1 rounded-2xl border border-surface-border bg-surface-card p-3"
          >
            <span className="line-clamp-2 text-sm font-medium">{p.title}</span>
            {p.sku && (
              <span className="text-xs text-ink-muted" dir="ltr">
                {p.sku}
              </span>
            )}
            {p.price != null && (
              <span className="nums mt-1 text-sm text-accent-ink">{formatToman(p.price)}</span>
            )}
            {p.rentPrice != null && (
              <span className="nums text-xs text-ink-muted">
                {fa.panel.catalog.rent}: {formatToman(p.rentPrice)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
