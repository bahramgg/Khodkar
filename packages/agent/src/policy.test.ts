import { describe, it, expect } from 'vitest';
import { checkAnswer, extractPriceLikeNumbers, type PolicyInput } from './policy.js';

describe('extractPriceLikeNumbers', () => {
  it('picks up currency- and unit-qualified amounts', () => {
    expect(extractPriceLikeNumbers('قیمت ۳٬۰۰۰٬۰۰۰ تومان')).toContain(3_000_000);
    expect(extractPriceLikeNumbers('حدود ۴.۵ میلیون')).toContain(4_500_000);
    expect(extractPriceLikeNumbers('۴۵۰۰۰۰ ریال')).toContain(45_000); // rial → toman
  });

  it('ignores incidental small numbers (sizes, days, years)', () => {
    expect(extractPriceLikeNumbers('سایز ۳۸ داریم')).toEqual([]);
    expect(extractPriceLikeNumbers('اجاره ۳ روزه است')).toEqual([]);
    expect(extractPriceLikeNumbers('سال ۱۴۰۳')).toEqual([]);
  });

  it('flags separated amounts even without a currency word', () => {
    expect(extractPriceLikeNumbers('۱٬۲۵۰٬۰۰۰')).toContain(1_250_000);
  });
});

function base(over: Partial<PolicyInput> = {}): PolicyInput {
  return {
    answer: 'این مدل موجود است 🌸',
    allowedNumbers: [],
    confidence: 0.9,
    ragHitCount: 3,
    ...over,
  };
}

describe('checkAnswer', () => {
  it('sends a clean, grounded Persian answer', () => {
    const d = checkAnswer(base());
    expect(d.action).toBe('send');
    expect(d.reasons).toHaveLength(0);
  });

  it('BLOCKS a price the tools did not provide (week-4 DoD)', () => {
    const d = checkAnswer(base({ answer: 'قیمت این لباس ۳٬۰۰۰٬۰۰۰ تومان است.', allowedNumbers: [] }));
    expect(d.action).toBe('block');
    expect(d.reasons.map((r) => r.code)).toContain('unsourced_number');
  });

  it('allows a price that came from a tool result', () => {
    const d = checkAnswer(base({ answer: 'قیمتش ۳٬۰۰۰٬۰۰۰ تومان است.', allowedNumbers: [3_000_000] }));
    expect(d.action).toBe('send');
  });

  it('drafts discounts / commitments for the owner', () => {
    const d = checkAnswer(base({ answer: 'برای شما ۱۰ درصد تخفیف می‌گذارم.' }));
    // "تخفیف" → draft; no unsourced number here (۱۰ is small, not price-like)
    expect(d.action).toBe('draft');
    expect(d.reasons.map((r) => r.code)).toContain('discount_or_commitment');
  });

  it('drafts sensitive topics', () => {
    const d = checkAnswer(base({ answer: 'بابت شکایت شما پیگیری می‌کنیم.' }));
    expect(d.action).toBe('draft');
    expect(d.reasons.map((r) => r.code)).toContain('sensitive_topic');
  });

  it('drafts + logs when RAG returned nothing', () => {
    const d = checkAnswer(base({ ragHitCount: 0 }));
    expect(d.action).toBe('draft');
    expect(d.logUnanswered).toBe(true);
    expect(d.reasons.map((r) => r.code)).toContain('no_rag_hits');
  });

  it('drafts + logs on low confidence', () => {
    const d = checkAnswer(base({ confidence: 0.2 }));
    expect(d.action).toBe('draft');
    expect(d.logUnanswered).toBe(true);
  });

  it('drafts a non-Persian answer', () => {
    const d = checkAnswer(base({ answer: 'We have it in stock.' }));
    expect(d.action).toBe('draft');
    expect(d.reasons.map((r) => r.code)).toContain('not_persian');
  });

  it('block dominates draft when both fire', () => {
    const d = checkAnswer(base({ answer: 'با تخفیف فقط ۲٬۵۰۰٬۰۰۰ تومان!', allowedNumbers: [] }));
    expect(d.action).toBe('block');
    const codes = d.reasons.map((r) => r.code);
    expect(codes).toContain('unsourced_number');
    expect(codes).toContain('discount_or_commitment');
  });

  it('flags over-long answers without changing the action', () => {
    const d = checkAnswer(base({ answer: 'یک. دو. سه. چهار.' }));
    expect(d.action).toBe('send');
    expect(d.reasons.map((r) => r.code)).toContain('too_long');
  });
});
