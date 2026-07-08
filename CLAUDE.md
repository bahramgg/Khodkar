# CLAUDE.md — project rules for "Khodkar" (for Claude Code)

> Product source of truth: `docs/master-plan.md`. Before each phase, read it and
> build only the scope of that week (§15 = build order).

## Code principles

- **TypeScript strict** in every package (extend `tsconfig.base.json`).
- **Every package has tests** (vitest). The policy layer is not merged without tests.
- Every migration is generated with **drizzle-kit**; hand-editing SQL is forbidden.
  - `seed` = one demo tenant with 30 fake products.
- **Localized UI text only from `@khodkar/shared` (`i18n-fa.ts`)** — no hardcoded
  strings in the UI.
- **Secrets only from env**; the `credentials` field is always stored encrypted
  (AES-256-GCM).
- Every database query is scoped by `tenant_id` (RLS-style pattern in the repo layer).

## Security (take it seriously)

- Customer text and crawled content = **untrusted**; placed inside prompt
  delimiters with zero instruction-following. Injection tests run in CI.
- Price/stock only from tool output; a free-form number in an answer ⇒ block.
- Per-tenant kill-switch and rate-limit.

## Monorepo layout (§4)

```
apps/web      Next.js 14 (App Router) — landing + panel + onboarding + widget
apps/worker   BullMQ — crawl, campaigns, weekly-report
packages/db       drizzle schema + migrations + seed
packages/agent    agent core: prompts, tools, policies, rag
packages/channels telegram (grammY), web-widget, [sms, instagram]
packages/crawler  site/woo/instagram extractors
packages/shared   types, utils, localized UI strings, auth-core, crypto
presets/          vertical presets (mazon.ts first)
plugin-wp/        WordPress pairing plugin (separate build)
```

## Useful commands

```bash
pnpm install
docker compose up -d db redis   # postgres+pgvector + redis
pnpm db:generate                # generate a migration from the schema
pnpm db:migrate                 # apply migrations
pnpm db:seed                    # demo tenant + 30 products
pnpm --filter @khodkar/web dev  # panel on :3000
pnpm test                       # vitest across the workspace
```

## Phase status

- [x] **Week 1** — monorepo skeleton, docker, DB schema (§5), OTP auth (mock in dev).
  - DoD: `docker compose up` ⇒ mobile login works.
- [x] **Week 2** — tenants + empty 4-page RTL panel.
  - DoD: create a tenant and switch securely (membership-based; switching into a
    non-member tenant ⇒ 403).
- [x] **Week 3** — crawler (Woo + generic) + catalog import.
  - DoD: a test site ⇒ 100+ products with correct prices (E2E: live crawl ⇒ import ⇒ 120 products).
- [x] **Week 4** — RAG (pgvector) + agent core + policy layer.
  - DoD: policy tests green (a free-form price is blocked); RAG verified on live pgvector.
- [x] **Week 5** — Telegram channel (grammY multi-bot) + BotFather wizard.
  - DoD: a real message ⇒ a correct answer from the catalog (E2E: Telegram update ⇒ grounded reply + persisted).
- [x] **Week 6** — owner draft-approval + leads + unanswered questions.
  - DoD: approve / edit / reject flow end-to-end (+ lead capture + convert unanswered → FAQ).
- [x] **Week 7** — Interview Agent + sandbox + full onboarding wiring.
  - DoD (golden): link ⇒ live bot in under 10 minutes (E2E: crawl→interview→sandbox→live in < 1s).
- [x] **Week 8** — web widget + full conversations/catalog panel.
  - DoD: the widget works on an external site (verified in a real browser on a separate origin).
- [x] **Week 9** — Zarinpal billing + usage metering + plans.
  - DoD: a test payment ⇒ plan activation (E2E: checkout→callback→plan=basic + subscription).
- [x] **Week 10** — weekly quality report + audit + kill-switch + injection tests.
  - DoD: a sample report to the owner's Telegram (E2E: report → owner chat + quality_reports + kill-switch + audit).
- [x] **Week 11** — landing + live demo + activation analytics.
  - DoD: landing live, demo form works (E2E: crawl an external site → grounded answer + analytics_events).
- [x] **Week 12** — pilot: 3 active tenants + NPS + bug list.
  - DoD: 3 active tenants (E2E: all three answer live from their catalog), NPS computed, bug list works.

🎉 **12-week roadmap complete.**

After each phase: check the DoD ⇒ commit ⇒ next phase.
