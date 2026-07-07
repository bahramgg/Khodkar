import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://khodkar:khodkar@localhost:5432/khodkar',
  },
  // pgvector lives in an extension we create in migration 0000.
  verbose: true,
  strict: true,
});
