'use client';

import { useState } from 'react';
import { fa, toPersianDigits } from '@khodkar/shared/i18n-fa';

export function PilotFeedback() {
  const [npsDone, setNpsDone] = useState(false);
  const [kind, setKind] = useState<'bug' | 'idea'>('bug');
  const [text, setText] = useState('');
  const [fbDone, setFbDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submitNps(score: number) {
    setBusy(true);
    try {
      const res = await fetch('/api/nps', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ score }),
      });
      if (res.ok) setNpsDone(true);
    } finally {
      setBusy(false);
    }
  }

  async function submitFeedback(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind, text: text.trim() }),
      });
      if (res.ok) {
        setFbDone(true);
        setText('');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-surface-border bg-surface-card p-4">
      {/* NPS */}
      <div>
        <p className="text-sm font-medium">{fa.pilot.npsTitle}</p>
        <p className="mb-2 text-xs text-ink-muted">{fa.pilot.npsHint}</p>
        {npsDone ? (
          <p className="text-sm text-green-700">{fa.pilot.npsThanks}</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: 11 }, (_, n) => (
              <button
                key={n}
                onClick={() => submitNps(n)}
                disabled={busy}
                className="nums h-8 w-8 rounded-lg border border-surface-border text-xs hover:border-accent disabled:opacity-60"
              >
                {toPersianDigits(n)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bug / idea */}
      <form onSubmit={submitFeedback} className="flex flex-col gap-2 border-t border-surface-border pt-3">
        <p className="text-sm font-medium">{fa.pilot.feedbackTitle}</p>
        <div className="flex gap-2">
          {(['bug', 'idea'] as const).map((k) => (
            <button
              type="button"
              key={k}
              onClick={() => setKind(k)}
              className={`rounded-lg border px-3 py-1 text-xs ${
                kind === k ? 'border-accent bg-accent/10 text-accent-ink' : 'border-surface-border'
              }`}
            >
              {k === 'bug' ? fa.pilot.bug : fa.pilot.idea}
            </button>
          ))}
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder={fa.pilot.feedbackPlaceholder}
          className="rounded-xl border border-surface-border p-3 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={busy || text.trim().length < 3}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {fbDone ? fa.pilot.sent : fa.pilot.send}
        </button>
      </form>
    </section>
  );
}
