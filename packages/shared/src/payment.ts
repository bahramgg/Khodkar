/**
 * Payment gateway abstraction. `zarinpal` is the real provider (§3); `mock`
 * approves instantly for dev/test. The service depends only on the interface,
 * so the checkout flow is testable with zero network.
 */
export type PaymentFetcher = (url: string, init?: RequestInit) => Promise<Response>;

export interface PaymentRequest {
  /** Amount in Rial. */
  amount: number;
  description: string;
  callbackUrl: string;
}

export interface PaymentGateway {
  readonly name: string;
  /** Create a payment; returns the authority + the URL to send the user to. */
  request(req: PaymentRequest): Promise<{ authority: string; startUrl: string }>;
  /** Verify a returned authority; ok=true means paid. */
  verify(params: { authority: string; amount: number }): Promise<{ ok: boolean; refId?: string }>;
}

/** Dev/test gateway: its start URL loops straight back to the callback as paid. */
export class MockPaymentGateway implements PaymentGateway {
  readonly name = 'mock';
  private n = 0;

  async request(req: PaymentRequest): Promise<{ authority: string; startUrl: string }> {
    const authority = `MOCK${Date.now().toString(36)}${++this.n}`;
    const sep = req.callbackUrl.includes('?') ? '&' : '?';
    return { authority, startUrl: `${req.callbackUrl}${sep}Authority=${authority}&Status=OK` };
  }

  async verify(params: { authority: string; amount: number }): Promise<{ ok: boolean; refId?: string }> {
    return { ok: true, refId: `REF-${params.authority}` };
  }
}

/** Zarinpal Payment Gateway v4. */
export class ZarinpalGateway implements PaymentGateway {
  readonly name = 'zarinpal';
  constructor(
    private readonly merchantId: string,
    private readonly opts: { sandbox?: boolean; fetcher?: PaymentFetcher } = {},
  ) {}

  private get apiBase(): string {
    return this.opts.sandbox ? 'https://sandbox.zarinpal.com' : 'https://api.zarinpal.com';
  }
  private get payBase(): string {
    return this.opts.sandbox ? 'https://sandbox.zarinpal.com' : 'https://www.zarinpal.com';
  }
  private get fetcher(): PaymentFetcher {
    return this.opts.fetcher ?? fetch;
  }

  async request(req: PaymentRequest): Promise<{ authority: string; startUrl: string }> {
    const res = await this.fetcher(`${this.apiBase}/pg/v4/payment/request.json`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        merchant_id: this.merchantId,
        amount: req.amount,
        callback_url: req.callbackUrl,
        description: req.description,
      }),
    });
    const body = (await res.json()) as { data?: { authority?: string; code?: number } };
    const authority = body.data?.authority;
    if (!authority || body.data?.code !== 100) throw new Error('zarinpal request failed');
    return { authority, startUrl: `${this.payBase}/pg/StartPay/${authority}` };
  }

  async verify(params: { authority: string; amount: number }): Promise<{ ok: boolean; refId?: string }> {
    const res = await this.fetcher(`${this.apiBase}/pg/v4/payment/verify.json`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        merchant_id: this.merchantId,
        amount: params.amount,
        authority: params.authority,
      }),
    });
    const body = (await res.json()) as { data?: { code?: number; ref_id?: number } };
    const code = body.data?.code;
    // 100 = verified now, 101 = already verified.
    if (code === 100 || code === 101) return { ok: true, refId: String(body.data?.ref_id ?? '') };
    return { ok: false };
  }
}

export function createPaymentGateway(config: {
  provider?: string;
  merchantId?: string;
  sandbox?: boolean;
}): PaymentGateway {
  switch (config.provider ?? 'mock') {
    case 'mock':
      return new MockPaymentGateway();
    case 'zarinpal':
      if (!config.merchantId) throw new Error('ZARINPAL_MERCHANT_ID is required');
      return new ZarinpalGateway(config.merchantId, { sandbox: config.sandbox });
    default:
      throw new Error(`payment provider "${config.provider}" not supported`);
  }
}
