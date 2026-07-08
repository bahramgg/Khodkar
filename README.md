# Khodkar

Self-serve automation platform that lets a small business automate its online
sales & social presence with **zero technical knowledge** — by chatting with a
digital employee instead of filling out forms. The product UI is fully
localized and RTL.

> Product source of truth: [`docs/master-plan.md`](docs/master-plan.md).
> Build order & scope: master-plan §15. Project rules: [`CLAUDE.md`](CLAUDE.md).

## Monorepo layout

```
apps/web        Next.js 14 (App Router, RTL) — landing + panel + onboarding + widget
apps/worker     BullMQ worker — crawl, campaigns, weekly-report
packages/db     drizzle schema (§5) + migrations + seed
packages/shared types, localized UI strings, crypto (AES-GCM), auth core (OTP + session JWT),
                plans + payment gateway
packages/agent  RAG + policy layer + tools + quality report
packages/channels  SMS (mock in dev), Telegram (grammY), web widget handler
packages/crawler   site/woo/generic extractors
presets/        vertical presets (§8)
plugin-wp/      WordPress pairing plugin (separate build)
```

## Quick start (dev)

```bash
cp .env.example .env
pnpm install
docker compose up -d db redis     # postgres+pgvector + redis
pnpm db:migrate                   # apply schema
pnpm db:seed                      # demo tenant + 30 products
pnpm db:seed:pilot                # 3 active pilot tenants (optional)
pnpm --filter @khodkar/web dev    # panel on http://localhost:3000
```

Log in at `/login` with any valid mobile number. In dev the OTP is **not** sent
by SMS — the `mock` provider prints it to the web server's console:

```
[sms:mock] → +989121234567: <login code: 48448>
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
pnpm test          # vitest across the workspace
pnpm -r typecheck  # strict TS everywhere
```

## Status — 12-week roadmap complete

All phases in master-plan §15 are implemented, each with its DoD verified
end-to-end against a live database (and the widget verified in a real browser):

1. Monorepo + docker + DB schema + OTP auth
2. Tenants (membership-based) + 4-page RTL panel + secure switch
3. Catalog crawler (Woo + generic) + tenant-scoped import
4. RAG (pgvector) + agent core + hard-coded policy layer
5. Telegram channel (grammY multi-bot) + BotFather wizard
6. Owner draft-approval (approve / edit / reject) + leads + unanswered → FAQ
7. Agentic onboarding: link → crawl → interview → sandbox → live
8. Embeddable web widget + catalog management
9. Zarinpal billing + subscriptions + usage metering
10. Weekly quality report + audit log + kill-switch + injection tests
11. Landing page + live demo + activation analytics
12. Pilot: 3 active tenants + NPS + bug list

130 passing tests; strict TypeScript across every package.
