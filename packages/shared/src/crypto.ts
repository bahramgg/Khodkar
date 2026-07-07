/**
 * AES-256-GCM symmetric encryption for at-rest secrets (e.g. the encrypted
 * `channels.credentials` column). Key comes from env (`CREDENTIALS_KEY`,
 * 32 bytes as 64 hex chars) — the simple env-KMS from the master plan.
 *
 * Wire format (all base64url, dot-separated): `iv.ciphertext.authTag`.
 */
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_BYTES = 12; // GCM standard nonce length
const KEY_BYTES = 32;

function b64url(buf: Buffer): string {
  return buf.toString('base64url');
}

/** Parse a 64-hex-char key into a 32-byte Buffer, throwing on bad shape. */
export function keyFromHex(hex: string): Buffer {
  const key = Buffer.from(hex, 'hex');
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `CREDENTIALS_KEY must be ${KEY_BYTES} bytes (${KEY_BYTES * 2} hex chars), got ${key.length}`,
    );
  }
  return key;
}

/** Encrypt UTF-8 `plaintext`; returns `iv.ciphertext.tag` (base64url). */
export function encrypt(plaintext: string, key: Buffer): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${b64url(iv)}.${b64url(ct)}.${b64url(tag)}`;
}

/** Decrypt a token produced by {@link encrypt}. Throws on tamper/format error. */
export function decrypt(token: string, key: Buffer): string {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('invalid ciphertext format');
  const [ivB64, ctB64, tagB64] = parts as [string, string, string];
  const iv = Buffer.from(ivB64, 'base64url');
  const ct = Buffer.from(ctB64, 'base64url');
  const tag = Buffer.from(tagB64, 'base64url');
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}

/** Constant-time string compare (for hashed OTP / token checks). */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
