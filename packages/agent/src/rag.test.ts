import { describe, it, expect } from 'vitest';
import { cosineSimilarity, InMemoryRetriever, type RetrievedDoc } from './rag.js';
import { FakeEmbedder } from './test-helpers.js';

describe('cosineSimilarity', () => {
  it('is 1 for identical, 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });
  it('returns 0 for a zero vector', () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });
});

describe('InMemoryRetriever', () => {
  async function buildRetriever() {
    const embedder = new FakeEmbedder();
    const raw = [
      { id: 'p1', kind: 'product' as const, title: 'لباس عروس مدل ماهی', text: 'لباس عروس مدل ماهی', price: 4_500_000 },
      { id: 'p2', kind: 'product' as const, title: 'انگشتر طلا', text: 'انگشتر طلا زنانه', price: 2_000_000 },
      // Facts are indexed on question + answer (as the real indexer does).
      { id: 'f1', kind: 'fact' as const, title: 'ارسال به شهرستان دارید؟', text: 'ارسال به شهرستان با پست پیشتاز انجام می‌شود', price: null },
    ];
    const embs = await embedder.embed(raw.map((d) => d.text));
    const docs = raw.map((d, i) => ({ ...d, embedding: embs[i]! }));
    return new InMemoryRetriever(docs, embedder);
  }

  it('ranks the semantically closest doc first', async () => {
    const retriever = await buildRetriever();
    const hits: RetrievedDoc[] = await retriever.search('لباس عروس ماهی', 3);
    expect(hits[0]?.id).toBe('p1');
    expect(hits[0]?.price).toBe(4_500_000);
  });

  it('surfaces the shipping fact for a shipping question', async () => {
    const retriever = await buildRetriever();
    const hits = await retriever.search('ارسال به شهرستان دارید', 1);
    expect(hits[0]?.id).toBe('f1');
  });
});
