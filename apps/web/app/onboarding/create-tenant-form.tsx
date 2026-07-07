'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fa } from '@khodkar/shared/i18n-fa';

interface VerticalOption {
  id: string;
  label: string;
}

const ERR: Record<string, string> = {
  invalid_name: fa.onboarding.invalidName,
  invalid_vertical: fa.onboarding.invalidVertical,
};

export function CreateTenantForm({ verticals }: { verticals: VerticalOption[] }) {
  const router = useRouter();
  const [vertical, setVertical] = useState<string>('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!vertical) {
      setError(fa.onboarding.invalidVertical);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/tenant/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, vertical }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(ERR[data.error] ?? fa.errors.generic);
        return;
      }
      router.push(data.redirectTo ?? '/panel');
      router.refresh();
    } catch {
      setError(fa.errors.generic);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div>
        <p className="mb-2 text-sm font-medium">{fa.onboarding.chooseVertical}</p>
        <div className="grid grid-cols-2 gap-2">
          {verticals.map((v) => {
            const active = v.id === vertical;
            return (
              <button
                type="button"
                key={v.id}
                onClick={() => setVertical(v.id)}
                aria-pressed={active}
                className={`rounded-xl border px-3 py-4 text-sm transition ${
                  active
                    ? 'border-accent bg-accent/10 font-semibold text-accent-ink'
                    : 'border-surface-border bg-surface-card text-ink hover:border-accent-soft'
                }`}
              >
                {v.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="tenant-name">
          {fa.onboarding.nameLabel}
        </label>
        <input
          id="tenant-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={fa.onboarding.namePlaceholder}
          className="rounded-xl border border-surface-border px-4 py-3 outline-none focus:border-accent"
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="rounded-2xl bg-accent px-4 py-3 font-semibold text-white transition hover:bg-accent-ink disabled:opacity-60"
      >
        {loading ? fa.onboarding.creating : fa.onboarding.create}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
