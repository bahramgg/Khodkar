/**
 * Seed a single "مزون" tenant with an owner user, a few facts, and 30 fake
 * products (rental bridal/eveningwear). Idempotent-ish: it wipes the demo
 * tenant by name first so re-running is safe in dev.
 *
 * Run via `pnpm db:seed`.
 */
import { eq } from 'drizzle-orm';
import { createDb } from './client.js';
import { tenants, users, facts, products } from './schema.js';

const DEMO_TENANT = 'مزون آرزو (نمونه)';
const OWNER_PHONE = '+989120000000';

const MODELS = [
  'پرنسسی',
  'ماهی',
  'دنباله‌دار',
  'ساده و شیک',
  'کار شده',
  'یقه دلبری',
  'آستین گیپور',
  'دم‌کوتاه',
  'کلوش',
  'مدرن',
];
const COLORS = ['سفید', 'شیری', 'شامپاینی', 'صورتی', 'یخی'];
const SIZES = ['۳۶', '۳۸', '۴۰', '۴۲', '۴۴', '۴۶'];

function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length] as T;
}

/** Deterministic 30-product catalog — no RNG so seeds are reproducible. */
function buildProducts(tenantId: string) {
  return Array.from({ length: 30 }, (_, i) => {
    const model = pick(MODELS, i);
    const color = pick(COLORS, i * 3);
    const isRental = i % 3 !== 0; // ~2/3 rentable, rest sale-only
    const basePrice = 4_000_000 + (i % 10) * 500_000; // 4M–8.5M Toman
    return {
      tenantId,
      sku: `MZ-${String(1000 + i)}`,
      title: `لباس عروس مدل ${model} کد ${1000 + i}`,
      price: basePrice,
      rentPrice: isRental ? Math.round(basePrice * 0.18) : null,
      deposit: isRental ? Math.round(basePrice * 0.5) : null,
      stock: (i % 4) + 1,
      images: [] as string[],
      attrs: {
        model,
        color,
        sizes: SIZES.slice(0, 3 + (i % 3)),
        category: i % 5 === 0 ? 'شب' : 'عروس',
      },
    };
  });
}

const DEMO_FACTS = [
  {
    q: 'ارسال به شهرستان دارید؟',
    a: 'بله، ارسال به سراسر کشور با پست پیشتاز و تیپاکس انجام می‌شود. هزینه‌ی ارسال پس‌کرایه است.',
  },
  {
    q: 'ساعت کاری مزون چند است؟',
    a: 'همه‌روزه از ساعت ۱۰ صبح تا ۹ شب، به‌جز روزهای تعطیل رسمی.',
  },
  {
    q: 'شرایط اجاره لباس چیست؟',
    a: 'اجاره‌ی هر لباس برای ۳ روز است؛ مبلغ ودیعه هنگام تحویل گرفته می‌شود و پس از بازگرداندن سالم لباس عودت داده می‌شود.',
  },
  {
    q: 'برای پرو باید وقت بگیرم؟',
    a: 'بله، برای پرو لطفاً از قبل هماهنگ کنید تا زمان اختصاصی برایتان رزرو شود.',
  },
];

async function main() {
  const { db, sql } = createDb();
  console.log('[seed] seeding demo mazon tenant…');

  // Reset the demo tenant (cascades to its rows).
  await db.delete(tenants).where(eq(tenants.name, DEMO_TENANT));

  const [tenant] = await db
    .insert(tenants)
    .values({
      name: DEMO_TENANT,
      vertical: 'mazon',
      plan: 'trial',
      status: 'active',
      toneProfile: { style: 'luxury', samples: [] },
      settings: { city: 'تهران' },
    })
    .returning();

  if (!tenant) throw new Error('failed to insert demo tenant');

  await db
    .insert(users)
    .values({ tenantId: tenant.id, phone: OWNER_PHONE, role: 'owner' })
    .onConflictDoNothing({ target: users.phone });

  await db.insert(facts).values(DEMO_FACTS.map((f) => ({ ...f, tenantId: tenant.id })));
  await db.insert(products).values(buildProducts(tenant.id));

  console.log(`[seed] done: tenant ${tenant.id}, owner ${OWNER_PHONE}, 30 products, ${DEMO_FACTS.length} facts`);
  await sql.end();
}

main().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
