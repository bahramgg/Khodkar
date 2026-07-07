/** Cross-package domain enums. Kept in sync with the drizzle schema in @khodkar/db. */

export const VERTICALS = ['mazon', 'boutique', 'jewelry', 'salon', 'restaurant'] as const;
export type Vertical = (typeof VERTICALS)[number];

export const PLANS = ['trial', 'basic', 'pro'] as const;
export type Plan = (typeof PLANS)[number];

export const TENANT_STATUS = ['onboarding', 'active', 'paused', 'disabled'] as const;
export type TenantStatus = (typeof TENANT_STATUS)[number];

export const USER_ROLES = ['owner', 'staff'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const CHANNEL_TYPES = ['telegram', 'web', 'sms', 'instagram'] as const;
export type ChannelType = (typeof CHANNEL_TYPES)[number];

export const CHANNEL_STATUS = ['pending', 'active', 'disabled'] as const;
export type ChannelStatus = (typeof CHANNEL_STATUS)[number];

export const MESSAGE_ROLES = ['customer', 'agent', 'owner'] as const;
export type MessageRole = (typeof MESSAGE_ROLES)[number];

export const DRAFT_STATUS = ['pending', 'approved', 'edited', 'rejected'] as const;
export type DraftStatus = (typeof DRAFT_STATUS)[number];

export const USAGE_KINDS = ['llm_tokens', 'sms', 'msg'] as const;
export type UsageKind = (typeof USAGE_KINDS)[number];

export interface ToneProfile {
  style: 'luxury' | 'friendly' | 'young';
  samples: string[];
}
