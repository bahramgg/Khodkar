import { describe, it, expect } from 'vitest';
import {
  MockPaymentGateway,
  ZarinpalGateway,
  createPaymentGateway,
  type PaymentFetcher,
} from './payment.js';
import { planAmountRial, planPeriodDays, PLAN_CATALOG } from './plans.js';

describe('plans', () => {
  it('prices paid plans and converts Toman → Rial', () => {
    expect(PLAN_CATALOG.trial.priceToman).toBe(0);
    expect(planAmountRial('basic')).toBe(PLAN_CATALOG.basic.priceToman * 10);
    expect(planPeriodDays('basic')).toBe(30);
  });
});

describe('MockPaymentGateway', () => {
  it('loops the start URL back to the callback as paid, and verifies', async () => {
    const gw = new MockPaymentGateway();
    const { authority, startUrl } = await gw.request({
      amount: 100,
      description: 'x',
      callbackUrl: 'https://panel/api/billing/callback',
    });
    expect(startUrl).toContain('Authority=' + authority);
    expect(startUrl).toContain('Status=OK');
    expect(await gw.verify({ authority, amount: 100 })).toEqual({ ok: true, refId: `REF-${authority}` });
  });
});

describe('ZarinpalGateway', () => {
  it('requests a payment and builds the StartPay URL', async () => {
    const fetcher: PaymentFetcher = async (url, init) => {
      expect(url).toContain('/pg/v4/payment/request.json');
      const body = JSON.parse(String(init?.body));
      expect(body.merchant_id).toBe('MID');
      expect(body.amount).toBe(25_000_000);
      return new Response(JSON.stringify({ data: { authority: 'A123', code: 100 }, errors: [] }));
    };
    const gw = new ZarinpalGateway('MID', { fetcher });
    const r = await gw.request({ amount: 25_000_000, description: 'x', callbackUrl: 'https://c' });
    expect(r.authority).toBe('A123');
    expect(r.startUrl).toBe('https://www.zarinpal.com/pg/StartPay/A123');
  });

  it('treats code 100/101 as verified and anything else as failed', async () => {
    const make = (code: number): ZarinpalGateway =>
      new ZarinpalGateway('MID', {
        fetcher: async () => new Response(JSON.stringify({ data: { code, ref_id: 55 } })),
      });
    expect(await make(100).verify({ authority: 'A', amount: 1 })).toEqual({ ok: true, refId: '55' });
    expect(await make(101).verify({ authority: 'A', amount: 1 })).toEqual({ ok: true, refId: '55' });
    expect((await make(-51).verify({ authority: 'A', amount: 1 })).ok).toBe(false);
  });

  it('uses the sandbox host when configured', async () => {
    let seen = '';
    const gw = new ZarinpalGateway('MID', {
      sandbox: true,
      fetcher: async (url) => {
        seen = url;
        return new Response(JSON.stringify({ data: { authority: 'S1', code: 100 } }));
      },
    });
    const r = await gw.request({ amount: 1, description: 'x', callbackUrl: 'https://c' });
    expect(seen).toContain('sandbox.zarinpal.com');
    expect(r.startUrl).toContain('sandbox.zarinpal.com');
  });
});

describe('createPaymentGateway', () => {
  it('returns mock by default and zarinpal when requested', () => {
    expect(createPaymentGateway({ provider: 'mock' }).name).toBe('mock');
    expect(createPaymentGateway({ provider: 'zarinpal', merchantId: 'M' }).name).toBe('zarinpal');
    expect(() => createPaymentGateway({ provider: 'zarinpal' })).toThrow();
  });
});
