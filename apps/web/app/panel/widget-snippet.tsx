'use client';

import { useState } from 'react';
import { fa } from '@khodkar/shared/i18n-fa';

export function WidgetSnippet({ snippet }: { snippet: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be unavailable */
    }
  }
  return (
    <section className="rounded-2xl border border-surface-border bg-surface-card p-4">
      <h2 className="mb-1 font-bold">{fa.panel.widget.title}</h2>
      <p className="mb-3 text-sm text-ink-muted">{fa.panel.widget.subtitle}</p>
      <div className="flex items-center gap-2">
        <code
          dir="ltr"
          className="flex-1 overflow-x-auto rounded-xl bg-surface px-3 py-2 text-xs text-ink"
        >
          {snippet}
        </code>
        <button
          onClick={copy}
          className="shrink-0 rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-white"
        >
          {copied ? fa.panel.widget.copied : fa.panel.widget.copy}
        </button>
      </div>
    </section>
  );
}
