/**
 * WooCommerce extractor — uses the public Store API
 * (`/wp-json/wc/store/products`), which returns structured, paginated product
 * data with no auth. This is the reliable "structured path" from §7.
 */
import type { CrawlOptions, CrawlResult, CrawledProduct } from './types.js';
import { normalizeBase } from './url.js';
import { fromMinorUnits, toToman } from './price.js';

const STORE_PRODUCTS = '/wp-json/wc/store/products';

interface WooImage {
  src?: string;
}
interface WooPrices {
  price?: string;
  regular_price?: string;
  sale_price?: string;
  currency_code?: string;
  currency_minor_unit?: number;
}
interface WooProduct {
  id?: number;
  name?: string;
  sku?: string;
  permalink?: string;
  prices?: WooPrices;
  images?: WooImage[];
  is_in_stock?: boolean;
  stock_quantity?: number | null;
  categories?: { name?: string }[];
}

/** Normalize one Store-API product to our shape (prices → Toman). */
export function normalizeWooProduct(p: WooProduct, warnings: string[]): CrawledProduct {
  const prices = p.prices ?? {};
  const minor = prices.currency_minor_unit ?? 0;
  const major = fromMinorUnits(prices.price ?? prices.regular_price, minor);
  const price = major === null ? null : toToman(major, prices.currency_code);
  if (price === null) warnings.push(`no price for "${p.name ?? p.sku ?? p.id}"`);

  return {
    sku: p.sku && p.sku.length > 0 ? p.sku : null,
    title: (p.name ?? '').trim(),
    price,
    images: (p.images ?? []).map((i) => i.src).filter((s): s is string => !!s),
    stock: typeof p.stock_quantity === 'number' ? p.stock_quantity : null,
    inStock: p.is_in_stock ?? true,
    attrs: {
      permalink: p.permalink,
      categories: (p.categories ?? []).map((c) => c.name).filter(Boolean),
    },
    sourceUrl: p.permalink,
  };
}

/** Crawl every product page of a WooCommerce store. */
export async function crawlWoo(baseUrl: string, opts: CrawlOptions = {}): Promise<CrawlResult> {
  const fetcher = opts.fetcher ?? fetch;
  const perPage = opts.perPage ?? 100;
  const maxPages = opts.maxPages ?? 50;
  const base = normalizeBase(baseUrl);

  const products: CrawledProduct[] = [];
  const warnings: string[] = [];
  let pagesFetched = 0;

  for (let page = 1; page <= maxPages; page++) {
    const url = `${base}${STORE_PRODUCTS}?per_page=${perPage}&page=${page}`;
    const res = await fetcher(url);
    if (!res.ok) {
      if (page === 1) throw new Error(`WooCommerce Store API returned ${res.status}`);
      warnings.push(`page ${page} returned ${res.status}, stopping`);
      break;
    }
    const batch = (await res.json()) as unknown;
    if (!Array.isArray(batch) || batch.length === 0) break;

    pagesFetched++;
    for (const p of batch) products.push(normalizeWooProduct(p as WooProduct, warnings));
    if (batch.length < perPage) break; // last page
  }

  return { source: 'woocommerce', baseUrl: base, products, pagesFetched, warnings };
}
