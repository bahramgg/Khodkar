/**
 * Generic extractor — for non-Woo sites. Discovers product URLs from the
 * sitemap, then extracts each product from structured data on the page:
 * schema.org JSON-LD first (most reliable), then OpenGraph/meta fallbacks.
 * (LLM extraction on summarized HTML — §7 — plugs in here later.)
 */
import * as cheerio from 'cheerio';
import type { CrawlOptions, CrawlResult, CrawledProduct, Fetcher } from './types.js';
import { normalizeBase, absolutize } from './url.js';
import { parseAmount, toToman } from './price.js';

const SITEMAP_CANDIDATES = [
  '/sitemap.xml',
  '/sitemap_index.xml',
  '/wp-sitemap.xml',
  '/product-sitemap.xml',
];
const PRODUCT_URL_HINT = /\/(product|products|shop|p|item)\//i;

function toArray<T>(v: T | T[] | undefined | null): T[] {
  if (v === null || v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

/** Pull image URL(s) out of a JSON-LD image value (string | object | array). */
function jsonLdImages(image: unknown): string[] {
  return toArray(image as unknown[])
    .map((i) => {
      if (typeof i === 'string') return i;
      if (i && typeof i === 'object' && 'url' in i) return String((i as { url: unknown }).url);
      return '';
    })
    .filter(Boolean);
}

/** Extract price + currency from a JSON-LD `offers` value. */
function jsonLdOffer(offers: unknown): { price: number | null; currency?: string } {
  const first = toArray(offers as unknown[])[0] as Record<string, unknown> | undefined;
  if (!first) return { price: null };
  const spec = first.priceSpecification as Record<string, unknown> | undefined;
  const rawPrice = first.price ?? spec?.price;
  const currency = (first.priceCurrency ?? spec?.priceCurrency) as string | undefined;
  return { price: parseAmount(rawPrice as string | number), currency };
}

function findProductNode(json: unknown): Record<string, unknown> | null {
  const nodes: unknown[] = [];
  const visit = (n: unknown) => {
    if (Array.isArray(n)) return n.forEach(visit);
    if (n && typeof n === 'object') {
      nodes.push(n);
      const graph = (n as { '@graph'?: unknown })['@graph'];
      if (graph) visit(graph);
    }
  };
  visit(json);
  for (const n of nodes) {
    const type = (n as { '@type'?: unknown })['@type'];
    if (toArray(type as unknown[]).map(String).includes('Product')) {
      return n as Record<string, unknown>;
    }
  }
  return null;
}

/** Extract a single product from an HTML document. */
export function extractProductFromHtml(html: string, url: string): CrawledProduct | null {
  const $ = cheerio.load(html);

  // 1) schema.org Product via JSON-LD.
  let product: Record<string, unknown> | null = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (product) return;
    const raw = $(el).contents().text();
    if (!raw.trim()) return;
    try {
      product = findProductNode(JSON.parse(raw));
    } catch {
      /* ignore malformed JSON-LD */
    }
  });

  if (product) {
    const p = product as Record<string, unknown>;
    const { price, currency } = jsonLdOffer(p.offers);
    return {
      sku: (p.sku as string) || (p.mpn as string) || null,
      title: String(p.name ?? '').trim(),
      price: price === null ? null : toToman(price, currency),
      images: jsonLdImages(p.image),
      stock: null,
      inStock: true,
      attrs: { source: 'json-ld' },
      sourceUrl: url,
    };
  }

  // 2) OpenGraph / meta fallback.
  const meta = (name: string) =>
    $(`meta[property="${name}"]`).attr('content') ?? $(`meta[name="${name}"]`).attr('content');
  const title = meta('og:title') ?? $('h1').first().text().trim() ?? $('title').text().trim();
  const priceRaw = meta('product:price:amount') ?? meta('og:price:amount');
  const currency = meta('product:price:currency') ?? meta('og:price:currency');
  if (!title) return null;

  const price = parseAmount(priceRaw ?? null);
  return {
    sku: null,
    title: title.trim(),
    price: price === null ? null : toToman(price, currency),
    images: [meta('og:image')].filter((s): s is string => !!s),
    stock: null,
    inStock: true,
    attrs: { source: 'opengraph' },
    sourceUrl: url,
  };
}

function extractLocs(xml: string): string[] {
  const locs: string[] = [];
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) locs.push(m[1] as string);
  return locs;
}

/** Discover candidate product URLs from a site's sitemap(s). */
export async function discoverProductUrls(
  base: string,
  fetcher: Fetcher,
  maxUrls: number,
): Promise<string[]> {
  const found = new Set<string>();

  for (const path of SITEMAP_CANDIDATES) {
    if (found.size >= maxUrls) break;
    let res: Response;
    try {
      res = await fetcher(`${base}${path}`);
    } catch {
      continue;
    }
    if (!res.ok) continue;
    const xml = await res.text();
    const locs = extractLocs(xml);

    // Sitemap index → follow child sitemaps that look product-related.
    const childSitemaps = locs.filter((l) => /sitemap/i.test(l) && /\.xml/i.test(l));
    const isIndex = /<sitemapindex/i.test(xml) || childSitemaps.length === locs.length;

    if (isIndex && childSitemaps.length) {
      for (const child of childSitemaps) {
        if (found.size >= maxUrls) break;
        if (!/product/i.test(child)) continue;
        try {
          const cres = await fetcher(child);
          if (!cres.ok) continue;
          for (const loc of extractLocs(await cres.text())) {
            found.add(loc);
            if (found.size >= maxUrls) break;
          }
        } catch {
          /* skip */
        }
      }
    } else {
      const producty = /product/i.test(path);
      for (const loc of locs) {
        if (producty || PRODUCT_URL_HINT.test(loc)) found.add(loc);
        if (found.size >= maxUrls) break;
      }
    }
  }

  return [...found].slice(0, maxUrls);
}

/** Crawl a generic site: discover product URLs, then extract each. */
export async function crawlGeneric(baseUrl: string, opts: CrawlOptions = {}): Promise<CrawlResult> {
  const fetcher = opts.fetcher ?? fetch;
  const maxPages = opts.maxPages ?? 500;
  const base = normalizeBase(baseUrl);

  const warnings: string[] = [];
  const urls = await discoverProductUrls(base, fetcher, maxPages);
  if (urls.length === 0) warnings.push('no product URLs found in sitemap');

  const products: CrawledProduct[] = [];
  for (const url of urls) {
    const abs = absolutize(url, base);
    if (!abs) continue;
    try {
      const res = await fetcher(abs);
      if (!res.ok) {
        warnings.push(`${abs} → ${res.status}`);
        continue;
      }
      const product = extractProductFromHtml(await res.text(), abs);
      if (product && product.title) products.push(product);
    } catch (err) {
      warnings.push(`${abs} → ${(err as Error).message}`);
    }
  }

  return { source: 'generic', baseUrl: base, products, pagesFetched: urls.length, warnings };
}
