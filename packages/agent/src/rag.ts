/**
 * Retrieval-augmented grounding. The agent retrieves the top-k products/facts
 * for a customer message and answers only from them. Embeddings come from an
 * injected {@link Embedder} (OpenRouter in prod, a deterministic fake in tests).
 */
import type { Database } from '@khodkar/db';
import { searchProductsByEmbedding, searchFactsByEmbedding } from '@khodkar/db';

export interface Embedder {
  readonly dimensions: number;
  embed(texts: string[]): Promise<number[][]>;
}

export type DocKind = 'product' | 'fact';

export interface RetrievedDoc {
  id: string;
  kind: DocKind;
  title: string;
  /** Text used for grounding / display. */
  text: string;
  /** Product price in Toman, when applicable — a "sourced number" for policy. */
  price?: number | null;
  /** Similarity in [0,1]; higher is closer. */
  score: number;
}

export interface Retriever {
  search(query: string, k?: number): Promise<RetrievedDoc[]>;
}

/** Cosine similarity of two equal-length vectors. */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    na += av * av;
    nb += bv * bv;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

interface InMemoryDoc {
  id: string;
  kind: DocKind;
  title: string;
  text: string;
  price?: number | null;
  embedding: number[];
}

/** In-memory retriever for tests and small catalogs. */
export class InMemoryRetriever implements Retriever {
  constructor(
    private readonly docs: InMemoryDoc[],
    private readonly embedder: Embedder,
  ) {}

  async search(query: string, k = 5): Promise<RetrievedDoc[]> {
    const [q] = await this.embedder.embed([query]);
    if (!q) return [];
    return this.docs
      .map((d) => ({
        id: d.id,
        kind: d.kind,
        title: d.title,
        text: d.text,
        price: d.price ?? null,
        score: cosineSimilarity(q, d.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }
}

/** pgvector-backed retriever over a tenant's products + facts. */
export class DbRetriever implements Retriever {
  constructor(
    private readonly db: Database,
    private readonly tenantId: string,
    private readonly embedder: Embedder,
  ) {}

  async search(query: string, k = 5): Promise<RetrievedDoc[]> {
    const [q] = await this.embedder.embed([query]);
    if (!q) return [];
    const [products, facts] = await Promise.all([
      searchProductsByEmbedding(this.db, this.tenantId, q, k),
      searchFactsByEmbedding(this.db, this.tenantId, q, k),
    ]);

    const docs: RetrievedDoc[] = [
      ...products.map((p) => ({
        id: p.id,
        kind: 'product' as const,
        title: p.title,
        text: p.title,
        price: p.price === null ? null : Number(p.price),
        score: 1 - Number(p.distance), // cosine distance → similarity
      })),
      ...facts.map((f) => ({
        id: f.id,
        kind: 'fact' as const,
        title: f.q,
        text: f.a,
        score: 1 - Number(f.distance),
      })),
    ];

    return docs.sort((a, b) => b.score - a.score).slice(0, k);
  }
}
