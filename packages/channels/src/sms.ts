/**
 * SMS provider abstraction. Week 1 ships only the `mock` provider (logs the
 * message to stdout so devs can read the OTP). Kavenegar / sms.ir land in v1.5
 * behind the same interface — the platform owns one account and meters usage.
 */

export interface SmsMessage {
  to: string;
  text: string;
}

export interface SmsProvider {
  readonly name: string;
  send(msg: SmsMessage): Promise<{ id: string }>;
}

/** Dev provider: never calls the network; records + logs sent messages. */
export class MockSmsProvider implements SmsProvider {
  readonly name = 'mock';
  readonly sent: SmsMessage[] = [];
  private counter = 0;

  async send(msg: SmsMessage): Promise<{ id: string }> {
    this.sent.push(msg);
    this.counter += 1;
    // eslint-disable-next-line no-console
    console.log(`[sms:mock] → ${msg.to}: ${msg.text}`);
    return { id: `mock_${this.counter}` };
  }
}

/**
 * Resolve a provider from env. Only `mock` is wired up in week 1; unknown/real
 * providers throw loudly rather than silently dropping messages.
 */
export function createSmsProvider(
  providerName = process.env.SMS_PROVIDER ?? 'mock',
): SmsProvider {
  switch (providerName) {
    case 'mock':
      return new MockSmsProvider();
    default:
      throw new Error(`SMS provider "${providerName}" not implemented yet (week 1 = mock only)`);
  }
}

/** Build the localized OTP SMS text. */
export function otpSmsText(code: string): string {
  return `کد ورود شما به «خودکار»: ${code}\nاین کد تا ۵ دقیقه معتبر است.`;
}
