'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fa } from '@khodkar/shared/i18n-fa';

export function DraftCard({
  draftId,
  question,
  proposedText,
}: {
  draftId: string;
  question: string;
  proposedText: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(proposedText);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  async function resolve(action: 'approve' | 'edit' | 'reject') {
    setBusy(true);
    try {
      const res = await fetch(`/api/drafts/${draftId}/resolve`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, text: action === 'edit' ? text : undefined }),
      });
      if (res.ok) {
        setDone(action === 'reject' ? '❌' : fa.panel.conversations.sent);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-surface-border bg-surface-card px-4 py-3 text-sm text-ink-muted">
        {done}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-surface-border bg-surface-card p-4">
      {question && (
        <p className="mb-2 text-sm">
          <span className="text-ink-muted">{fa.panel.conversations.customerAsked}: </span>
          {question}
        </p>
      )}
      <p className="mb-1 text-xs text-ink-muted">{fa.panel.conversations.proposedReply}:</p>
      {editing ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className="mb-3 w-full rounded-xl border border-surface-border p-3 text-sm outline-none focus:border-accent"
        />
      ) : (
        <p className="mb-3 rounded-xl bg-surface px-3 py-2 text-sm">{proposedText}</p>
      )}

      <div className="flex gap-2">
        {editing ? (
          <button
            onClick={() => resolve('edit')}
            disabled={busy || !text.trim()}
            className="flex-1 rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            ✏️ {fa.panel.conversations.editSend}
          </button>
        ) : (
          <>
            <button
              onClick={() => resolve('approve')}
              disabled={busy}
              className="flex-1 rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              ✅ {fa.panel.conversations.approve}
            </button>
            <button
              onClick={() => setEditing(true)}
              disabled={busy}
              className="rounded-xl border border-surface-border px-3 py-2 text-sm"
            >
              ✏️ {fa.common.edit}
            </button>
            <button
              onClick={() => resolve('reject')}
              disabled={busy}
              className="rounded-xl border border-surface-border px-3 py-2 text-sm text-red-600"
            >
              ❌ {fa.common.reject}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
