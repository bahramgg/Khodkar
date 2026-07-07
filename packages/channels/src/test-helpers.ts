/** Test-only in-memory {@link ConversationSink}. */
import type { MessageRole } from '@khodkar/shared';
import type { ConversationSink } from './handler.js';

export class InMemoryConversationSink implements ConversationSink {
  messages: { convId: string; role: MessageRole; text: string; meta?: Record<string, unknown> }[] = [];
  drafts: { convId: string; text: string; reason?: string }[] = [];
  private conv = new Map<string, string>();
  private seq = 0;

  async ensureConversation(customerRef: string): Promise<string> {
    if (!this.conv.has(customerRef)) this.conv.set(customerRef, `conv_${++this.seq}`);
    return this.conv.get(customerRef)!;
  }
  async addMessage(
    convId: string,
    role: MessageRole,
    text: string,
    meta?: Record<string, unknown>,
  ): Promise<void> {
    this.messages.push({ convId, role, text, meta });
  }
  async createDraft(convId: string, text: string, reason?: string): Promise<void> {
    this.drafts.push({ convId, text, reason });
  }
}
