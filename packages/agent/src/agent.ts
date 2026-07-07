/**
 * Agent response loop (§6): normalize → RAG → propose → **policy** → send /
 * draft / block. The LLM is abstracted behind {@link Responder} so the loop is
 * fully testable without any model call. Grounding numbers (product prices)
 * come from RAG and are the only figures the policy layer will allow.
 */
import { toEnglishDigits } from '@khodkar/shared';
import { checkAnswer, type PolicyAction, type PolicyReason } from './policy.js';
import type { RetrievedDoc, Retriever } from './rag.js';

export interface Proposal {
  text: string;
  /** LLM self-reported confidence in [0,1]. */
  confidence: number;
}

export interface Responder {
  propose(input: {
    message: string;
    context: RetrievedDoc[];
  }): Promise<Proposal>;
}

export interface AgentDeps {
  retriever: Retriever;
  responder: Responder;
  /** Called when a question can't be grounded/answered (feeds improvement). */
  logUnanswered?: (question: string) => void | Promise<void>;
  confidenceThreshold?: number;
  topK?: number;
}

export interface AgentResult {
  action: PolicyAction;
  /** The proposed reply (auto-sent only when action === 'send'). */
  text: string;
  reasons: PolicyReason[];
  ragHitCount: number;
  logged: boolean;
  context: RetrievedDoc[];
}

/** Normalize an incoming customer message (trim, unify digits). */
export function normalizeMessage(message: string): string {
  return toEnglishDigits(message).trim();
}

/** Sourced numbers the answer is allowed to state = prices from RAG hits. */
function allowedNumbersFrom(docs: RetrievedDoc[]): number[] {
  return docs
    .map((d) => d.price)
    .filter((p): p is number => typeof p === 'number' && Number.isFinite(p))
    .map((p) => Math.round(p));
}

export async function respond(deps: AgentDeps, message: string): Promise<AgentResult> {
  const normalized = normalizeMessage(message);
  const k = deps.topK ?? 5;

  const context = await deps.retriever.search(normalized, k);
  const proposal = await deps.responder.propose({ message: normalized, context });

  const decision = checkAnswer({
    answer: proposal.text,
    allowedNumbers: allowedNumbersFrom(context),
    confidence: proposal.confidence,
    ragHitCount: context.length,
    confidenceThreshold: deps.confidenceThreshold,
  });

  let logged = false;
  if (decision.logUnanswered && deps.logUnanswered) {
    await deps.logUnanswered(normalized);
    logged = true;
  }

  return {
    action: decision.action,
    text: proposal.text,
    reasons: decision.reasons,
    ragHitCount: context.length,
    logged,
    context,
  };
}
