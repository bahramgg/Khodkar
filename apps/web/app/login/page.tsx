'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
// Client component: import only the crypto-free i18n subpath (the barrel pulls
// node:crypto, which can't be bundled for the browser).
import { fa, toPersianDigits } from '@khodkar/shared/i18n-fa';

type Step = 'phone' | 'code';

const ERR: Record<string, string> = {
  invalid_phone: fa.auth.invalidPhone,
  mismatch: fa.auth.invalidCode,
  no_code: fa.auth.invalidCode,
  expired: fa.auth.expiredCode,
  consumed: fa.auth.expiredCode,
  too_many_attempts: fa.auth.tooManyAttempts,
  rate_limited: fa.auth.tooManyRequests,
};

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submitPhone(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(ERR[data.error] ?? fa.errors.generic);
        return;
      }
      setStep('code');
    } catch {
      setError(fa.errors.generic);
    } finally {
      setLoading(false);
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(ERR[data.error] ?? fa.errors.generic);
        return;
      }
      router.push(data.redirectTo ?? '/panel');
    } catch {
      setError(fa.errors.generic);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <div className="rounded-2xl border border-surface-border bg-surface-card p-6">
        <h1 className="mb-1 text-xl font-bold">{fa.auth.loginTitle}</h1>
        <p className="mb-6 text-sm text-ink-muted">{fa.brand}</p>

        {step === 'phone' ? (
          <form onSubmit={submitPhone} className="flex flex-col gap-4">
            <label className="text-sm font-medium" htmlFor="phone">
              {fa.auth.phoneLabel}
            </label>
            <input
              id="phone"
              name="phone"
              inputMode="tel"
              dir="ltr"
              autoComplete="tel"
              placeholder={fa.auth.phonePlaceholder}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="rounded-xl border border-surface-border px-4 py-3 text-center outline-none focus:border-accent"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-accent px-4 py-3 font-semibold text-white transition hover:bg-accent-ink disabled:opacity-60"
            >
              {loading ? fa.common.loading : fa.auth.sendCode}
            </button>
          </form>
        ) : (
          <form onSubmit={submitCode} className="flex flex-col gap-4">
            <p className="text-sm text-ink-muted">{fa.auth.codeSentTo(toPersianDigits(phone))}</p>
            <label className="text-sm font-medium" htmlFor="code">
              {fa.auth.codeLabel}
            </label>
            <input
              id="code"
              name="code"
              inputMode="numeric"
              dir="ltr"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="rounded-xl border border-surface-border px-4 py-3 text-center text-lg tracking-widest outline-none focus:border-accent"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-accent px-4 py-3 font-semibold text-white transition hover:bg-accent-ink disabled:opacity-60"
            >
              {loading ? fa.common.loading : fa.auth.verify}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setCode('');
                setError(null);
              }}
              className="text-sm text-ink-muted underline"
            >
              {fa.common.back}
            </button>
          </form>
        )}

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>
    </main>
  );
}
