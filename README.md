# خودکار (Khodkar)

Self-serve automation platform that lets an Iranian small business automate its
online sales & social presence with **zero technical knowledge** — by chatting
with a digital employee instead of filling out forms.

> Product source of truth: [`docs/master-plan-fa.md`](docs/master-plan-fa.md).
> Build order & scope: master-plan §15. Project rules: [`CLAUDE.md`](CLAUDE.md).

## Monorepo layout

```
apps/web        Next.js 14 (App Router, RTL) — landing + panel + onboarding + widget
apps/worker     BullMQ worker — crawl, campaigns, weekly-report (later weeks)
packages/db     drizzle schema (§5) + migrations + mazon seed
packages/shared types, i18n-fa, crypto (AES-GCM), auth core (OTP + session JWT)
packages/channels  SMS provider (mock in dev) + future telegram/web/instagram
packages/agent  RAG + policy layer + tools (week 4)
packages/crawler   site/woo/instagram extractors (week 3)
presets/        vertical presets — mazon.ts first (§8)
plugin-wp/      WordPress pairing plugin (separate build)
```

## Quick start (dev)

```bash
cp .env.example .env
pnpm install
docker compose up -d db redis     # postgres+pgvector + redis
pnpm db:migrate                   # apply schema
pnpm db:seed                      # 1 mazon tenant + 30 products
pnpm --filter @khodkar/web dev    # panel on http://localhost:3000
```

Log in at `/login` with any Iranian mobile number. In dev the OTP is **not**
sent by SMS — the `mock` provider prints it to the web server's console:

```
[sms:mock] → +989121234567: کد ورود شما به «خودکار»: 48448
```

The seeded owner is `09120000000` (belongs to the demo tenant → lands on
`/panel`); any other number is treated as a new signup → `/onboarding`.

## Full stack via Docker

```bash
docker compose up -d db redis
docker compose --profile setup run --rm migrate   # migrate + seed
docker compose up -d web
```

## Tests & checks

```bash
pnpm test          # vitest across the workspace (auth, crypto, otp, sms, presets)
pnpm -r typecheck  # strict TS everywhere
```

## Week 1 status (DoD ✅)

- pnpm monorepo per master-plan §4.
- `docker compose` with postgres+pgvector and redis.
- drizzle schema (§5) + migration (pgvector enabled) + mazon seed.
- OTP mobile auth (mock SMS in dev), session JWT in an httpOnly cookie,
  tenant-aware routing, protected panel.
- 44 passing tests; end-to-end login verified against a live database.
