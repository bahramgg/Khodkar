/** Production wiring of {@link AuthDeps} — real DB store + configured SMS provider. */
import 'server-only';
import { getDb } from '@khodkar/db';
import { createSmsProvider } from '@khodkar/channels';
import { env } from './env.js';
import { DrizzleAuthStore } from './auth-store.js';
import type { AuthDeps } from './auth-service.js';

let _deps: AuthDeps | null = null;

export function buildAuthDeps(): AuthDeps {
  if (!_deps) {
    _deps = {
      store: new DrizzleAuthStore(getDb()),
      sms: createSmsProvider(env.smsProvider),
      secret: env.sessionSecret,
      ttlSeconds: env.otpTtlSeconds,
      codeLength: env.otpLength,
    };
  }
  return _deps;
}
