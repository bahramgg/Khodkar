/**
 * Vertical preset schema (master-plan §8). A preset is the per-vertical
 * knowledge bundle that drives onboarding questions, enabled tools, tone
 * options and campaign templates.
 */
import type { Vertical } from '@khodkar/shared';

export type FactKey =
  | 'shipping'
  | 'hours'
  | 'rent_terms'
  | 'deposit'
  | 'fitting'
  | 'address'
  | 'return_policy';

export type ToolName =
  | 'search_products'
  | 'get_product'
  | 'check_availability'
  | 'get_fact'
  | 'create_lead'
  | 'register_interest'
  | 'book_slot'
  | 'escalate_to_owner'
  | 'log_unanswered';

export interface IntentDef {
  id: string;
  examples: string[];
}

export interface TonePreset {
  id: 'luxury' | 'friendly' | 'young';
  label: string;
  system: string;
}

export interface Dialog {
  customer: string;
  agent: string;
}

export interface CampaignTpl {
  id: string;
  label: string;
  template: string;
}

export interface Question {
  factKey: FactKey;
  prompt: string;
}

export interface VerticalPreset {
  id: Vertical;
  requiredFacts: FactKey[];
  tools: ToolName[];
  intents: IntentDef[];
  toneOptions: TonePreset[];
  sampleDialogs: Dialog[];
  campaignTemplates: CampaignTpl[];
  onboardingQuestions: Question[];
}
