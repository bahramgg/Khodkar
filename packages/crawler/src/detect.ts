/** Detect whether a site is a WooCommerce store or needs the generic path. */
import type { Fetcher, SourceKind } from './types.js';
import { normalizeBase } from './url.js';

export async function detectSource(baseUrl: string, fetcher: Fetcher = fetch): Promise<SourceKind> {
  const base = normalizeBase(baseUrl);
  try {
    const res = await fetcher(`${base}/wp-json/wc/store/products?per_page=1`);
    if (res.ok) {
      const data = (await res.json()) as unknown;
      if (Array.isArray(data)) return 'woocommerce';
    }
  } catch {
    /* not woo, or unreachable — fall through */
  }
  return 'generic';
}
