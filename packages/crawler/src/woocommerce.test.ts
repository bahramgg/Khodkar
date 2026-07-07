import { describe, it, expect } from 'vitest';
import { crawlWoo, normalizeWooProduct } from './woocommerce.js';
import type { Fetcher } from './types.js';

/** Build a fake Woo Store API serving `total` products, paginated. */
function fakeWooFetcher(
  total: number,
  opts: { currency?: string; minorUnit?: number } = {},
): Fetcher {
  const currency = opts.currency ?? 'IRT';
  const minor = opts.minorUnit ?? 0;
  const all = Array.from({ length: total }, (_, i) => ({
    id: i + 1,
    name: `محصول شماره ${i + 1}`,
    sku: `SKU-${1000 + i}`,
    permalink: `https://shop.example/product/item-${i + 1}`,
    prices: {
      price: String((100000 + i * 1000) * 10 ** minor), // minor-units
      currency_code: currency,
      currency_minor_unit: minor,
    },
    images: [{ src: `https://shop.example/img/${i + 1}.jpg` }],
    is_in_stock: true,
    stock_quantity: (i % 5) + 1,
    categories: [{ name: 'دسته' }],
  }));

  return async (url: string) => {
    const u = new URL(url);
    const perPage = Number(u.searchParams.get('per_page') ?? '10');
    const page = Number(u.searchParams.get('page') ?? '1');
    const start = (page - 1) * perPage;
    const slice = all.slice(start, start + perPage);
    return new Response(JSON.stringify(slice), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
}

describe('normalizeWooProduct', () => {
  it('maps fields and converts price to toman', () => {
    const warnings: string[] = [];
    const p = normalizeWooProduct(
      {
        name: ' لباس ',
        sku: 'A1',
        prices: { price: '4500000', currency_code: 'IRR', currency_minor_unit: 0 },
        images: [{ src: 'x.jpg' }, {}],
        is_in_stock: true,
        stock_quantity: 3,
        permalink: 'https://s/p/1',
      },
      warnings,
    );
    expect(p).toMatchObject({
      sku: 'A1',
      title: 'لباس',
      price: 450000, // 4,500,000 rial → 450,000 toman
      images: ['x.jpg'],
      stock: 3,
      inStock: true,
    });
    expect(warnings).toHaveLength(0);
  });

  it('warns and yields null price when price is missing', () => {
    const warnings: string[] = [];
    const p = normalizeWooProduct({ name: 'X', prices: {} }, warnings);
    expect(p.price).toBeNull();
    expect(warnings).toHaveLength(1);
  });
});

describe('crawlWoo', () => {
  it('paginates and returns 100+ products with correct prices (DoD)', async () => {
    const result = await crawlWoo('https://shop.example', {
      fetcher: fakeWooFetcher(120),
      perPage: 100,
    });
    expect(result.source).toBe('woocommerce');
    expect(result.products.length).toBe(120);
    expect(result.pagesFetched).toBe(2);
    // First product price: 100000 toman (IRT, minor 0).
    expect(result.products[0]?.price).toBe(100000);
    expect(result.products[119]?.price).toBe(100000 + 119 * 1000);
    expect(result.products.every((p) => p.price !== null)).toBe(true);
  });

  it('throws if the first page is not OK', async () => {
    const fetcher: Fetcher = async () => new Response('nope', { status: 404 });
    await expect(crawlWoo('https://shop.example', { fetcher })).rejects.toThrow();
  });
});
