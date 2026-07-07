import { describe, it, expect } from 'vitest';
import { handleCustomerText } from './handler.js';
import { InMemoryConversationSink } from './test-helpers.js';
import type { CustomerAgent, CustomerReply } from '@khodkar/agent';

function agentReturning(reply: CustomerReply): CustomerAgent {
  return { async respond() { return reply; } };
}

describe('handleCustomerText', () => {
  it('persists and auto-sends a send-action reply', async () => {
    const sink = new InMemoryConversationSink();
    const agent = agentReturning({ action: 'send', toCustomer: 'قیمت ۴٬۵۰۰٬۰۰۰ تومان', ownerDraft: null, reasons: [] });

    const res = await handleCustomerText({ sink, agent }, { customerRef: '55', text: 'قیمت؟' });

    expect(res.action).toBe('send');
    expect(res.reply).toContain('تومان');
    expect(sink.messages.map((m) => m.role)).toEqual(['customer', 'agent']);
    expect(sink.drafts).toHaveLength(0);
  });

  it('queues a draft and holds the customer on a non-send action', async () => {
    const sink = new InMemoryConversationSink();
    const agent = agentReturning({
      action: 'draft',
      toCustomer: 'همکارم پاسخ می‌دهد',
      ownerDraft: 'متن پیشنهادی',
      reasons: [{ code: 'discount_or_commitment' }],
    });

    const res = await handleCustomerText({ sink, agent }, { customerRef: '55', text: 'تخفیف بده' });

    expect(res.action).toBe('draft');
    expect(res.reply).toBe('همکارم پاسخ می‌دهد');
    expect(sink.drafts).toHaveLength(1);
    expect(sink.drafts[0]?.text).toBe('متن پیشنهادی');
    expect(sink.drafts[0]?.reason).toContain('discount_or_commitment');
  });

  it('reuses one conversation for the same customer', async () => {
    const sink = new InMemoryConversationSink();
    const agent = agentReturning({ action: 'send', toCustomer: 'سلام', ownerDraft: null, reasons: [] });
    const a = await handleCustomerText({ sink, agent }, { customerRef: '7', text: 'الف' });
    const b = await handleCustomerText({ sink, agent }, { customerRef: '7', text: 'ب' });
    expect(a.convId).toBe(b.convId);
  });
});
