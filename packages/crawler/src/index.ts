/**
 * Catalog crawler entry point. `crawlSite` auto-detects the source and runs the
 * matching extractor, returning normalized products ready for import.
 */
import type { CrawlOptions, CrawlResult } from './types.js';
import { detectSource } from './detect.js';
import { crawlWoo } from './woocommerce.js';
import { crawlGeneric } from './generic.js';

export * from './types.js';
export * from './price.js';
export { detectSource } from './detect.js';
export { crawlWoo, normalizeWooProduct } from './woocommerce.js';
export { crawlGeneric, extractProductFromHtml, discoverProductUrls } from './generic.js';
export { normalizeBase } from './url.js';

/** Detect the source and crawl it. */
export async function crawlSite(baseUrl: string, opts: CrawlOptions = {}): Promise<CrawlResult> {
  const fetcher = opts.fetcher ?? fetch;
  const source = await detectSource(baseUrl, fetcher);
  return source === 'woocommerce' ? crawlWoo(baseUrl, opts) : crawlGeneric(baseUrl, opts);
}
