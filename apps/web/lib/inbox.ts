/** Owner inbox actions: resolve drafts, capture leads, convert unanswered → FAQ. */
import 'server-only';
import {
  getDb,
  getDraftForTenant,
  setDraftStatus,
  addMessage,
  upsertLead,
  getUnanswered,
  insertFact,
  setUnansweredStatus,
  setFactEmbedding,
  recordAudit,
} from '@khodkar/db';
import { findIranMobile } from '@khodkar/shared';
import { decryptTelegramCredentials } from './telegram-creds.js';
import { sendTelegramMessage } from '@khodkar/channels';
import { embedder } from './embeddings.js';

export type DraftAction = 'approve' | 'edit' | 'reject';
export type ResolveResult =
  | { ok: true; sent: boolean }
  | { ok: false; error: 'not_found' | 'already_resolved' | 'empty_text' | 'send_failed' };

/** Delivers approved text to the customer over their channel. Injectable for tests. */
export type Deliver = (params: {
  channelType: string;
  customerRef: string;
  credentials: string | null;
  text: string;
}) => Promise<boolean>;

const telegramDeliver: Deliver = async ({ channelType, customerRef, credentials, text }) => {
  if (channelType !== 'telegram' || !credentials) return false;
  try {
    const creds = decryptTelegramCredentials(credentials);
    return await sendTelegramMessage(creds.token, customerRef, text);
  } catch {
    return false;
  }
};

/** Owner decision on a pending draft: ✅ approve / ✏️ edit / ❌ reject. */
export async function resolveDraft(
  tenantId: string,
  draftId: string,
  action: DraftAction,
  editedText?: string,
  deliver: Deliver = telegramDeliver,
): Promise<ResolveResult> {
  const db = getDb();
  const draft = await getDraftForTenant(db, draftId, tenantId);
  if (!draft) return { ok: false, error: 'not_found' };
  if (draft.status !== 'pending') return { ok: false, error: 'already_resolved' };

  if (action === 'reject') {
    await setDraftStatus(db, draftId, 'rejected');
    await recordAudit(db, { tenantId, convId: draft.convId, actor: 'owner', action: 'draft_reject' });
    return { ok: true, sent: false };
  }

  const text = (action === 'edit' ? editedText ?? '' : draft.proposedText).trim();
  if (!text) return { ok: false, error: 'empty_text' };

  // Deliver to the customer over their channel (if one is attached).
  let sent = false;
  if (draft.channelType) {
    sent = await deliver({
      channelType: draft.channelType,
      customerRef: draft.customerRef,
      credentials: draft.credentials,
      text,
    });
    if (!sent) return { ok: false, error: 'send_failed' };
  }

  await addMessage(db, { convId: draft.convId, role: 'owner', text, meta: { via: action } });
  await setDraftStatus(db, draftId, action === 'edit' ? 'edited' : 'approved');
  await recordAudit(db, {
    tenantId,
    convId: draft.convId,
    actor: 'owner',
    action: `draft_${action}`,
    meta: { sent },
  });
  return { ok: true, sent };
}

/** Capture a lead when a customer shares a mobile number. */
export async function recordLeadFromText(
  tenantId: string,
  text: string,
  source = 'telegram',
): Promise<void> {
  const phone = findIranMobile(text);
  if (!phone) return;
  await upsertLead(getDb(), { tenantId, phone, source });
}

export type ConvertResult = { ok: true } | { ok: false; error: 'not_found' | 'empty_answer' };

/** Convert an unanswered question into a FAQ (fact) and index it (§11). */
export async function convertUnansweredToFaq(
  tenantId: string,
  id: string,
  answer: string,
): Promise<ConvertResult> {
  const db = getDb();
  const u = await getUnanswered(db, id, tenantId);
  if (!u) return { ok: false, error: 'not_found' };
  const a = answer.trim();
  if (!a) return { ok: false, error: 'empty_answer' };

  const factId = await insertFact(db, { tenantId, q: u.question, a });
  const [emb] = await embedder.embed([`${u.question} ${a}`]);
  if (emb) await setFactEmbedding(db, factId, emb);
  await setUnansweredStatus(db, id, 'converted');
  return { ok: true };
}
