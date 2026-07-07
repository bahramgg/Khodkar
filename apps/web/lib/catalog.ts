/** Catalog management from the panel (add product + index it for RAG). */
import 'server-only';
import { getDb, insertProduct, setProductEmbedding } from '@khodkar/db';
import { embedder } from './embeddings.js';

export type AddProductResult =
  | { ok: true; id: string }
  | { ok: false; error: 'invalid_title' };

/** Add one product to a tenant's catalog and embed it so the agent can use it. */
export async function addCatalogProduct(
  tenantId: string,
  input: { title: string; price: number | null; imageUrl?: string },
): Promise<AddProductResult> {
  const title = input.title.trim();
  if (title.length < 2) return { ok: false, error: 'invalid_title' };

  const images = input.imageUrl?.trim() ? [input.imageUrl.trim()] : [];
  const id = await insertProduct(getDb(), { tenantId, title, price: input.price, images });
  const [emb] = await embedder.embed([title]);
  if (emb) await setProductEmbedding(getDb(), id, emb);
  return { ok: true, id };
}
