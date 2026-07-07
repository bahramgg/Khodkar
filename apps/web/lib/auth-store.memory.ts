/** In-memory {@link AuthStore} for tests — mirrors the Drizzle store's semantics. */
import type { AuthStore, AuthUser, StoredOtp } from './auth-store.js';

interface MemOtp extends StoredOtp {
  createdAt: Date;
}

export class InMemoryAuthStore implements AuthStore {
  otps: MemOtp[] = [];
  users: AuthUser[] = [];
  private seq = 0;
  /** Test-controllable clock used to stamp `createdAt` on issued OTPs. */
  clock: () => Date = () => new Date();

  async insertOtp(row: { phone: string; hash: string; expiresAt: Date }): Promise<void> {
    this.otps.push({
      id: `otp_${++this.seq}`,
      phone: row.phone,
      hash: row.hash,
      expiresAt: row.expiresAt,
      consumedAt: null,
      attempts: 0,
      createdAt: this.clock(),
    });
  }

  async latestOtp(phone: string): Promise<StoredOtp | null> {
    for (let i = this.otps.length - 1; i >= 0; i--) {
      const o = this.otps[i];
      if (o && o.phone === phone) return o;
    }
    return null;
  }

  async incrementAttempts(id: string): Promise<void> {
    const o = this.otps.find((x) => x.id === id);
    if (o) o.attempts += 1;
  }

  async consumeOtp(id: string, at: Date): Promise<void> {
    const o = this.otps.find((x) => x.id === id);
    if (o) o.consumedAt = at;
  }

  async countOtpsSince(phone: string, since: Date): Promise<number> {
    return this.otps.filter((o) => o.phone === phone && o.createdAt >= since).length;
  }

  async findOrCreateUser(phone: string): Promise<AuthUser> {
    const existing = this.users.find((u) => u.phone === phone);
    if (existing) return existing;
    const user: AuthUser = { id: `user_${++this.seq}`, tenantId: null, phone, role: 'owner' };
    this.users.push(user);
    return user;
  }
}
