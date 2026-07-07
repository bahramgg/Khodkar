/**
 * Catalog indexing — embed a tenant's products and facts into pgvector so the
 * agent can ground answers. Runs after crawl/import or when a channel goes
 * live. Products are embedded on their title; facts on question + answer.
 */
import type { Database } from '@khodkar/db';
import {
  getIndexableProducts,
  getIndexableFacts,
  setProductEmbedding,
  setFactEmbedding,
} from '@khodkar/db';
import type { Embedder } from './rag.js';

export interface IndexResult {
  products: number;
  facts: number;
}

/** Embed and store vectors for every product + fact in a tenant. */
export async function indexTenantCatalog(
  db: Database,
  tenantId: string,
  embedder: Embedder,
): Promise<IndexResult> {
  const products = await getIndexableProducts(db, tenantId);
  const facts = await getIndexableFacts(db, tenantId);

  if (products.length > 0) {
    const embs = await embedder.embed(products.map((p) => p.title ?? ''));
    for (let i = 0; i < products.length; i++) {
      await setProductEmbedding(db, products[i]!.id, embs[i]!);
    }
  }
  if (facts.length > 0) {
    const embs = await embedder.embed(facts.map((f) => `${f.q} ${f.a}`));
    for (let i = 0; i < facts.length; i++) {
      await setFactEmbedding(db, facts[i]!.id, embs[i]!);
    }
  }

  return { products: products.length, facts: facts.length };
}
