/**
 * Policy layer — the "iron rules" from master-plan §6, enforced in **code**
 * (never trusted to the prompt). Given a proposed answer and its grounding,
 * it decides whether the answer may be auto-sent, must go to the owner as a
 * draft, or must be blocked outright.
 *
 * The headline rule (and the week-4 DoD): a price/number that did not come
 * from a tool result is blocked — the agent never invents prices.
 */
import { toEnglishDigits } from '@khodkar/shared';

export type PolicyAction = 'send' | 'draft' | 'block';

export type PolicyReasonCode =
  | 'unsourced_number'
  | 'discount_or_commitment'
  | 'sensitive_topic'
  | 'low_confidence'
  | 'no_rag_hits'
  | 'not_persian'
  | 'too_long';

export interface PolicyReason {
  code: PolicyReasonCode;
  detail?: string;
}

export interface PolicyInput {
  answer: string;
  /** Numbers (Toman) that came from tool/RAG output — the only allowed figures. */
  allowedNumbers: number[];
  /** LLM self-reported confidence, 0..1. */
  confidence: number;
  /** How many docs RAG retrieved (0 = nothing to ground on). */
  ragHitCount: number;
  confidenceThreshold?: number;
}

export interface PolicyDecision {
  action: PolicyAction;
  reasons: PolicyReason[];
  /** True when the unanswered question should be logged for improvement. */
  logUnanswered: boolean;
}

const SEVERITY: Record<PolicyAction, number> = { send: 0, draft: 1, block: 2 };
const DEFAULT_CONFIDENCE_THRESHOLD = 0.5;
const MAX_SENTENCES = 3;

/** Amounts below this (with no currency/unit/separator) are treated as non-price. */
const BARE_PRICE_MIN = 10_000;

// Topics that must always go to the owner rather than auto-send.
const DISCOUNT_COMMITMENT = [
  'تخفیف',
  'رایگان',
  'قول',
  'تضمین',
  'حتماً',
  'حتما',
  'قطعا',
  'قطعاً',
  'گارانتی',
];
const SENSITIVE = ['شکایت', 'برگشت وجه', 'عودت وجه', 'خسارت', 'شکسته', 'خراب'];

const UNIT_MULTIPLIER: Record<string, number> = {
  هزار: 1_000,
  میلیون: 1_000_000,
  میلیارد: 1_000_000_000,
};

const NUMBER_RE = /(\d[\d.,٬،]*)\s*(هزار|میلیون|میلیارد)?\s*(تومان|تومن|ریال)?/g;

/**
 * Extract price-like amounts (normalized to Toman) from free text. Ignores
 * incidental small numbers (sizes like ۳۸, "۳ روز", years like ۱۴۰۳) unless
 * they carry a currency word, a scale unit, or thousands separators.
 */
export function extractPriceLikeNumbers(text: string): number[] {
  const s = toEnglishDigits(text);
  const out: number[] = [];
  for (const m of s.matchAll(NUMBER_RE)) {
    const numRaw = m[1] ?? '';
    const unit = m[2];
    const currency = m[3];
    const hasThousands = /[,٬،]/.test(numRaw);

    const base = Number(numRaw.replace(/[,٬،\s]/g, ''));
    if (!Number.isFinite(base)) continue;

    const scaled = unit ? base * (UNIT_MULTIPLIER[unit] ?? 1) : base;
    const value = currency === 'ریال' ? scaled / 10 : scaled; // rial → toman

    const priceLike = !!unit || !!currency || hasThousands || scaled >= BARE_PRICE_MIN;
    if (priceLike) out.push(Math.round(value));
  }
  return [...new Set(out)];
}

function containsAny(haystack: string, needles: string[]): string | null {
  for (const n of needles) if (haystack.includes(n)) return n;
  return null;
}

/** True if the text contains at least one Persian/Arabic letter. */
function hasPersian(text: string): boolean {
  return /[؀-ۿ]/.test(text);
}

function countSentences(text: string): number {
  return text.split(/[.!?؟\n]+/).filter((s) => s.trim().length > 0).length;
}

/** Run all policy checks and combine into a single decision. */
export function checkAnswer(input: PolicyInput): PolicyDecision {
  const reasons: PolicyReason[] = [];
  const threshold = input.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD;
  let action: PolicyAction = 'send';
  const escalate = (a: PolicyAction) => {
    if (SEVERITY[a] > SEVERITY[action]) action = a;
  };

  // 1) Unsourced numbers → block. Any price-like figure not backed by a tool.
  const answerNumbers = extractPriceLikeNumbers(input.answer);
  const allowed = new Set(input.allowedNumbers.map((n) => Math.round(n)));
  const unsourced = answerNumbers.filter((n) => !allowed.has(n));
  if (unsourced.length > 0) {
    reasons.push({ code: 'unsourced_number', detail: unsourced.join(', ') });
    escalate('block');
  }

  // 2) Discount / commitment → draft for owner.
  const dc = containsAny(input.answer, DISCOUNT_COMMITMENT);
  if (dc) {
    reasons.push({ code: 'discount_or_commitment', detail: dc });
    escalate('draft');
  }

  // 3) Sensitive topics → draft.
  const sensitive = containsAny(input.answer, SENSITIVE);
  if (sensitive) {
    reasons.push({ code: 'sensitive_topic', detail: sensitive });
    escalate('draft');
  }

  // 4) No RAG grounding → draft + log.
  if (input.ragHitCount <= 0) {
    reasons.push({ code: 'no_rag_hits' });
    escalate('draft');
  }

  // 5) Low confidence → draft + log.
  if (input.confidence < threshold) {
    reasons.push({ code: 'low_confidence', detail: String(input.confidence) });
    escalate('draft');
  }

  // 6) Non-Persian answer → draft (never auto-send a wrong-language reply).
  if (input.answer.trim().length > 0 && !hasPersian(input.answer)) {
    reasons.push({ code: 'not_persian' });
    escalate('draft');
  }

  // 7) Over-long answer → advisory only (does not change the action).
  if (countSentences(input.answer) > MAX_SENTENCES) {
    reasons.push({ code: 'too_long' });
  }

  const logUnanswered =
    reasons.some((r) => r.code === 'no_rag_hits' || r.code === 'low_confidence');

  return { action, reasons, logUnanswered };
}
