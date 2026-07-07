/**
 * Apply pending drizzle migrations, then exit. Run via `pnpm db:migrate`.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = resolve(__dirname, '../drizzle');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  // `max: 1` — migrations must run on a single connection.
  const sql = postgres(url, { max: 1 });
  const db = drizzle(sql);
  console.log('[migrate] applying migrations from', migrationsFolder);
  await migrate(db, { migrationsFolder });
  console.log('[migrate] done');
  await sql.end();
}

main().catch((err) => {
  console.error('[migrate] failed:', err);
  process.exit(1);
});
