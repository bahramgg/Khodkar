/** Encrypt/decrypt Telegram channel credentials (AES-GCM, key from env). */
import 'server-only';
import { encrypt, decrypt, keyFromHex } from '@khodkar/shared';
import type { TelegramCredentials } from '@khodkar/channels';
import { env } from './env.js';

const key = () => keyFromHex(env.credentialsKey);

export function encryptTelegramCredentials(c: TelegramCredentials): string {
  return encrypt(JSON.stringify(c), key());
}

export function decryptTelegramCredentials(s: string): TelegramCredentials {
  return JSON.parse(decrypt(s, key())) as TelegramCredentials;
}
