'use client';

import { useState } from 'react';
import { fa, toPersianDigits } from '@khodkar/shared/i18n-fa';

export function LiveDemo() {
  const [url, setUrl] = useState('');
  const [crawled, setCrawled] = useState<number | null>(null);
  const [status, setStatus] = useState<'idle' | 'crawling' | 'failed'>('idle');
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    setStatus('crawling');
    setCrawled(null);
    setAnswer(null);
    try {
      const res = await fetch('/api/demo/crawl', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setCrawled(data.products);
        setStatus('idle');
      } else {
        setStatus('failed');
      }
    } catch {
      setStatus('failed');
    }
  }

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setAsking(true);
    setAnswer(null);
    try {
      const res = await fetch('/api/demo/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), question: question.trim() }),
      });
      const data = await res.json();
      setAnswer(data.ok ? data.reply : fa.errors.generic);
    } catch {
      setAnswer(fa.errors.generic);
    } finally {
      setAsking(false);
    }
  }

  return (
    <section className="rounded-2xl border border-surface-border bg-surface-card p-5">
      <h2 className="mb-1 font-bold">{fa.landing.demo.title}</h2>
      <p className="mb-4 text-sm text-ink-muted">{fa.landing.demo.subtitle}</p>

      <form onSubmit={check} className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          dir="ltr"
          placeholder={fa.landing.demo.urlPlaceholder}
          className="flex-1 rounded-xl border border-surface-border px-4 py-2.5 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={status === 'crawling' || !url.trim()}
          className="shrink-0 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {status === 'crawling' ? fa.landing.demo.checking : fa.landing.demo.check}
        </button>
      </form>

      {status === 'failed' && <p className="mt-3 text-sm text-ink-muted">{fa.landing.demo.failed}</p>}

      {crawled !== null && (
        <div className="mt-4">
          <p className="mb-2 text-sm text-green-700">{fa.landing.demo.found(toPersianDigits(crawled))}</p>
          <form onSubmit={ask} className="flex gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={fa.landing.demo.askPlaceholder}
              className="flex-1 rounded-xl border border-surface-border px-4 py-2.5 text-sm outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={asking || !question.trim()}
              className="shrink-0 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {asking ? fa.landing.demo.asking : fa.landing.demo.ask}
            </button>
          </form>
          {answer && (
            <div className="mt-3 rounded-2xl bg-surface px-4 py-3 text-sm">{answer}</div>
          )}
        </div>
      )}
    </section>
  );
}
