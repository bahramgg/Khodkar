/** Crawler contracts — network-in, normalized-products-out. */

export type SourceKind = 'woocommerce' | 'generic' | 'unknown';

/** A product as extracted from a source, before it is persisted. */
export interface CrawledProduct {
  /** Seller SKU if the source exposes one; null when unknown. */
  sku: string | null;
  title: string;
  /** Price in Toman (major units), or null when it couldn't be extracted. */
  price: number | null;
  rentPrice?: number | null;
  deposit?: number | null;
  images: string[];
  /** Numeric stock if known; null when the source only says in/out of stock. */
  stock: number | null;
  inStock: boolean;
  attrs: Record<string, unknown>;
  sourceUrl?: string;
}

export interface CrawlResult {
  source: SourceKind;
  baseUrl: string;
  products: CrawledProduct[];
  pagesFetched: number;
  warnings: string[];
}

/**
 * Injectable fetch — defaults to the global `fetch`. Tests pass a fake so the
 * crawler runs with zero network. Signature matches the standard `fetch`.
 */
export type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

export interface CrawlOptions {
  fetcher?: Fetcher;
  /** Products per page (Woo Store API). */
  perPage?: number;
  /** Hard cap on pages/URLs so a hostile site can't run us forever. */
  maxPages?: number;
}
