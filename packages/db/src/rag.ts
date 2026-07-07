/**
 * pgvector-backed similarity search + embedding writes, tenant-scoped.
 * Uses raw SQL (via `db.execute`) so we can use the `<=>` cosine-distance
 * operator. Embeddings are numeric arrays rendered as pgvector literals.
 */
import { sql } from 'drizzle-orm';
import type { Database } from './client.js';

/** Render a numeric embedding as a pgvector literal, e.g. `[0.1,0.2]`. */
export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

export interface ProductHit {
  id: string;
  title: string;
  price: number | null;
  distance: number;
}

export interface FactHit {
  id: string;
  q: string;
  a: string;
  distance: number;
}

export async function searchProductsByEmbedding(
  db: Database,
  tenantId: string,
  embedding: number[],
  k = 5,
): Promise<ProductHit[]> {
  const vec = toVectorLiteral(embedding);
  const rows = await db.execute(sql`
    select id, title, price, (embedding <=> ${vec}::vector) as distance
    from products
    where tenant_id = ${tenantId} and embedding is not null
    order by embedding <=> ${vec}::vector
    limit ${k}
  `);
  return rows as unknown as ProductHit[];
}

export async function searchFactsByEmbedding(
  db: Database,
  tenantId: string,
  embedding: number[],
  k = 5,
): Promise<FactHit[]> {
  const vec = toVectorLiteral(embedding);
  const rows = await db.execute(sql`
    select id, q, a, (embedding <=> ${vec}::vector) as distance
    from facts
    where tenant_id = ${tenantId} and embedding is not null
    order by embedding <=> ${vec}::vector
    limit ${k}
  `);
  return rows as unknown as FactHit[];
}

export async function setProductEmbedding(
  db: Database,
  productId: string,
  embedding: number[],
): Promise<void> {
  const vec = toVectorLiteral(embedding);
  await db.execute(
    sql`update products set embedding = ${vec}::vector, updated_at = now() where id = ${productId}`,
  );
}

export async function setFactEmbedding(
  db: Database,
  factId: string,
  embedding: number[],
): Promise<void> {
  const vec = toVectorLiteral(embedding);
  await db.execute(
    sql`update facts set embedding = ${vec}::vector, updated_at = now() where id = ${factId}`,
  );
}
