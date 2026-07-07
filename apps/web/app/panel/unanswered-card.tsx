'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fa } from '@khodkar/shared/i18n-fa';

export function UnansweredCard({ id, question }: { id: string; question: string }) {
  const router = useRouter();
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function convert() {
    setBusy(true);
    try {
      const res = await fetch(`/api/unanswered/${id}/convert`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ answer: answer.trim() }),
      });
      if (res.ok) {
        setDone(true);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-surface-border bg-surface-card px-4 py-3 text-sm text-ink-muted">
        {fa.panel.unanswered.converted}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-surface-border bg-surface-card p-4">
      <p className="mb-3 text-sm font-medium">{question}</p>
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={2}
        placeholder={fa.panel.unanswered.answerPlaceholder}
        className="mb-3 w-full rounded-xl border border-surface-border p-3 text-sm outline-none focus:border-accent"
      />
      <button
        onClick={convert}
        disabled={busy || !answer.trim()}
        className="w-full rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {fa.panel.unanswered.convert}
      </button>
    </div>
  );
}
