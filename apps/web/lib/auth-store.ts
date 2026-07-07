/**
 * Storage boundary for the auth flow. The service depends only on this
 * interface, so it can run against Postgres in prod and an in-memory fake in
 * tests — the whole login flow is unit-testable without a live DB.
 */
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { otpCodes, users, type Database } from '@khodkar/db';

export interface StoredOtp {
  id: string;
  phone: string;
  hash: string;
  expiresAt: Date;
  consumedAt: Date | null;
  attempts: number;
}

export interface AuthUser {
  id: string;
  tenantId: string | null;
  phone: string;
  role: 'owner' | 'staff';
}

export interface AuthStore {
  insertOtp(row: { phone: string; hash: string; expiresAt: Date }): Promise<void>;
  /** Most recent OTP for a phone (consumed or not) — verification reads this. */
  latestOtp(phone: string): Promise<StoredOtp | null>;
  incrementAttempts(id: string): Promise<void>;
  consumeOtp(id: string, at: Date): Promise<void>;
  /** How many OTPs were issued to `phone` since `since` — for rate limiting. */
  countOtpsSince(phone: string, since: Date): Promise<number>;
  findOrCreateUser(phone: string): Promise<AuthUser>;
}

/** Drizzle/Postgres-backed store (production). */
export class DrizzleAuthStore implements AuthStore {
  constructor(private readonly db: Database) {}

  async insertOtp(row: { phone: string; hash: string; expiresAt: Date }): Promise<void> {
    await this.db.insert(otpCodes).values(row);
  }

  async latestOtp(phone: string): Promise<StoredOtp | null> {
    const rows = await this.db
      .select()
      .from(otpCodes)
      .where(eq(otpCodes.phone, phone))
      .orderBy(desc(otpCodes.createdAt))
      .limit(1);
    return (rows[0] as StoredOtp | undefined) ?? null;
  }

  async incrementAttempts(id: string): Promise<void> {
    await this.db
      .update(otpCodes)
      .set({ attempts: sql`${otpCodes.attempts} + 1` })
      .where(eq(otpCodes.id, id));
  }

  async consumeOtp(id: string, at: Date): Promise<void> {
    await this.db.update(otpCodes).set({ consumedAt: at }).where(eq(otpCodes.id, id));
  }

  async countOtpsSince(phone: string, since: Date): Promise<number> {
    const rows = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(otpCodes)
      .where(and(eq(otpCodes.phone, phone), gte(otpCodes.createdAt, since)));
    return rows[0]?.n ?? 0;
  }

  async findOrCreateUser(phone: string): Promise<AuthUser> {
    const existing = await this.db.select().from(users).where(eq(users.phone, phone)).limit(1);
    if (existing[0]) {
      const u = existing[0];
      return { id: u.id, tenantId: u.tenantId, phone: u.phone, role: u.role };
    }
    const [created] = await this.db
      .insert(users)
      .values({ phone, role: 'owner' })
      .onConflictDoNothing({ target: users.phone })
      .returning();
    if (created) {
      return { id: created.id, tenantId: created.tenantId, phone: created.phone, role: created.role };
    }
    // Lost the insert race (onConflictDoNothing) — re-read the existing row.
    const [row] = await this.db.select().from(users).where(eq(users.phone, phone)).limit(1);
    if (!row) throw new Error('failed to create or find user');
    return { id: row.id, tenantId: row.tenantId, phone: row.phone, role: row.role };
  }
}
