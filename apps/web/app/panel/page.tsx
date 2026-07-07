import { fa, toPersianDigits } from '@khodkar/shared';
import { requireSession } from '@/lib/session';
import { LogoutButton } from './logout-button';

export const runtime = 'nodejs';

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-surface-border bg-surface-card px-4 py-6">
      <span className="nums text-3xl font-bold text-ink">{toPersianDigits(value)}</span>
      <span className="mt-1 text-sm text-ink-muted">{label}</span>
    </div>
  );
}

export default async function PanelHome() {
  const session = await requireSession();

  // Week 1: static zeros. Real metrics land with conversations/leads (week 6+).
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{fa.brand}</h1>
          <p className="text-sm text-ink-muted" dir="ltr">
            {toPersianDigits(session.phone)}
          </p>
        </div>
        <LogoutButton />
      </header>

      <div className="mb-8 flex items-center gap-2 rounded-2xl border border-surface-border bg-surface-card px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-red-400" aria-hidden />
        <span className="text-sm">{fa.panel.home.botOff}</span>
      </div>

      <div className="mb-8 grid grid-cols-3 gap-3">
        <Stat value={0} label={fa.panel.home.todayChats} />
        <Stat value={0} label={fa.panel.home.newLeads} />
        <Stat value={0} label={fa.panel.home.pendingApproval} />
      </div>

      <button className="w-full rounded-2xl bg-accent px-4 py-4 text-lg font-semibold text-white transition hover:bg-accent-ink">
        {fa.panel.home.testAssistant}
      </button>
    </main>
  );
}
