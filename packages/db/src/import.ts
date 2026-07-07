/**
 * Catalog import — upsert crawled products into a tenant's catalog.
 * Scoped by `tenant_id`; dedupes on the `(tenant_id, sku)` unique index so
 * re-crawling a site updates existing rows instead of duplicating them.
 */
import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import type { Database } from './client.js';
import { products } from './schema.js';

export interface ImportItem {
  sku: string | null;
  title: string;
  price: number | null;
  rentPrice?: number | null;
  deposit?: number | null;
  stock?: number | null;
  images?: string[];
  attrs?: Record<string, unknown>;
}

/** Stable synthetic SKU for products a source didn't give one. */
function synthSku(title: string): string {
  return `auto:${createHash('sha1').update(title).digest('hex').slice(0, 16)}`;
}

const CHUNK = 500;

/**
 * Upsert `items` into `tenantId`'s catalog. Returns the number of rows written.
 * Products without a SKU get a deterministic one derived from their title.
 */
export async function importProducts(
  db: Database,
  tenantId: string,
  items: ImportItem[],
): Promise<{ processed: number }> {
  if (items.length === 0) return { processed: 0 };

  const rows = items
    .filter((it) => it.title.trim().length > 0)
    .map((it) => ({
      tenantId,
      sku: it.sku && it.sku.length > 0 ? it.sku : synthSku(it.title),
      title: it.title,
      price: it.price ?? null,
      rentPrice: it.rentPrice ?? null,
      deposit: it.deposit ?? null,
      stock: it.stock ?? 0,
      images: it.images ?? [],
      attrs: it.attrs ?? {},
    }));

  // De-dupe within this batch by sku (last one wins) so a single INSERT ...
  // ON CONFLICT statement never hits the same (tenant, sku) twice.
  const bySku = new Map<string, (typeof rows)[number]>();
  for (const r of rows) bySku.set(r.sku, r);
  const deduped = [...bySku.values()];

  let processed = 0;
  for (let i = 0; i < deduped.length; i += CHUNK) {
    const chunk = deduped.slice(i, i + CHUNK);
    await db
      .insert(products)
      .values(chunk)
      .onConflictDoUpdate({
        target: [products.tenantId, products.sku],
        set: {
          title: sql`excluded.title`,
          price: sql`excluded.price`,
          rentPrice: sql`excluded.rent_price`,
          deposit: sql`excluded.deposit`,
          stock: sql`excluded.stock`,
          images: sql`excluded.images`,
          attrs: sql`excluded.attrs`,
          updatedAt: sql`now()`,
        },
      });
    processed += chunk.length;
  }

  return { processed };
}
