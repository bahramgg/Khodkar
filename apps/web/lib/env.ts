/** Server-side env access with sensible dev defaults + validation. */
import 'server-only';

function req(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`missing required env: ${name}`);
  return v;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  sessionSecret: req(
    'SESSION_SECRET',
    'dev-only-change-me-please-0000000000000000000000000000000000000000',
  ),
  credentialsKey: req(
    'CREDENTIALS_KEY',
    '00000000000000000000000000000000000000000000000000000000000000ff',
  ),
  smsProvider: process.env.SMS_PROVIDER ?? 'mock',
  otpTtlSeconds: Number(process.env.OTP_TTL_SECONDS ?? 300),
  otpLength: Number(process.env.OTP_LENGTH ?? 5),
  // Public https base used to register Telegram webhooks. Empty in local dev
  // (webhook registration is skipped; the bot logic is still testable).
  telegramWebhookBase: process.env.TELEGRAM_WEBHOOK_BASE ?? '',
};
