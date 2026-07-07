# «خودکار» — Master Plan پلتفرم اتوماسیون Self-Serve
> نام کاری موقت است؛ بعداً عوض می‌شود.
> هدف: کسب‌وکار ایرانی با **صفر دانش فنی**، فروش آنلاین و سوشالش را خودش اتومیت کند — بدون نیاز به من.
> این فایل برای اجرا در **Claude Code** نوشته شده. ترتیب ساخت = بخش ۱۵.

---

## ۰) اصل طراحی (North Star)

1. **کاربر هیچ‌وقت «تنظیمات» نمی‌بیند؛ با یک کارمند دیجیتال حرف می‌زند.** هر جا فرم لازم شد، اول بپرس: «می‌شود این را agent در گفتگو بپرسد؟»
2. **معیار طلایی آنبوردینگ:** از «دادن لینک سایت/اینستاگرام» تا «ربات زنده‌ی قابل‌تست» ⇐ **زیر ۱۰ دقیقه**.
3. **مینیمالیسم رادیکال:** پنل حداکثر ۴ صفحه. هر صفحه یک کار. اگر فیچری توضیح لازم دارد، طراحی‌اش غلط است.
4. **ایمنی قبل از هوشمندی:** agent هرگز قیمت نمی‌سازد، تعهد نمی‌دهد؛ هر جا مطمئن نیست ⇐ پیش‌نویس برای تأیید مالک.
5. **موبایل‌فرست و تلگرام‌محور:** کاربرِ ما صاحب مغازه است با گوشی، نه لپ‌تاپ.

---

## ۱) کاربر هدف و صنف‌های موج اول

| موج | صنف | چرا |
|---|---|---|
| v1 | مزون / گالری عروس / بوتیک پوشاک | تجربه‌ی مظهری، تیکت بالا، پرسش تکراری زیاد |
| v1 | زیورآلات و اکسسوری | کاتالوگ‌محور، مشابه بالا |
| v2 | آرایشگاه / سالن زیبایی | نوبت‌محور |
| v2 | رستوران / کافه | منو + سفارش |

- زبان محصول: فارسی کامل، RTL، اعداد فارسی.
- **عمودی بمان:** تا ۲۰ tenant فعال، صنف جدید اضافه نکن.

---

## ۲) سفر کاربر — End to End

### آنبوردینگ ۱۰ دقیقه‌ای (self-serve کامل)
1. لندینگ ⇐ دکمه «شروع رایگان» ⇐ ورود با شماره موبایل (OTP پیامکی).
2. انتخاب صنف (کارت‌های تصویری، یک تپ).
3. «لینک سایت یا اینستاگرامت را بده» ⇐ **Crawler Agent** شروع می‌کند؛ کاربر پروگرس زنده می‌بیند: «۱۲۴ محصول پیدا شد… قیمت‌ها استخراج شد… لحن برند: صمیمی-لوکس».
4. **Interview Agent** شکاف‌ها را چت‌گونه می‌پرسد (۴-۶ سؤال حداکثر): ارسال شهرستان؟ ساعت کاری؟ اجاره داری؟ یک نمونه جوابی که خودت به مشتری می‌دهی بفرست.
5. **Sandbox:** «حالا با دستیارت حرف بزن و تستش کن» — چت زنده در همان صفحه.
6. اتصال تلگرام با **ویزارد تصویری BotFather** (گیف قدم‌به‌قدم + فیلد paste توکن) ⇐ دکمه «فعال کن».
7. تبریک + لینک ربات + پیشنهاد نصب ویجت سایت (کد یک‌خطی / پلاگین).

### استفاده‌ی روزانه‌ی مالک (همه در تلگرام)
- عکس محصول جدید + یک خط ⇐ ثبت در کاتالوگ (و سایت اگر وصل است).
- «کد ۲۱۵ تمام شد» ⇐ ناموجود.
- پیش‌نویس‌های نیازمند تأیید ⇐ دکمه‌های ✅ ارسال / ✏️ ویرایش / ❌ رد.
- «این هفته چی بیشتر فروختیم؟» ⇐ گزارش متن + نمودار.
- کمپین: «به مشتری‌های دو ماه اخیر خبر حراج جمعه را بده» ⇐ پیش‌نمایش ⇐ تأیید ⇐ ارسال.

### Human-in-the-loop = خودِ مالک (نه ما)
- Confidence پایین یا موضوع حساس (تخفیف، شکایت، قیمت ناموجود) ⇐ جواب ارسال **نمی‌شود**؛ پیش‌نویس به تلگرام مالک می‌رود.
- SLA داخلی: اگر مالک ۱۵ دقیقه جواب نداد ⇐ پیام مؤدبانه‌ی «همکاران به‌زودی پاسخ می‌دهند» به مشتری.

---

## ۳) Stack فنی

| لایه | انتخاب | چرا |
|---|---|---|
| Web/Panel | **Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui** | سرعت ساخت در Claude Code، RTL آسان |
| فونت/UI | Vazirmatn، تم مونوکروم + یک accent | مینیمال، سازگار با سلیقه‌ی برند |
| DB | **PostgreSQL + pgvector**، ORM: **Drizzle** | multi-tenant + RAG در یک‌جا |
| Queue/Jobs | **Redis + BullMQ** | خزش، کمپین، گزارش هفتگی |
| Telegram | **grammY** (webhook per-tenant) | چند-ربات، سبک |
| Crawler | cheerio + got؛ fallback: **Playwright** | سایت‌های JS |
| LLM | **OpenRouter** (چند-مدل + fallback)، embeddings همان‌جا | زیرساخت فعلی خودم، دور از تحریم |
| پرداخت اشتراک | زرین‌پال (v1) | استاندارد ایران |
| پیامک OTP/کمپین | Kavenegar یا sms.ir — **اکانت پلتفرم، فروش پله‌ای مصرف** | کاربر پنل جدا نمی‌خواهد |
| Deploy | Docker Compose روی VPS + Caddy (TLS) | ساده، قابل‌تکرار |

---

## ۴) ساختار ریپو (monorepo)

```
khodkar/
├─ apps/
│  ├─ web/                 # Next.js: لندینگ + پنل + آنبوردینگ + ویجت
│  └─ worker/              # BullMQ: crawl, campaigns, weekly-report
├─ packages/
│  ├─ db/                  # drizzle schema + migrations + seed
│  ├─ agent/               # هسته‌ی agent: prompts, tools, policies, rag
│  ├─ channels/            # telegram (grammY), web-widget, [sms, instagram]
│  ├─ crawler/             # site/woo/instagram extractors
│  └─ shared/              # types, utils, i18n-fa
├─ presets/                # قالب‌های صنفی (JSON/TS) — mazon.ts اولین
├─ plugin-wp/              # پلاگین وردپرس pairing (PHP، جدا build)
├─ docker-compose.yml
├─ CLAUDE.md               # قوانین پروژه برای Claude Code (بخش ۱۸)
└─ docs/master-plan-fa.md  # همین فایل
```

---

## ۵) مدل داده (جدول‌های کلیدی)

- **tenants**: id, name, vertical, plan, status, tone_profile(json), settings(json)
- **users**: id, tenant_id, phone, role(owner/staff), tg_chat_id
- **channels**: id, tenant_id, type(telegram|web|sms|instagram), credentials(enc), status
- **products**: id, tenant_id, sku, title, price, rent_price?, deposit?, stock, images[], attrs(json), embedding(vector)
- **facts/faqs**: id, tenant_id, q, a, embedding — (ارسال، ساعت کاری، شرایط اجاره…)
- **conversations**: id, tenant_id, channel_id, customer_ref, status
- **messages**: id, conv_id, role(customer|agent|owner), text, meta(confidence, tool_calls)
- **drafts**: id, conv_id, proposed_text, reason, status(pending/approved/edited/rejected)
- **leads**: id, tenant_id, phone, name?, event_date?, interest[], source
- **campaigns**: id, tenant_id, audience_filter(json), template, status, stats(json)
- **orders_or_bookings**: id, tenant_id, type(sale|rent|slot), product_id, date_range?, status
- **usage_events**: tenant_id, kind(llm_tokens|sms|msg), qty, cost — پایه‌ی billing و مارجین
- **subscriptions**: tenant_id, plan, period, paid_until, gateway_ref
- **quality_reports**: tenant_id, week, score, issues(json), missed_sales(json)

قواعد: هر کوئری با `tenant_id` scope می‌شود (RLS-style در لایه‌ی repo)؛ credentials رمزنگاری AES-GCM با KMS ساده‌ی env-key.

---

## ۶) هسته‌ی Agent (packages/agent)

**حلقه‌ی پاسخ:** normalize ⇐ intent ⇐ RAG (products+facts, top-k) ⇐ policy-check ⇐ tool-use ⇐ answer یا **draft-for-owner**.

**ابزارها (function calling):**
`search_products, get_product, check_availability(date), get_fact, create_lead, register_interest, book_slot, escalate_to_owner, log_unanswered`

**قوانین آهنین (policy layer, کدسخت نه پرامپت):**
- قیمت/موجودی فقط خروجی tool؛ عدد آزاد در پاسخ ⇐ بلاک.
- تخفیف/تعهد/آدرس جدید ⇐ همیشه draft.
- confidence < آستانه یا zero-hit در RAG ⇐ draft + `log_unanswered` (خوراک بهبود).
- زبان پاسخ = فارسی؛ طول پاسخ ≤ ۳ جمله مگر سؤال جزئیات.

**امنیت (جدی بگیر):**
- متن مشتری و **محتوای خزیده‌شده = untrusted input**؛ در پرامپت داخل delimiters جدا، دستورپذیری صفر (تست‌های injection در CI).
- tool-allowlist per-tenant/vertical؛ rate-limit per-conversation؛ kill-switch per-tenant.

---

## ۷) آنبوردینگ عاملی (قلب محصول — packages/crawler + agent)

**A. Crawl:**
- تشخیص WooCommerce (`/wp-json/wc/store/products` عمومی یا نشانه‌های theme) ⇐ مسیر ساخت‌یافته.
- وگرنه: sitemap ⇐ صفحات محصول ⇐ استخراج title/price/images با selector-heuristics + LLM-extraction روی HTML خلاصه‌شده.
- اینستاگرام (بدون API از سرور ناپایدار است): مسیر v1 = «۵ پست آخرت را برای ربات فوروارد کن» ⇐ استخراج از کپشن/عکس. صادقانه و کارا.

**B. Interview:** چک‌لیستِ `required_facts` از preset صنف؛ فقط شکاف‌ها پرسیده می‌شود؛ لحن از ۳ نمونه‌جواب مالک fine-tune پرامپتی می‌شود.

**C. Build:** ساخت tone_profile + ایندکس embeddings + فعال‌سازی toolها طبق preset.

**D. Sandbox:** چت تست با watermark «حالت آزمایشی»؛ دکمه «فعال کن» ⇐ اتصال کانال.

DoD آنبوردینگ: سایت نمونه‌ی مزون ⇐ ربات زنده < ۱۰ دقیقه، بدون دخالت انسانی.

---

## ۸) قالب صنفی (presets/) — schema

```ts
export type VerticalPreset = {
  id: 'mazon' | 'boutique' | ...;
  requiredFacts: FactKey[];          // shipping, hours, rent_terms, deposit...
  tools: ToolName[];                  // check_availability فقط برای اجاره‌دارها
  intents: IntentDef[];               // price_query, rent_query, size_query...
  toneOptions: TonePreset[];          // لوکس-رسمی / صمیمی / جوان
  sampleDialogs: Dialog[];            // few-shot
  campaignTemplates: CampaignTpl[];   // «خبر حراج»، «یادآوری پرو»
  onboardingQuestions: Question[];
}
```
اولین preset: **mazon.ts** — مستقیم از دانش پروژه‌ی مظهری (اجاره+ودیعه+تقویم، پرو، حراج).

---

## ۹) اتصال‌ها (packages/channels)

| کانال | نسخه | مکانیزم بدون‌فنی |
|---|---|---|
| تلگرام | **v1** | ویزارد BotFather تصویری + paste توکن؛ webhook خودکار ست می‌شود |
| ویجت وب | **v1** | یک خط `<script src=.../w.js data-key=...>` |
| وردپرس/ووکامرس | v1 خواندن، v1.5 نوشتن | **pairing code**: پلاگین نصب ⇐ کد ۶رقمی از پنل ما ⇐ paste در پلاگین ⇐ کلیدها امن رد می‌شوند |
| پیامک | v1.5 | OTP از روز اول؛ کمپین پیامکی با کوتا |
| اینستاگرام | v2 | تولید محتوا از v1؛ **انتشار = tap-to-approve** (به‌خاطر ریسک API متا از ایران)؛ API رسمی بعداً |

---

## ۱۰) پنل کاربر — دقیقاً ۴ صفحه (مینیمال)

1. **خانه:** وضعیت ربات (روشن/خاموش)، ۳ عدد بزرگ (گفتگوی امروز، لید جدید، در انتظار تأیید)، دکمه‌ی بزرگ «تست دستیار».
2. **گفتگوها:** لیست + جزئیات؛ فیلتر «نیازمند تأیید».
3. **کاتالوگ:** گرید محصولات + جستجو؛ افزودن = آپلود عکس + یک خط (همان تجربه‌ی تلگرام در وب).
4. **کمپین:** ساخت با جمله‌ی فارسی ⇐ پیش‌نمایش مخاطبان ⇐ ارسال.

«تنظیمات» صفحه ندارد ⇐ دکمه‌ی «با دستیارِ تنظیمات حرف بزن». دیزاین: پس‌زمینه روشن، مونوکروم + accent طلایی‌مسی، Vazirmatn، گوشه‌های نرم، بدون سایه‌بازی؛ RTL کامل؛ موبایل اول.

---

## ۱۱) کیفیت و اعتماد

- **گزارش هفتگی کیفیت (job):** نمونه‌گیری گفتگوها ⇐ LLM-as-judge با روبریک (درستی قیمت، لحن، فرصت فروش ازدست‌رفته) ⇐ خلاصه به تلگرام مالک + ثبت در quality_reports.
- تب «سؤال‌های بی‌جواب» ⇐ تبدیل یک‌کلیکه به FAQ.
- Audit log کامل tool-callها.

---

## ۱۲) لندینگ (یک صفحه)

- H1: «لینک سایتت را بده؛ ۱۰ دقیقه بعد دستیار فروش داری.»
- دموی زنده: بازدیدکننده لینک هر سایتی را می‌دهد ⇐ preview پاسخ‌گویی (با rate-limit و کش).
- ۳ کارت ارزش، یک ویدیوی ۶۰ثانیه‌ای، پرایسینگ، CTA.
- بدون منوی شلوغ. همین.

---

## ۱۳) قیمت‌گذاری (فرضیه‌ی اولیه — قابل تنظیم)

| پلن | ماهانه (تومان) | شامل |
|---|---|---|
| آزمایشی | رایگان ۷ روز | ۵۰ گفتگو، ۱ کانال |
| پایه | ~۲.۵م | تلگرام+ویجت، ۱٬۰۰۰ گفتگو، کاتالوگ ۵۰۰ |
| حرفه‌ای | ~۶م | + کمپین، گزارش هفتگی، ووکامرس‌نویسی، ۵٬۰۰۰ گفتگو |

- مازاد مصرف: بسته‌ی گفتگو/پیامک. سالانه ۲ ماه رایگان. تمدید قابل پرداخت با USDT (ضدتورم).
- مارجین را با usage_events per-tenant رصد کن؛ هدف: هزینه‌ی AI < ۲۵٪ ARPU.

---

## ۱۴) MVP Scope — قیچی صریح

**داخل v1:** آنبوردینگ عاملی کامل (crawl+interview+sandbox)، ربات تلگرام، ویجت وب، کاتالوگ+RAG، draft-approval مالک، لید، پنل ۴صفحه‌ای، OTP، اشتراک زرین‌پال، preset مزون، گزارش هفتگی ساده.
**v1.5:** ووکامرس write-back، کمپین تلگرام/پیامک، تقویم اجاره/نوبت.
**v2:** اینستاگرام tap-to-approve، preset دوم و سوم، جستجوی تصویری، گزارش فروش زبان‌طبیعی.
**فعلاً نه:** اپ موبایل، voice، مارکت‌پلیس قالب، white-label.

---

## ۱۵) نقشه‌ی راه ۱۲ هفته‌ای (ترتیب ساخت در Claude Code)

| هفته | خروجی | DoD |
|---|---|---|
| ۱ | اسکلت monorepo، docker، DB schema، auth OTP | `docker compose up` ⇐ لاگین موبایلی کار می‌کند |
| ۲ | tenants + پنل خالی ۴صفحه‌ای RTL | ساخت tenant و سوئیچ امن |
| ۳ | crawler (Woo + generic) + ایمپورت کاتالوگ | سایت تستی ⇐ ۱۰۰+ محصول با قیمت درست |
| ۴ | RAG (pgvector) + agent core + policy layer | تست‌های policy سبز (قیمت آزاد بلاک می‌شود) |
| ۵ | کانال تلگرام (grammY multi-bot) + ویزارد BotFather | پیام واقعی ⇐ پاسخ درست از کاتالوگ |
| ۶ | draft-approval مالک + leads + سؤال‌های بی‌جواب | فلوی ✅/✏️/❌ end-to-end |
| ۷ | Interview Agent + sandbox + اتصال کامل آنبوردینگ | معیار طلایی: لینک⇐ربات < ۱۰ دقیقه |
| ۸ | ویجت وب + پنل گفتگوها/کاتالوگ کامل | ویجت روی یک سایت خارجی کار می‌کند |
| ۹ | billing زرین‌پال + usage metering + پلن‌ها | پرداخت تست ⇐ فعال‌سازی پلن |
| ۱۰ | گزارش هفتگی کیفیت + audit + kill-switch + تست injection | گزارش نمونه به تلگرام مالک |
| ۱۱ | لندینگ + دموی زنده + آنالیتیکس اکتیویشن | صفحه لایو، فرم دمو کار می‌کند |
| ۱۲ | **پایلوت:** مظهری tenant#1 + دو کسب‌وکار دیگر | ۳ tenant فعال، NPS و باگ‌لیست |

---

## ۱۶) متریک‌ها

- **TTV** (لینک⇐ربات): هدف < ۱۰ دقیقه
- **Activation:** ربات فعال + ≥۱۰ گفتگوی واقعی در هفته‌ی اول
- Deflection rate (پاسخ بدون دخالت مالک) هدف > ۷۰٪
- Retention ماه ۲، مارجین per-tenant، سؤال‌های بی‌جواب/هفته (باید نزولی باشد)

---

## ۱۷) ریسک‌ها ⇐ پاسخ

- **دسترسی/هزینه‌ی LLM:** OpenRouter چندمدله + fallback + کش پاسخ‌های تکراری + مدل ارزان برای intent.
- **Prompt injection از سایت خزیده/مشتری:** delimiters + policy کدسخت + تست‌های CI (تخصص خودم).
- **کیفیت روی صنف‌های متفرقه ⇐ churn:** عمودی ماندن، preset-first.
- **اینستاگرام از ایران:** فقط tap-to-approve تا اطلاع ثانوی؛ وعده‌ی full-auto نده.
- **پرداخت/تحریم زیرساخت:** همه‌چیز self-host روی VPS؛ وابستگی cloud خارجی صفر.

---

## ۱۸) دستور کار Claude Code

**CLAUDE.md (بساز با این مضمون):**
- TypeScript strict؛ هر پکیج تست دارد (vitest)؛ policy layer بدون تست merge نمی‌شود.
- هر migration با drizzle-kit؛ seed = یک tenant مزون با ۳۰ محصول فیک.
- فارسی UI از فایل `shared/i18n-fa.ts`؛ هیچ رشته‌ی هاردکد.
- کلیدها فقط از env؛ `credentials` همیشه رمزنگاری‌شده ذخیره شود.
- قبل از هر فاز: این فایل را بخوان، فقط scope همان هفته را بساز.

**پرامپت شروع (هفته ۱):**
```
docs/master-plan-fa.md را بخوان. فاز هفته‌ی ۱ را بساز:
monorepo با pnpm workspaces طبق ساختار بخش ۴، docker-compose
(postgres+pgvector, redis)، drizzle schema بخش ۵ + migration + seed مزون،
auth با OTP پیامکی (mock provider در dev). DoD: docker compose up و
لاگین موبایلی کار کند. تست‌ها را بنویس.
```

بعد از هر فاز: چک DoD ⇐ کامیت ⇐ فاز بعد.
