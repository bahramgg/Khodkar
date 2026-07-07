/**
 * Pilot seed (§15 week 12): three active tenants across verticals, each with a
 * catalog, facts, an owner, and a web channel — indexed and ready to answer.
 * Run via `pnpm db:seed:pilot`.
 */
import {
  createDb,
  tenants,
  users,
  memberships,
  importProducts,
  insertFact,
  upsertChannel,
  deleteTenantByName,
  type Database,
} from '@khodkar/db';
import { HashEmbedder, indexTenantCatalog } from '@khodkar/agent';
import type { Vertical } from '@khodkar/shared';

interface PilotProduct {
  sku: string;
  title: string;
  price: number | null;
  rentPrice?: number | null;
  stock?: number;
}
interface PilotDef {
  name: string;
  vertical: Vertical;
  ownerPhone: string;
  products: PilotProduct[];
  facts: { q: string; a: string }[];
}

const PILOTS: PilotDef[] = [
  {
    name: 'مزون آرزو',
    vertical: 'mazon',
    ownerPhone: '+989120000001',
    products: Array.from({ length: 12 }, (_, i) => ({
      sku: `MZ-${100 + i}`,
      title: `لباس عروس مدل ${['ماهی', 'پرنسسی', 'دنباله‌دار', 'کلوش'][i % 4]} کد ${100 + i}`,
      price: 5_000_000 + i * 300_000,
      rentPrice: 900_000 + i * 50_000,
      stock: (i % 3) + 1,
    })),
    facts: [
      { q: 'ارسال به شهرستان دارید؟', a: 'بله، با پست پیشتاز به سراسر کشور ارسال می‌کنیم.' },
      { q: 'شرایط اجاره چیست؟', a: 'اجاره سه‌روزه با ودیعه؛ پس از بازگشت سالم، ودیعه عودت می‌شود.' },
    ],
  },
  {
    name: 'گالری زر',
    vertical: 'jewelry',
    ownerPhone: '+989120000002',
    products: Array.from({ length: 12 }, (_, i) => ({
      sku: `ZR-${200 + i}`,
      title: `${['انگشتر', 'گردنبند', 'دستبند', 'گوشواره'][i % 4]} طلا مدل ${200 + i}`,
      price: 12_000_000 + i * 800_000,
      stock: (i % 4) + 1,
    })),
    facts: [
      { q: 'اجرت ساخت چقدر است؟', a: 'اجرت بین ۷ تا ۱۵ درصد بسته به مدل است.' },
      { q: 'ضمانت دارید؟', a: 'همه‌ی محصولات دارای فاکتور رسمی و ضمانت اصالت هستند.' },
    ],
  },
  {
    name: 'کافه‌رستوران خانه',
    vertical: 'restaurant',
    ownerPhone: '+989120000003',
    products: Array.from({ length: 12 }, (_, i) => ({
      sku: `KH-${300 + i}`,
      title: `${['چلوکباب', 'جوجه', 'قورمه‌سبزی', 'پاستا'][i % 4]} پرس ${300 + i}`,
      price: 250_000 + i * 20_000,
      stock: 20,
    })),
    facts: [
      { q: 'ساعت کاری چنده؟', a: 'همه‌روزه از ۱۲ ظهر تا ۱۱ شب.' },
      { q: 'ارسال دارید؟', a: 'بله، ارسال با پیک تا شعاع ۵ کیلومتری رایگان است.' },
    ],
  },
];

async function createPilot(db: Database, embedder: HashEmbedder, def: PilotDef): Promise<string> {
  await deleteTenantByName(db, def.name);

  const [tenant] = await db
    .insert(tenants)
    .values({ name: def.name, vertical: def.vertical, plan: 'basic', status: 'active' })
    .returning();
  if (!tenant) throw new Error('tenant insert failed');

  const [owner] = await db
    .insert(users)
    .values({ tenantId: tenant.id, phone: def.ownerPhone, role: 'owner' })
    .onConflictDoUpdate({ target: users.phone, set: { tenantId: tenant.id } })
    .returning();
  if (owner) {
    await db
      .insert(memberships)
      .values({ tenantId: tenant.id, userId: owner.id, role: 'owner' })
      .onConflictDoNothing({ target: [memberships.tenantId, memberships.userId] });
  }

  await importProducts(db, tenant.id, def.products);
  for (const f of def.facts) await insertFact(db, { tenantId: tenant.id, q: f.q, a: f.a });
  await upsertChannel(db, { tenantId: tenant.id, type: 'web', credentials: '', status: 'active' });
  await indexTenantCatalog(db, tenant.id, embedder);
  return tenant.id;
}

async function main() {
  const { db, sql } = createDb();
  const embedder = new HashEmbedder();
  console.log('[seed:pilot] creating 3 active pilot tenants…');
  for (const def of PILOTS) {
    const id = await createPilot(db, embedder, def);
    console.log(`  ✓ ${def.name} (${def.vertical}) — ${id}`);
  }
  console.log('[seed:pilot] done. 3 active tenants ready.');
  await sql.end();
}

main().catch((e) => {
  console.error('[seed:pilot] failed:', e);
  process.exit(1);
});
