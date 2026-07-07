import { describe, it, expect } from 'vitest';
import { extractProductFromHtml, discoverProductUrls, crawlGeneric } from './generic.js';
import type { Fetcher } from './types.js';

describe('extractProductFromHtml', () => {
  it('extracts a schema.org Product from JSON-LD', () => {
    const html = `<html><head><script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'انگشتر طلا',
      sku: 'R-1',
      image: ['https://s/i1.jpg'],
      offers: { '@type': 'Offer', price: '2500000', priceCurrency: 'IRT' },
    })}</script></head><body></body></html>`;
    const p = extractProductFromHtml(html, 'https://s/product/r-1');
    expect(p).toMatchObject({ sku: 'R-1', title: 'انگشتر طلا', price: 2500000 });
    expect(p?.images).toEqual(['https://s/i1.jpg']);
  });

  it('finds a Product inside an @graph', () => {
    const html = `<script type="application/ld+json">${JSON.stringify({
      '@graph': [
        { '@type': 'WebPage', name: 'p' },
        { '@type': 'Product', name: 'گردنبند', offers: { price: '900000', priceCurrency: 'IRR' } },
      ],
    })}</script>`;
    const p = extractProductFromHtml(html, 'https://s/product/n');
    expect(p?.title).toBe('گردنبند');
    expect(p?.price).toBe(90000); // rial → toman
  });

  it('falls back to OpenGraph meta tags', () => {
    const html = `<html><head>
      <meta property="og:title" content="کیف چرم">
      <meta property="product:price:amount" content="۱٬۸۰۰٬۰۰۰">
      <meta property="product:price:currency" content="IRR">
      <meta property="og:image" content="https://s/bag.jpg">
    </head></html>`;
    const p = extractProductFromHtml(html, 'https://s/p/bag');
    expect(p).toMatchObject({ title: 'کیف چرم', price: 180000 });
    expect(p?.attrs.source).toBe('opengraph');
  });

  it('returns null when there is no product signal', () => {
    expect(extractProductFromHtml('<html><body>hi</body></html>', 'https://s/x')).toBeNull();
  });
});

/** Fake site: sitemap index → product sitemap → JSON-LD product pages. */
function fakeGenericFetcher(count: number): Fetcher {
  const urls = Array.from({ length: count }, (_, i) => `https://shop.example/product/item-${i + 1}`);
  return async (url: string) => {
    if (url.endsWith('/sitemap.xml')) {
      const body = `<?xml version="1.0"?><sitemapindex><sitemap><loc>https://shop.example/product-sitemap.xml</loc></sitemap></sitemapindex>`;
      return new Response(body, { status: 200 });
    }
    if (url.endsWith('/product-sitemap.xml')) {
      const body = `<?xml version="1.0"?><urlset>${urls
        .map((u) => `<url><loc>${u}</loc></url>`)
        .join('')}</urlset>`;
      return new Response(body, { status: 200 });
    }
    if (url.includes('/product/item-')) {
      const n = Number(url.split('item-')[1]);
      const body = `<script type="application/ld+json">${JSON.stringify({
        '@type': 'Product',
        name: `محصول ${n}`,
        sku: `G-${n}`,
        offers: { price: String(500000 + n * 1000), priceCurrency: 'IRT' },
      })}</script>`;
      return new Response(body, { status: 200 });
    }
    return new Response('not found', { status: 404 });
  };
}

describe('discoverProductUrls', () => {
  it('follows a sitemap index into the product sitemap', async () => {
    const urls = await discoverProductUrls('https://shop.example', fakeGenericFetcher(105), 1000);
    expect(urls.length).toBe(105);
    expect(urls[0]).toContain('/product/item-1');
  });

  it('respects the maxUrls cap', async () => {
    const urls = await discoverProductUrls('https://shop.example', fakeGenericFetcher(105), 50);
    expect(urls.length).toBe(50);
  });
});

describe('crawlGeneric', () => {
  it('crawls 100+ products from a generic site with correct prices (DoD)', async () => {
    const result = await crawlGeneric('https://shop.example', {
      fetcher: fakeGenericFetcher(105),
      maxPages: 1000,
    });
    expect(result.source).toBe('generic');
    expect(result.products.length).toBe(105);
    expect(result.products.every((p) => p.price !== null)).toBe(true);
    expect(result.products[0]?.price).toBe(500000 + 1000);
  });
});
