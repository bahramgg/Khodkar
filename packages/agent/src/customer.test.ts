import { describe, it, expect } from 'vitest';
import { CatalogResponder, composeCustomerReply, makeCustomerAgent } from './customer.js';
import { InMemoryRetriever } from './rag.js';
import { FakeEmbedder } from './test-helpers.js';
import type { AgentResult } from './agent.js';

describe('CatalogResponder', () => {
  it('composes a grounded product reply with the sourced price', async () => {
    const r = new CatalogResponder();
    const p = await r.propose({
      message: 'قیمت؟',
      context: [{ id: 'p1', kind: 'product', title: 'لباس عروس ماهی', text: 't', price: 4_500_000, score: 0.8 }],
    });
    expect(p.text).toContain('لباس عروس ماهی');
    expect(p.text).toContain('تومان');
    expect(p.confidence).toBe(0.8);
  });

  it('falls back with low confidence when nothing was retrieved', async () => {
    const p = await new CatalogResponder().propose({ message: 'x', context: [] });
    expect(p.confidence).toBeLessThan(0.5);
  });
});

describe('composeCustomerReply', () => {
  const baseResult = (over: Partial<AgentResult>): AgentResult => ({
    action: 'send',
    text: 'متن پاسخ',
    reasons: [],
    ragHitCount: 2,
    logged: false,
    context: [],
    ...over,
  });

  it('auto-sends on send', () => {
    const c = composeCustomerReply(baseResult({ action: 'send' }));
    expect(c.toCustomer).toBe('متن پاسخ');
    expect(c.ownerDraft).toBeNull();
  });

  it('holds the customer and drafts to owner on block', () => {
    const c = composeCustomerReply(baseResult({ action: 'block', text: 'قیمت جعلی' }));
    expect(c.ownerDraft).toBe('قیمت جعلی');
    expect(c.toCustomer).not.toBe('قیمت جعلی'); // holding message, not the blocked text
  });
});

describe('makeCustomerAgent (end to end)', () => {
  it('answers a price question from the catalog', async () => {
    const embedder = new FakeEmbedder();
    const raw = [
      { id: 'p1', kind: 'product' as const, title: 'لباس عروس مدل ماهی', text: 'لباس عروس مدل ماهی', price: 4_500_000 },
    ];
    const embs = await embedder.embed(raw.map((d) => d.text));
    const retriever = new InMemoryRetriever(raw.map((d, i) => ({ ...d, embedding: embs[i]! })), embedder);

    const agent = makeCustomerAgent({ retriever, responder: new CatalogResponder() });
    const reply = await agent.respond('قیمت لباس عروس مدل ماهی چنده؟');
    expect(reply.action).toBe('send');
    expect(reply.toCustomer).toContain('لباس عروس مدل ماهی');
  });
});
