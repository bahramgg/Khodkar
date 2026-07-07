/**
 * Offline embedders. `HashEmbedder` is a deterministic bag-of-tokens embedder
 * used as the v1 baseline (and default) so RAG works without external keys.
 * A real OpenRouter embedder implements the same {@link Embedder} interface
 * and drops in later.
 */
import { toEnglishDigits } from '@khodkar/shared';
import type { Embedder } from './rag.js';

/** pgvector column width — keep in sync with db schema (`vector(1536)`). */
export const EMBEDDING_DIMS = 1536;

export class HashEmbedder implements Embedder {
  readonly dimensions: number;
  constructor(dimensions = EMBEDDING_DIMS) {
    this.dimensions = dimensions;
  }

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((t) => this.vec(t));
  }

  private vec(text: string): number[] {
    const v = new Array<number>(this.dimensions).fill(0);
    for (const tok of toEnglishDigits(text)
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean)) {
      let h = 0;
      for (const ch of tok) h = (h * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
      const idx = h % this.dimensions;
      v[idx] = (v[idx] ?? 0) + 1;
    }
    return v;
  }
}
