'use client';

import { useState } from 'react';
import { fa } from '@khodkar/shared/i18n-fa';

export function BillingActions({ plan }: { plan: string }) {
  const [busy, setBusy] = useState(false);

  async function checkout() {
    setBusy(true);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.ok && data.url) {
        window.location.href = data.url; // → gateway (or mock loop-back)
      } else {
        setBusy(false);
      }
    } catch {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={checkout}
      disabled={busy}
      className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
    >
      {busy ? fa.common.loading : fa.plans.choose}
    </button>
  );
}
