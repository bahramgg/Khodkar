/** A ConversationSink bound to one tenant + channel (Telegram, web widget, …). */
import 'server-only';
import { getDb, ensureConversation, addMessage, createDraft } from '@khodkar/db';
import type { MessageRole } from '@khodkar/shared';
import type { ConversationSink } from '@khodkar/channels';

export function makeConversationSink(tenantId: string, channelId: string): ConversationSink {
  return {
    ensureConversation: (customerRef: string) =>
      ensureConversation(getDb(), { tenantId, channelId, customerRef }),
    addMessage: (convId: string, role: MessageRole, text: string, meta?: Record<string, unknown>) =>
      addMessage(getDb(), { convId, role, text, meta }),
    createDraft: (convId: string, proposedText: string, reason?: string) =>
      createDraft(getDb(), { convId, proposedText, reason }),
  };
}
