# "Khodkar" — Master Plan for a Self-Serve Automation Platform

> The working name is temporary; it may change later.
> Goal: let a small business with **zero technical knowledge** automate its own
> online sales and social presence — without needing us.
> This file is written to be executed in **Claude Code**. Build order = §15.

---

## 0) Design principle (North Star)

1. **The user never sees "settings"; they talk to a digital employee.** Wherever
   a form seems necessary, first ask: "Could the agent ask this in conversation?"
2. **Golden onboarding metric:** from "paste a site/social link" to "a live,
   testable bot" ⇒ **under 10 minutes**.
3. **Radical minimalism:** the panel has at most 4 pages. Each page does one job.
   If a feature needs an explanation, its design is wrong.
4. **Safety before smarts:** the agent never invents a price or makes a
   commitment; wherever it's unsure ⇒ a draft for the owner to approve.
5. **Mobile-first and messaging-first:** our user is a shop owner with a phone,
   not a laptop.

---

## 1) Target user and first-wave verticals

| Wave | Vertical | Why |
|---|---|---|
| v1 | boutique / bridal gallery / apparel | high ticket, many repeated questions |
| v1 | jewelry & accessories | catalog-driven, similar to above |
| v2 | salon / beauty | appointment-driven |
| v2 | restaurant / cafe | menu + ordering |

- Product language: fully localized, RTL, localized numerals.
- **Stay vertical:** don't add a new vertical until ~20 active tenants.

---

## 2) User journey — end to end

### 10-minute onboarding (fully self-serve)
1. Landing ⇒ "Start free" button ⇒ sign in with a mobile number (SMS OTP).
2. Pick a vertical (image cards, one tap).
3. "Give me your site or social link" ⇒ the **Crawler Agent** starts; the user
   sees live progress: "124 products found… prices extracted… brand tone:
   friendly-luxury".
4. The **Interview Agent** asks about gaps, chat-style (4–6 questions max):
   ship to other cities? working hours? do you rent? send one sample answer you'd
   give a customer.
5. **Sandbox:** "now talk to your assistant and test it" — a live chat on the
   same page.
6. Connect Telegram with a visual **BotFather wizard** (step-by-step GIF + a
   paste-token field) ⇒ "Activate" button.
7. Congrats + bot link + suggestion to install the site widget (one-line snippet
   / plugin).

### Owner's daily use (all in Telegram)
- A new product photo + one line ⇒ added to the catalog (and the site if connected).
- "code 215 is out" ⇒ out of stock.
- Drafts needing approval ⇒ ✅ send / ✏️ edit / ❌ reject buttons.
- "what sold most this week?" ⇒ a text + chart report.
- Campaign: "tell customers from the last two months about Friday's sale" ⇒
  preview ⇒ approve ⇒ send.

### Human-in-the-loop = the owner (not us)
- Low confidence or a sensitive topic (discount, complaint, price of an
  out-of-stock item) ⇒ the reply is **not** sent; a draft goes to the owner's
  Telegram.
- Internal SLA: if the owner doesn't reply within 15 minutes ⇒ a polite
  "a colleague will respond shortly" message to the customer.

---

## 3) Tech stack

| Layer | Choice | Why |
|---|---|---|
| Web/Panel | **Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui** | fast to build in Claude Code, easy RTL |
| Font/UI | Vazirmatn, monochrome theme + one accent | minimal, on-brand |
| DB | **PostgreSQL + pgvector**, ORM: **Drizzle** | multi-tenant + RAG in one place |
| Queue/Jobs | **Redis + BullMQ** | crawl, campaigns, weekly report |
| Telegram | **grammY** (webhook per-tenant) | multi-bot, lightweight |
| Crawler | cheerio + got; fallback: **Playwright** | JS-heavy sites |
| LLM | **OpenRouter** (multi-model + fallback), embeddings there too | existing infra, provider-flexible |
| Subscription payments | Zarinpal (v1) | standard local gateway |
| SMS OTP/campaign | Kavenegar or sms.ir — **platform account, tiered resale of usage** | user doesn't want a separate panel |
| Deploy | Docker Compose on a VPS + Caddy (TLS) | simple, repeatable |

---

## 4) Repo structure (monorepo)

```
khodkar/
├─ apps/
│  ├─ web/                 # Next.js: landing + panel + onboarding + widget
│  └─ worker/              # BullMQ: crawl, campaigns, weekly-report
├─ packages/
│  ├─ db/                  # drizzle schema + migrations + seed
│  ├─ agent/               # agent core: prompts, tools, policies, rag
│  ├─ channels/            # telegram (grammY), web-widget, [sms, instagram]
│  ├─ crawler/             # site/woo/instagram extractors
│  └─ shared/              # types, utils, localized UI strings
├─ presets/                # vertical templates (JSON/TS) — mazon.ts first
├─ plugin-wp/              # WordPress pairing plugin (PHP, separate build)
├─ docker-compose.yml
├─ CLAUDE.md               # project rules for Claude Code (§18)
└─ docs/master-plan.md     # this file
```

---

## 5) Data model (key tables)

- **tenants**: id, name, vertical, plan, status, tone_profile(json), settings(json)
- **users**: id, tenant_id, phone, role(owner/staff), tg_chat_id
- **channels**: id, tenant_id, type(telegram|web|sms|instagram), credentials(enc), status
- **products**: id, tenant_id, sku, title, price, rent_price?, deposit?, stock, images[], attrs(json), embedding(vector)
- **facts/faqs**: id, tenant_id, q, a, embedding — (shipping, working hours, rental terms…)
- **conversations**: id, tenant_id, channel_id, customer_ref, status
- **messages**: id, conv_id, role(customer|agent|owner), text, meta(confidence, tool_calls)
- **drafts**: id, conv_id, proposed_text, reason, status(pending/approved/edited/rejected)
- **leads**: id, tenant_id, phone, name?, event_date?, interest[], source
- **campaigns**: id, tenant_id, audience_filter(json), template, status, stats(json)
- **orders_or_bookings**: id, tenant_id, type(sale|rent|slot), product_id, date_range?, status
- **usage_events**: tenant_id, kind(llm_tokens|sms|msg), qty, cost — the basis for billing and margin
- **subscriptions**: tenant_id, plan, period, paid_until, gateway_ref
- **quality_reports**: tenant_id, week, score, issues(json), missed_sales(json)

Rules: every query is scoped by `tenant_id` (RLS-style in the repo layer);
credentials are AES-GCM encrypted with a simple env-key KMS.

---

## 6) Agent core (packages/agent)

**Response loop:** normalize ⇒ intent ⇒ RAG (products+facts, top-k) ⇒
policy-check ⇒ tool-use ⇒ answer or **draft-for-owner**.

**Tools (function calling):**
`search_products, get_product, check_availability(date), get_fact, create_lead,
register_interest, book_slot, escalate_to_owner, log_unanswered`

**Iron rules (policy layer, hard-coded, not prompt):**
- Price/stock only from tool output; a free-form number in an answer ⇒ block.
- Discount/commitment/new address ⇒ always a draft.
- Confidence < threshold or zero-hit in RAG ⇒ draft + `log_unanswered` (feeds
  improvement).
- Reply language = the localized language; length ≤ 3 sentences unless a detail
  question.

**Security (take it seriously):**
- Customer text and **crawled content = untrusted input**; kept inside separate
  prompt delimiters with zero instruction-following (injection tests in CI).
- Per-tenant/vertical tool allowlist; per-conversation rate-limit; per-tenant
  kill-switch.

---

## 7) Agentic onboarding (the heart of the product — packages/crawler + agent)

**A. Crawl:**
- Detect WooCommerce (public `/wp-json/wc/store/products` or theme signals) ⇒ the
  structured path.
- Otherwise: sitemap ⇒ product pages ⇒ extract title/price/images with selector
  heuristics + LLM extraction over summarized HTML.
- Social (without an API, this is unstable from a server): v1 path = "forward
  your last 5 posts to the bot" ⇒ extract from caption/photo. Honest and effective.

**B. Interview:** the `required_facts` checklist from the vertical preset; only
gaps are asked; tone is prompt-tuned from 3 sample owner answers.

**C. Build:** create the tone_profile + index embeddings + enable tools per preset.

**D. Sandbox:** a test chat watermarked "test mode"; an "Activate" button ⇒
connect the channel.

Onboarding DoD: a sample shop site ⇒ live bot in < 10 minutes, no human intervention.

---

## 8) Vertical preset (presets/) — schema

```ts
export type VerticalPreset = {
  id: 'mazon' | 'boutique' | ...;
  requiredFacts: FactKey[];          // shipping, hours, rent_terms, deposit...
  tools: ToolName[];                  // check_availability only for rentals
  intents: IntentDef[];               // price_query, rent_query, size_query...
  toneOptions: TonePreset[];          // luxury-formal / friendly / young
  sampleDialogs: Dialog[];            // few-shot
  campaignTemplates: CampaignTpl[];   // "sale news", "fitting reminder"
  onboardingQuestions: Question[];
}
```
First preset: **mazon.ts** — a bridal/eveningwear gallery (rent + deposit +
calendar, fitting, sale).

---

## 9) Channels (packages/channels)

| Channel | Version | No-tech mechanism |
|---|---|---|
| Telegram | **v1** | visual BotFather wizard + paste token; webhook set automatically |
| Web widget | **v1** | one line `<script src=.../w.js data-key=...>` |
| WordPress/WooCommerce | v1 read, v1.5 write | **pairing code**: install plugin ⇒ 6-digit code from our panel ⇒ paste into the plugin ⇒ keys exchanged securely |
| SMS | v1.5 | OTP from day one; SMS campaigns with quota |
| Social | v2 | content generation from v1; **publish = tap-to-approve** (API risk); official API later |

---

## 10) User panel — exactly 4 pages (minimal)

1. **Home:** bot status (on/off), 3 big numbers (today's chats, new leads,
   pending approvals), a big "Test assistant" button.
2. **Conversations:** list + detail; "needs approval" filter.
3. **Catalog:** product grid + search; adding = upload a photo + one line (same
   experience as Telegram, in the web).
4. **Campaign:** create with a single sentence ⇒ audience preview ⇒ send.

"Settings" has no page ⇒ a "Talk to the settings assistant" button. Design:
light background, monochrome + copper-gold accent, Vazirmatn, soft corners, no
shadow-play; full RTL; mobile first.

---

## 11) Quality and trust

- **Weekly quality report (job):** sample conversations ⇒ LLM-as-judge with a
  rubric (price correctness, tone, missed sales opportunity) ⇒ a summary to the
  owner's Telegram + stored in quality_reports.
- A "Unanswered questions" tab ⇒ one-click convert to a FAQ.
- Full audit log of tool calls.

---

## 12) Landing (one page)

- H1: "Give us your site link; 10 minutes later you have a sales assistant."
- Live demo: a visitor gives any site link ⇒ a preview of the assistant
  answering (with rate-limit and cache).
- 3 value cards, a 60-second video, pricing, CTA.
- No busy menu. That's it.

---

## 13) Pricing (initial hypothesis — tunable)

| Plan | Monthly (Toman) | Includes |
|---|---|---|
| Trial | free for 7 days | 50 chats, 1 channel |
| Basic | ~2.5M | Telegram+widget, 1,000 chats, catalog 500 |
| Pro | ~6M | + campaigns, weekly report, WooCommerce write, 5,000 chats |

- Overage: chat/SMS packs. 2 months free annually. Renewals payable in USDT
  (inflation hedge).
- Track margin with per-tenant usage_events; target: AI cost < 25% of ARPU.

---

## 14) MVP scope — a clear cut

**In v1:** full agentic onboarding (crawl+interview+sandbox), Telegram bot, web
widget, catalog+RAG, owner draft-approval, leads, 4-page panel, OTP, Zarinpal
subscription, mazon preset, simple weekly report.
**v1.5:** WooCommerce write-back, Telegram/SMS campaigns, rental/appointment calendar.
**v2:** social tap-to-approve, second & third presets, image search, natural-language sales report.
**Not now:** mobile app, voice, template marketplace, white-label.

---

## 15) 12-week roadmap (build order in Claude Code)

| Week | Output | DoD |
|---|---|---|
| 1 | monorepo skeleton, docker, DB schema, OTP auth | `docker compose up` ⇒ mobile login works |
| 2 | tenants + empty 4-page RTL panel | create a tenant and switch securely |
| 3 | crawler (Woo + generic) + catalog import | test site ⇒ 100+ products with correct prices |
| 4 | RAG (pgvector) + agent core + policy layer | policy tests green (free-form price is blocked) |
| 5 | Telegram channel (grammY multi-bot) + BotFather wizard | a real message ⇒ correct answer from the catalog |
| 6 | owner draft-approval + leads + unanswered questions | approve/edit/reject flow end-to-end |
| 7 | Interview Agent + sandbox + full onboarding wiring | golden metric: link ⇒ bot < 10 minutes |
| 8 | web widget + full conversations/catalog panel | the widget works on an external site |
| 9 | Zarinpal billing + usage metering + plans | test payment ⇒ plan activation |
| 10 | weekly quality report + audit + kill-switch + injection tests | sample report to the owner's Telegram |
| 11 | landing + live demo + activation analytics | page live, demo form works |
| 12 | **pilot:** the reference tenant #1 + two other businesses | 3 active tenants, NPS and a bug list |

---

## 16) Metrics

- **TTV** (link ⇒ bot): target < 10 minutes
- **Activation:** bot active + ≥10 real chats in the first week
- Deflection rate (answered without owner intervention) target > 70%
- Month-2 retention, per-tenant margin, unanswered questions/week (should trend down)

---

## 17) Risks ⇒ answers

- **LLM access/cost:** OpenRouter multi-model + fallback + caching repeated
  answers + a cheap model for intent.
- **Prompt injection from crawled/customer content:** delimiters + hard-coded
  policy + CI tests (a core competency).
- **Quality across scattered verticals ⇒ churn:** stay vertical, preset-first.
- **Social platform risk:** tap-to-approve only until further notice; don't
  promise full-auto.
- **Payment/infra sanction risk:** everything self-hosted on a VPS; zero external
  cloud dependency.

---

## 18) Claude Code directives

**CLAUDE.md (create it with this content):**
- TypeScript strict; every package has tests (vitest); the policy layer isn't
  merged without tests.
- Every migration via drizzle-kit; seed = one demo tenant with 30 fake products.
- Localized UI from `shared/i18n-fa.ts`; no hardcoded strings.
- Secrets only from env; `credentials` always stored encrypted.
- Before each phase: read this file, build only that week's scope.

**Kickoff prompt (week 1):**
```
Read docs/master-plan.md. Build the week-1 phase:
a pnpm-workspaces monorepo per §4, docker-compose (postgres+pgvector, redis),
the §5 drizzle schema + migration + demo seed, auth with SMS OTP (mock provider
in dev). DoD: docker compose up and mobile login works. Write the tests.
```

After each phase: check the DoD ⇒ commit ⇒ next phase.
