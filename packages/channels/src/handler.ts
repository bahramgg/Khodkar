/**
 * Channel-agnostic message handler. Persists the exchange and turns a customer
 * message into a reply via the {@link CustomerAgent}. Used by Telegram now, and
 * reusable for the web widget / SMS later.
 */
import type { MessageRole } from '@khodkar/shared';
import type { CustomerAgent, CustomerReply } from '@khodkar/agent';

/** Where a conversation's messages/drafts are persisted (Drizzle-backed in app). */
export interface ConversationSink {
  ensureConversation(customerRef: string): Promise<string>;
  addMessage(
    convId: string,
    role: MessageRole,
    text: string,
    meta?: Record<string, unknown>,
  ): Promise<void>;
  createDraft(convId: string, proposedText: string, reason?: string): Promise<void>;
}

export interface HandleResult {
  reply: string;
  action: CustomerReply['action'];
  convId: string;
}

/**
 * Persist the inbound message, run the agent, persist the outcome, and return
 * the reply to send back. Auto-sends only when policy said `send`; otherwise a
 * pending draft is queued for the owner and the customer gets a holding note.
 */
export async function handleCustomerText(
  deps: { sink: ConversationSink; agent: CustomerAgent },
  params: { customerRef: string; text: string },
): Promise<HandleResult> {
  const convId = await deps.sink.ensureConversation(params.customerRef);
  await deps.sink.addMessage(convId, 'customer', params.text);

  const r = await deps.agent.respond(params.text);

  if (r.action === 'send') {
    await deps.sink.addMessage(convId, 'agent', r.toCustomer, { action: 'send' });
  } else {
    const reason = r.reasons.map((x) => x.code).join(',');
    await deps.sink.createDraft(convId, r.ownerDraft ?? r.toCustomer, reason);
    await deps.sink.addMessage(convId, 'agent', r.toCustomer, { action: r.action, pending: true });
  }

  return { reply: r.toCustomer, action: r.action, convId };
}
