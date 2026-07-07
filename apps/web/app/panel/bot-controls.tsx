'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fa } from '@khodkar/shared/i18n-fa';

export function BotControls({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    try {
      const res = await fetch('/api/bot/toggle', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function sendReport() {
    setBusy(true);
    setReport(null);
    try {
      const res = await fetch('/api/quality/report', { method: 'POST' });
      const data = await res.json();
      if (data.ok) setReport(data.delivered ? fa.panel.home.reportSent : fa.panel.home.reportSaved);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <button
          onClick={toggle}
          disabled={busy}
          className={`flex-1 rounded-2xl px-4 py-2.5 text-sm font-semibold disabled:opacity-60 ${
            enabled
              ? 'border border-surface-border text-ink'
              : 'bg-accent text-white'
          }`}
        >
          {enabled ? fa.panel.home.turnOff : fa.panel.home.turnOn}
        </button>
        <button
          onClick={sendReport}
          disabled={busy}
          className="flex-1 rounded-2xl border border-surface-border px-4 py-2.5 text-sm disabled:opacity-60"
        >
          {fa.panel.home.sendSampleReport}
        </button>
      </div>
      {report && <p className="text-xs text-ink-muted">{report}</p>}
    </div>
  );
}
