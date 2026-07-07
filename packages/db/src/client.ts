/**
 * Postgres connection + drizzle client. A single shared pool per process.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { schema } from './schema.js';

export type Database = ReturnType<typeof createDb>['db'];

export function createDb(url = process.env.DATABASE_URL) {
  if (!url) throw new Error('DATABASE_URL is not set');
  const sql = postgres(url, { max: 10 });
  const db = drizzle(sql, { schema });
  return { db, sql };
}

let _shared: ReturnType<typeof createDb> | null = null;

/** Lazily-initialised process-wide client (used by the web/worker apps). */
export function getDb(): Database {
  if (!_shared) _shared = createDb();
  return _shared.db;
}
