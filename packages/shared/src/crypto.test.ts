import { describe, it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import { encrypt, decrypt, keyFromHex, safeEqual } from './crypto.js';

const key = randomBytes(32);

describe('AES-256-GCM encrypt/decrypt', () => {
  it('round-trips UTF-8 including Persian text', () => {
    const secret = 'توکن ربات مزون ۱۲۳:abc';
    expect(decrypt(encrypt(secret, key), key)).toBe(secret);
  });

  it('produces a fresh IV each call (non-deterministic ciphertext)', () => {
    expect(encrypt('same', key)).not.toBe(encrypt('same', key));
  });

  it('rejects tampered ciphertext', () => {
    const token = encrypt('hello', key);
    const parts = token.split('.');
    const tampered = `${parts[0]}.${Buffer.from('evil').toString('base64url')}.${parts[2]}`;
    expect(() => decrypt(tampered, key)).toThrow();
  });

  it('fails to decrypt with the wrong key', () => {
    const token = encrypt('hello', key);
    expect(() => decrypt(token, randomBytes(32))).toThrow();
  });

  it('rejects malformed tokens', () => {
    expect(() => decrypt('not-a-token', key)).toThrow(/format/);
  });
});

describe('keyFromHex', () => {
  it('parses 64 hex chars', () => {
    expect(keyFromHex('ab'.repeat(32)).length).toBe(32);
  });
  it('rejects wrong-length keys', () => {
    expect(() => keyFromHex('abcd')).toThrow();
  });
});

describe('safeEqual', () => {
  it('compares equal and unequal strings', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});
