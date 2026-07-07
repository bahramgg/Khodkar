/**
 * Customer-facing agent: turns a message into either an auto-reply or an
 * owner-draft, mapping the policy decision to what the customer actually sees.
 *
 * The default {@link CatalogResponder} composes a grounded Persian reply from
 * the top RAG hit (no LLM needed) — a safe v1 baseline. A real LLM responder
 * implements the same {@link Responder} interface and drops in unchanged.
 */
import { fa, formatToman } from '@khodkar/shared';
import { respond, type AgentDeps, type AgentResult, type Responder, type Proposal } from './agent.js';

/** Compose a grounded answer from the retrieved catalog — no model call. */
export class CatalogResponder implements Responder {
  async propose(input: Parameters<Responder['propose']>[0]): Promise<Proposal> {
    const top = input.context[0];
    if (!top) return { text: fa.agent.fallback, confidence: 0.2 };

    if (top.kind === 'product') {
      const price = top.price != null ? ` قیمت: ${formatToman(top.price)}.` : '';
      return { text: `«${top.title}» را داریم.${price}`, confidence: top.score };
    }
    // fact
    return { text: top.text, confidence: top.score };
  }
}

export interface CustomerReply {
  action: AgentResult['action'];
  /** What we send back to the customer right now. */
  toCustomer: string;
  /** The proposed text for owner approval, or null when auto-sent. */
  ownerDraft: string | null;
  reasons: AgentResult['reasons'];
}

/** Map an agent result to a customer reply + optional owner draft. */
export function composeCustomerReply(result: AgentResult): CustomerReply {
  if (result.action === 'send') {
    return { action: 'send', toCustomer: result.text, ownerDraft: null, reasons: result.reasons };
  }
  // draft or block → hold the customer politely (§2 SLA) and route to owner.
  return {
    action: result.action,
    toCustomer: fa.agent.holding,
    ownerDraft: result.text,
    reasons: result.reasons,
  };
}

export interface CustomerAgent {
  respond(text: string): Promise<CustomerReply>;
}

/** Build a CustomerAgent from agent deps (retriever + responder). */
export function makeCustomerAgent(deps: AgentDeps): CustomerAgent {
  return {
    async respond(text: string): Promise<CustomerReply> {
      const result = await respond(deps, text);
      return composeCustomerReply(result);
    },
  };
}
