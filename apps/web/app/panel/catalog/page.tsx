import { requireTenant, listTenantProducts } from '@/lib/tenant';
import { ensureWebChannel } from '@/lib/widget';
import { env } from '@/lib/env';
import { WidgetSnippet } from '../widget-snippet';
import { CatalogManager } from '../catalog-manager';

export const runtime = 'nodejs';

export default async function CatalogPage() {
  const { tenant } = await requireTenant();
  const [items, key] = await Promise.all([
    listTenantProducts(tenant.id, 200),
    ensureWebChannel(tenant.id),
  ]);

  const base = env.appUrl || 'https://YOUR-PANEL';
  const snippet = `<script src="${base}/w.js" data-key="${key}"></script>`;

  return (
    <div className="flex flex-col gap-8">
      <WidgetSnippet snippet={snippet} />
      <CatalogManager
        items={items.map((p) => ({
          id: p.id,
          title: p.title,
          sku: p.sku,
          price: p.price,
          rentPrice: p.rentPrice,
        }))}
      />
    </div>
  );
}
