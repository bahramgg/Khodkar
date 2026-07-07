/**
 * Test-only helpers (not exported from the package index). A deterministic,
 * network-free embedder so RAG/agent tests are reproducible.
 */
import { toEnglishDigits } from '@khodkar/shared';
import type { Embedder } from './rag.js';

/** Bag-of-tokens hashing embedder: shared tokens → higher cosine similarity. */
export class FakeEmbedder implements Embedder {
  readonly dimensions = 64;

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((t) => this.vec(t));
  }

  private vec(text: string): number[] {
    const v = new Array<number>(this.dimensions).fill(0);
    const tokens = toEnglishDigits(text)
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean);
    for (const tok of tokens) {
      let h = 0;
      for (const ch of tok) h = (h * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
      const idx = h % this.dimensions;
      v[idx] = (v[idx] ?? 0) + 1;
    }
    return v;
  }
}
