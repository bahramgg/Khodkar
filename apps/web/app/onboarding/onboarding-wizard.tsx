'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fa, toPersianDigits } from '@khodkar/shared/i18n-fa';

interface Question {
  factKey: string;
  prompt: string;
}
type Tone = 'luxury' | 'friendly' | 'young';
const STEPS = [fa.onboarding.steps.catalog, fa.onboarding.steps.interview, fa.onboarding.steps.test, fa.onboarding.steps.go];

export function OnboardingWizard({ questions }: { questions: Question[] }) {
  const router = useRouter();
  const [step, setStep] = useState(0);

  return (
    <div className="flex flex-col gap-6">
      <ol className="flex items-center justify-between text-xs">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={`flex items-center gap-1 ${i <= step ? 'text-accent-ink' : 'text-ink-muted'}`}
          >
            <span
              className={`nums flex h-6 w-6 items-center justify-center rounded-full border ${
                i <= step ? 'border-accent bg-accent/15 font-bold' : 'border-surface-border'
              }`}
            >
              {toPersianDigits(i + 1)}
            </span>
            {label}
          </li>
        ))}
      </ol>

      {step === 0 && <CrawlStep onNext={() => setStep(1)} />}
      {step === 1 && <InterviewStep questions={questions} onNext={() => setStep(2)} />}
      {step === 2 && <SandboxStep onNext={() => setStep(3)} />}
      {step === 3 && <FinishStep onDone={() => router.push('/panel')} />}
    </div>
  );
}

function CrawlStep({ onNext }: { onNext: () => void }) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  async function crawl(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFailed(false);
    setResult(null);
    try {
      const res = await fetch('/api/onboarding/crawl', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (data.ok) setResult(fa.onboarding.crawl.found(toPersianDigits(data.products)));
      else setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold">{fa.onboarding.crawl.title}</h2>
        <p className="text-sm text-ink-muted">{fa.onboarding.crawl.subtitle}</p>
      </div>
      <form onSubmit={crawl} className="flex flex-col gap-3">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          dir="ltr"
          placeholder={fa.onboarding.crawl.placeholder}
          className="rounded-xl border border-surface-border px-4 py-3 outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={busy || !url.trim()}
          className="rounded-xl bg-accent px-4 py-3 font-semibold text-white disabled:opacity-60"
        >
          {busy ? fa.onboarding.crawl.crawling : fa.onboarding.crawl.start}
        </button>
      </form>
      {result && <p className="text-sm text-green-700">{result}</p>}
      {failed && <p className="text-sm text-ink-muted">{fa.onboarding.crawl.failed}</p>}
      <button onClick={onNext} className="text-sm text-accent-ink underline">
        {result ? fa.onboarding.crawl.next : fa.onboarding.crawl.skip}
      </button>
    </section>
  );
}

function InterviewStep({ questions, onNext }: { questions: Question[]; onNext: () => void }) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [tone, setTone] = useState<Tone>('friendly');
  const [sample, setSample] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await fetch('/api/onboarding/interview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          answers: questions.map((q, i) => ({ question: q.prompt, answer: answers[i] ?? '' })),
          toneStyle: tone,
          toneSamples: sample.trim() ? [sample.trim()] : [],
        }),
      });
      onNext();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold">{fa.onboarding.interview.title}</h2>
        <p className="text-sm text-ink-muted">{fa.onboarding.interview.subtitle}</p>
      </div>
      {questions.map((q, i) => (
        <div key={q.factKey} className="flex flex-col gap-1">
          <label className="text-sm font-medium">{q.prompt}</label>
          <input
            value={answers[i] ?? ''}
            onChange={(e) => setAnswers((a) => ({ ...a, [i]: e.target.value }))}
            className="rounded-xl border border-surface-border px-4 py-2.5 text-sm outline-none focus:border-accent"
          />
        </div>
      ))}

      <div>
        <p className="mb-2 text-sm font-medium">{fa.onboarding.interview.toneTitle}</p>
        <div className="grid grid-cols-3 gap-2">
          {(['luxury', 'friendly', 'young'] as Tone[]).map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setTone(t)}
              className={`rounded-xl border px-2 py-2 text-sm ${
                tone === t ? 'border-accent bg-accent/10 font-semibold text-accent-ink' : 'border-surface-border'
              }`}
            >
              {fa.onboarding.interview.tones[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">{fa.onboarding.interview.sampleLabel}</label>
        <textarea
          value={sample}
          onChange={(e) => setSample(e.target.value)}
          rows={2}
          placeholder={fa.onboarding.interview.samplePlaceholder}
          className="rounded-xl border border-surface-border p-3 text-sm outline-none focus:border-accent"
        />
      </div>

      <button
        type="submit"
        disabled={busy}
        className="rounded-xl bg-accent px-4 py-3 font-semibold text-white disabled:opacity-60"
      >
        {busy ? fa.onboarding.interview.saving : fa.onboarding.interview.next}
      </button>
    </form>
  );
}

function SandboxStep({ onNext }: { onNext: () => void }) {
  const [msgs, setMsgs] = useState<{ role: 'user' | 'bot'; text: string; note?: boolean }[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setText('');
    setMsgs((m) => [...m, { role: 'user', text: t }]);
    setBusy(true);
    try {
      const res = await fetch('/api/sandbox/message', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: t }),
      });
      const data = await res.json();
      if (data.ok) {
        const pending = data.action !== 'send';
        setMsgs((m) => [...m, { role: 'bot', text: pending ? data.proposedText : data.reply, note: pending }]);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold">
          {fa.onboarding.sandbox.title}
          <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent-ink">
            {fa.onboarding.sandbox.testMode}
          </span>
        </h2>
        <p className="text-sm text-ink-muted">{fa.onboarding.sandbox.subtitle}</p>
      </div>

      <div className="flex min-h-[10rem] flex-col gap-2 rounded-2xl border border-surface-border bg-surface-card p-3">
        {msgs.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-start' : 'text-start'}>
            <span
              className={`inline-block max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                m.role === 'user' ? 'bg-accent text-white' : 'bg-surface'
              }`}
            >
              {m.text}
              {m.note && (
                <span className="mt-1 block text-[11px] opacity-70">
                  {fa.onboarding.sandbox.pendingNote}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>

      <form onSubmit={send} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={fa.onboarding.sandbox.placeholder}
          className="flex-1 rounded-xl border border-surface-border px-4 py-2.5 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {fa.common.send}
        </button>
      </form>

      <button onClick={onNext} className="text-sm text-accent-ink underline">
        {fa.onboarding.sandbox.next}
      </button>
    </section>
  );
}

function FinishStep({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  async function activate() {
    setBusy(true);
    try {
      const res = await fetch('/api/onboarding/activate', { method: 'POST' });
      if (res.ok) onDone();
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="flex flex-col items-center gap-4 py-6 text-center">
      <h2 className="text-xl font-bold">{fa.onboarding.finish.title}</h2>
      <p className="text-sm text-ink-muted">{fa.onboarding.finish.subtitle}</p>
      <button
        onClick={activate}
        disabled={busy}
        className="w-full rounded-2xl bg-accent px-4 py-4 text-lg font-semibold text-white disabled:opacity-60"
      >
        {busy ? fa.onboarding.finish.activating : fa.onboarding.finish.activate}
      </button>
    </section>
  );
}
