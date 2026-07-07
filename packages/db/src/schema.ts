/**
 * Drizzle schema — the key tables from master-plan section 5.
 *
 * Conventions:
 *  - uuid primary keys (`gen_random_uuid()`).
 *  - every tenant-owned table carries `tenant_id` and is scoped in the repo layer.
 *  - encrypted secrets (channel credentials) live in `text` columns holding the
 *    AES-GCM token from @khodkar/shared/crypto — never plaintext.
 *  - `embedding` uses pgvector (1536 dims = OpenAI/text-embedding-3-small).
 */
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  bigint,
  timestamp,
  jsonb,
  vector,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ─── Enums ────────────────────────────────────────────────────────────────────
export const verticalEnum = pgEnum('vertical', [
  'mazon',
  'boutique',
  'jewelry',
  'salon',
  'restaurant',
]);
export const planEnum = pgEnum('plan', ['trial', 'basic', 'pro']);
export const tenantStatusEnum = pgEnum('tenant_status', [
  'onboarding',
  'active',
  'paused',
  'disabled',
]);
export const userRoleEnum = pgEnum('user_role', ['owner', 'staff']);
export const channelTypeEnum = pgEnum('channel_type', ['telegram', 'web', 'sms', 'instagram']);
export const channelStatusEnum = pgEnum('channel_status', ['pending', 'active', 'disabled']);
export const messageRoleEnum = pgEnum('message_role', ['customer', 'agent', 'owner']);
export const draftStatusEnum = pgEnum('draft_status', [
  'pending',
  'approved',
  'edited',
  'rejected',
]);
export const conversationStatusEnum = pgEnum('conversation_status', ['open', 'closed', 'escalated']);
export const bookingTypeEnum = pgEnum('booking_type', ['sale', 'rent', 'slot']);
export const usageKindEnum = pgEnum('usage_kind', ['llm_tokens', 'sms', 'msg']);

const now = () => timestamp('created_at', { withTimezone: true }).defaultNow().notNull();
const updated = () =>
  timestamp('updated_at', { withTimezone: true }).defaultNow().notNull();

// ─── tenants ──────────────────────────────────────────────────────────────────
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  vertical: verticalEnum('vertical').notNull(),
  plan: planEnum('plan').notNull().default('trial'),
  status: tenantStatusEnum('status').notNull().default('onboarding'),
  toneProfile: jsonb('tone_profile'),
  settings: jsonb('settings').notNull().default({}),
  createdAt: now(),
  updatedAt: updated(),
});

// ─── users ────────────────────────────────────────────────────────────────────
// `tenantId` is nullable: a user logs in by phone (OTP) before their tenant
// exists during onboarding, then gets linked.
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
    phone: text('phone').notNull(),
    role: userRoleEnum('role').notNull().default('owner'),
    tgChatId: bigint('tg_chat_id', { mode: 'number' }),
    createdAt: now(),
    updatedAt: updated(),
  },
  (t) => [uniqueIndex('users_phone_uq').on(t.phone)],
);

// ─── otp_codes (auth) ─────────────────────────────────────────────────────────
// Stores only the HMAC hash of the code (see @khodkar/shared/auth/otp).
export const otpCodes = pgTable(
  'otp_codes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    phone: text('phone').notNull(),
    hash: text('hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    attempts: integer('attempts').notNull().default(0),
    createdAt: now(),
  },
  (t) => [index('otp_codes_phone_idx').on(t.phone, t.createdAt)],
);

// ─── channels ─────────────────────────────────────────────────────────────────
export const channels = pgTable(
  'channels',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    type: channelTypeEnum('type').notNull(),
    // AES-GCM token (encrypted); never plaintext.
    credentials: text('credentials'),
    status: channelStatusEnum('status').notNull().default('pending'),
    createdAt: now(),
    updatedAt: updated(),
  },
  (t) => [index('channels_tenant_idx').on(t.tenantId)],
);

// ─── products ─────────────────────────────────────────────────────────────────
export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    sku: text('sku'),
    title: text('title').notNull(),
    // amounts in Toman (integer); rent/deposit optional for rental verticals.
    price: bigint('price', { mode: 'number' }),
    rentPrice: bigint('rent_price', { mode: 'number' }),
    deposit: bigint('deposit', { mode: 'number' }),
    stock: integer('stock').notNull().default(0),
    images: jsonb('images').notNull().default([]),
    attrs: jsonb('attrs').notNull().default({}),
    embedding: vector('embedding', { dimensions: 1536 }),
    createdAt: now(),
    updatedAt: updated(),
  },
  (t) => [
    index('products_tenant_idx').on(t.tenantId),
    uniqueIndex('products_tenant_sku_uq').on(t.tenantId, t.sku),
  ],
);

// ─── facts / faqs ─────────────────────────────────────────────────────────────
export const facts = pgTable(
  'facts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    q: text('q').notNull(),
    a: text('a').notNull(),
    embedding: vector('embedding', { dimensions: 1536 }),
    createdAt: now(),
    updatedAt: updated(),
  },
  (t) => [index('facts_tenant_idx').on(t.tenantId)],
);

// ─── conversations ────────────────────────────────────────────────────────────
export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    channelId: uuid('channel_id').references(() => channels.id, { onDelete: 'set null' }),
    customerRef: text('customer_ref').notNull(),
    status: conversationStatusEnum('status').notNull().default('open'),
    createdAt: now(),
    updatedAt: updated(),
  },
  (t) => [index('conversations_tenant_idx').on(t.tenantId)],
);

// ─── messages ─────────────────────────────────────────────────────────────────
export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    convId: uuid('conv_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    role: messageRoleEnum('role').notNull(),
    text: text('text').notNull(),
    meta: jsonb('meta').notNull().default({}),
    createdAt: now(),
  },
  (t) => [index('messages_conv_idx').on(t.convId, t.createdAt)],
);

// ─── drafts (owner approval queue) ────────────────────────────────────────────
export const drafts = pgTable(
  'drafts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    convId: uuid('conv_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    proposedText: text('proposed_text').notNull(),
    reason: text('reason'),
    status: draftStatusEnum('status').notNull().default('pending'),
    createdAt: now(),
    updatedAt: updated(),
  },
  (t) => [index('drafts_status_idx').on(t.status)],
);

// ─── leads ────────────────────────────────────────────────────────────────────
export const leads = pgTable(
  'leads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    phone: text('phone'),
    name: text('name'),
    eventDate: timestamp('event_date', { withTimezone: true }),
    interest: jsonb('interest').notNull().default([]),
    source: text('source'),
    createdAt: now(),
  },
  (t) => [index('leads_tenant_idx').on(t.tenantId)],
);

// ─── campaigns ────────────────────────────────────────────────────────────────
export const campaigns = pgTable(
  'campaigns',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    audienceFilter: jsonb('audience_filter').notNull().default({}),
    template: text('template').notNull(),
    status: text('status').notNull().default('draft'),
    stats: jsonb('stats').notNull().default({}),
    createdAt: now(),
    updatedAt: updated(),
  },
  (t) => [index('campaigns_tenant_idx').on(t.tenantId)],
);

// ─── orders_or_bookings ───────────────────────────────────────────────────────
export const ordersOrBookings = pgTable(
  'orders_or_bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    type: bookingTypeEnum('type').notNull(),
    productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
    dateStart: timestamp('date_start', { withTimezone: true }),
    dateEnd: timestamp('date_end', { withTimezone: true }),
    status: text('status').notNull().default('pending'),
    createdAt: now(),
    updatedAt: updated(),
  },
  (t) => [index('orders_tenant_idx').on(t.tenantId)],
);

// ─── usage_events (billing / margin) ──────────────────────────────────────────
export const usageEvents = pgTable(
  'usage_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    kind: usageKindEnum('kind').notNull(),
    qty: bigint('qty', { mode: 'number' }).notNull(),
    // cost in Toman (integer); nullable until priced.
    cost: bigint('cost', { mode: 'number' }),
    createdAt: now(),
  },
  (t) => [index('usage_tenant_kind_idx').on(t.tenantId, t.kind, t.createdAt)],
);

// ─── subscriptions ────────────────────────────────────────────────────────────
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    plan: planEnum('plan').notNull(),
    period: text('period').notNull().default('monthly'),
    paidUntil: timestamp('paid_until', { withTimezone: true }),
    gatewayRef: text('gateway_ref'),
    createdAt: now(),
    updatedAt: updated(),
  },
  (t) => [index('subscriptions_tenant_idx').on(t.tenantId)],
);

// ─── quality_reports ──────────────────────────────────────────────────────────
export const qualityReports = pgTable(
  'quality_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    week: text('week').notNull(),
    score: integer('score'),
    issues: jsonb('issues').notNull().default([]),
    missedSales: jsonb('missed_sales').notNull().default([]),
    createdAt: now(),
  },
  (t) => [uniqueIndex('quality_tenant_week_uq').on(t.tenantId, t.week)],
);

export const schema = {
  tenants,
  users,
  otpCodes,
  channels,
  products,
  facts,
  conversations,
  messages,
  drafts,
  leads,
  campaigns,
  ordersOrBookings,
  usageEvents,
  subscriptions,
  qualityReports,
};
