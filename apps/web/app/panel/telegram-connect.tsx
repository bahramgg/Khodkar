'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fa, toPersianDigits } from '@khodkar/shared/i18n-fa';

export function TelegramConnect() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/channels/telegram/connect', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: token.trim() }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(fa.connect.invalidToken);
        return;
      }
      router.refresh();
    } catch {
      setError(fa.errors.generic);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-surface-border bg-surface-card p-5">
      <h2 className="mb-3 font-bold">{fa.connect.telegramTitle}</h2>
      <ol className="mb-4 flex list-none flex-col gap-2 text-sm text-ink-muted">
        {fa.connect.steps.map((step, i) => (
          <li key={i} className="flex gap-2">
            <span className="nums shrink-0 font-semibold text-accent-ink">
              {toPersianDigits(i + 1)}.
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <form onSubmit={connect} className="flex flex-col gap-3">
        <input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder={fa.connect.tokenPlaceholder}
          dir="ltr"
          className="rounded-xl border border-surface-border px-4 py-3 text-center outline-none focus:border-accent"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-accent px-4 py-3 font-semibold text-white transition hover:bg-accent-ink disabled:opacity-60"
        >
          {loading ? fa.connect.connecting : fa.connect.connect}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </section>
  );
}
