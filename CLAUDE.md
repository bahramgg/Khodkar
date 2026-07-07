# CLAUDE.md — قوانین پروژه‌ی «خودکار» برای Claude Code

> منبع حقیقت محصول: `docs/master-plan-fa.md`. قبل از هر فاز، آن را بخوان و فقط
> scope همان هفته را بساز (بخش ۱۵ = ترتیب ساخت).

## اصول کد

- **TypeScript strict** در همه‌ی پکیج‌ها (`tsconfig.base.json` را extend کن).
- **هر پکیج تست دارد** (vitest). لایه‌ی policy بدون تست merge نمی‌شود.
- هر migration با **drizzle-kit** ساخته می‌شود؛ دستکاری دستی SQL ممنوع.
  - `seed` = یک tenant مزون با ۳۰ محصول فیک.
- **فارسی UI فقط از `@khodkar/shared` (`i18n-fa.ts`)** — هیچ رشته‌ی هاردکد در UI.
- **کلیدها فقط از env**؛ فیلد `credentials` همیشه رمزنگاری‌شده (AES-256-GCM) ذخیره شود.
- هر کوئری دیتابیس با `tenant_id` scope می‌شود (الگوی RLS در لایه‌ی repo).

## امنیت (جدی)

- متن مشتری و محتوای خزیده‌شده = **untrusted**؛ در پرامپت داخل delimiters و با
  دستورپذیری صفر. تست‌های injection در CI.
- قیمت/موجودی فقط از خروجی tool؛ عدد آزاد در پاسخ ⇐ بلاک.
- kill-switch و rate-limit per-tenant.

## ساختار monorepo (بخش ۴)

```
apps/web      Next.js 14 (App Router) — لندینگ + پنل + آنبوردینگ + ویجت
apps/worker   BullMQ — crawl, campaigns, weekly-report
packages/db       drizzle schema + migrations + seed
packages/agent    هسته‌ی agent: prompts, tools, policies, rag
packages/channels telegram (grammY), web-widget, [sms, instagram]
packages/crawler  site/woo/instagram extractors
packages/shared   types, utils, i18n-fa, auth-core, crypto
presets/          قالب‌های صنفی (mazon.ts اولین)
plugin-wp/        پلاگین وردپرس pairing (جدا build)
```

## دستورهای مفید

```bash
pnpm install
docker compose up -d db redis   # postgres+pgvector + redis
pnpm db:generate                # ساخت migration از schema
pnpm db:migrate                 # اعمال migration
pnpm db:seed                    # tenant مزون + ۳۰ محصول
pnpm --filter @khodkar/web dev  # پنل روی :3000
pnpm test                       # vitest کل ورک‌اسپیس
```

## وضعیت فازها

- [x] **هفته ۱** — اسکلت monorepo، docker، DB schema (بخش ۵)، auth OTP (mock در dev).
  - DoD: `docker compose up` ⇐ لاگین موبایلی کار می‌کند.
- [x] **هفته ۲** — tenants + پنل خالی ۴صفحه‌ای RTL.
  - DoD: ساخت tenant و سوئیچ امن (membership-based؛ سوئیچ به tenantِ غیرعضو ⇐ ۴۰۳).
- [ ] هفته ۳ — crawler (Woo + generic) + ایمپورت کاتالوگ.
- [ ] ... (بخش ۱۵)

بعد از هر فاز: چک DoD ⇐ کامیت ⇐ فاز بعد.
