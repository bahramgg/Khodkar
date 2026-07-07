/**
 * Landing live demo: crawl any site in-memory (no DB, no account), index it,
 * and answer a question from it — with per-IP rate limiting and a short cache.
 */
import 'server-only';
import { crawlSite, type Fetcher } from '@khodkar/crawler';
import { InMemoryRetriever, CatalogResponder, makeCustomerAgent } from '@khodkar/agent';
import { embedder } from './embeddings.js';

interface DemoDoc {
  id: string;
  kind: 'product';
  title: string;
  text: string;
  price: number | null;
  embedding: number[];
}
interface CacheEntry {
  docs: DemoDoc[];
  source: string;
  at: number;
}

const cache = new Map<string, CacheEntry>();
const TTL_MS = 10 * 60 * 1000;
const MAX_PRODUCTS = 150;

// Per-IP rate limit.
const RL_WINDOW = 60_000;
const RL_MAX = 8;
const hits = new Map<string, number[]>();

export function demoRateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < RL_WINDOW);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > RL_MAX;
}

export type DemoCrawlResult =
  | { ok: true; products: number; source: string }
  | { ok: false; error: 'crawl_failed' | 'no_products' };

export async function demoCrawl(url: string, fetcher?: Fetcher): Promise<DemoCrawlResult> {
  let result;
  try {
    result = await crawlSite(url, fetcher ? { fetcher } : {});
  } catch {
    return { ok: false, error: 'crawl_failed' };
  }
  const products = result.products.filter((p) => p.title).slice(0, MAX_PRODUCTS);
  if (products.length === 0) return { ok: false, error: 'no_products' };

  const embs = await embedder.embed(products.map((p) => p.title));
  const docs: DemoDoc[] = products.map((p, i) => ({
    id: String(i),
    kind: 'product',
    title: p.title,
    text: p.title,
    price: p.price,
    embedding: embs[i]!,
  }));
  cache.set(url, { docs, source: result.source, at: Date.now() });
  return { ok: true, products: docs.length, source: result.source };
}

export type DemoAskResult =
  | { ok: true; action: string; reply: string }
  | { ok: false; error: 'not_crawled' };

export async function demoAsk(
  url: string,
  question: string,
  fetcher?: Fetcher,
): Promise<DemoAskResult> {
  let entry = cache.get(url);
  // Cache is per-route-module (not shared across serverless routes), so the
  // ask endpoint re-crawls on a cold cache, then serves subsequent asks fast.
  if (!entry || Date.now() - entry.at > TTL_MS) {
    const c = await demoCrawl(url, fetcher);
    if (!c.ok) return { ok: false, error: 'not_crawled' };
    entry = cache.get(url)!;
  }

  const agent = makeCustomerAgent({
    retriever: new InMemoryRetriever(entry.docs, embedder),
    responder: new CatalogResponder(),
  });
  const r = await agent.respond(question);
  const reply = r.action === 'send' ? r.toCustomer : (r.ownerDraft ?? r.toCustomer);
  return { ok: true, action: r.action, reply };
}
