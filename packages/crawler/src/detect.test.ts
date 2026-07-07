import { describe, it, expect } from 'vitest';
import { detectSource } from './detect.js';
import type { Fetcher } from './types.js';

describe('detectSource', () => {
  it('detects WooCommerce when the Store API returns an array', async () => {
    const fetcher: Fetcher = async (url) =>
      url.includes('/wp-json/wc/store/products')
        ? new Response(JSON.stringify([{ id: 1 }]), { status: 200 })
        : new Response('', { status: 404 });
    expect(await detectSource('https://shop.example', fetcher)).toBe('woocommerce');
  });

  it('falls back to generic when the Store API is absent', async () => {
    const fetcher: Fetcher = async () => new Response('nope', { status: 404 });
    expect(await detectSource('https://shop.example', fetcher)).toBe('generic');
  });

  it('falls back to generic when the endpoint throws', async () => {
    const fetcher: Fetcher = async () => {
      throw new Error('network down');
    };
    expect(await detectSource('https://shop.example', fetcher)).toBe('generic');
  });
});
