import { fa, toPersianDigits } from '@khodkar/shared';

export const runtime = 'nodejs';

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-surface-border bg-surface-card px-3 py-6">
      <span className="nums text-3xl font-bold text-ink">{toPersianDigits(value)}</span>
      <span className="mt-1 text-center text-xs text-ink-muted">{label}</span>
    </div>
  );
}

export default function PanelHome() {
  // Access is enforced by the panel layout (requireTenant). Week 2: static zeros;
  // real metrics land with conversations/leads (week 6+).
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 rounded-2xl border border-surface-border bg-surface-card px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-red-400" aria-hidden />
        <span className="text-sm">{fa.panel.home.botOff}</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat value={0} label={fa.panel.home.todayChats} />
        <Stat value={0} label={fa.panel.home.newLeads} />
        <Stat value={0} label={fa.panel.home.pendingApproval} />
      </div>

      <button className="w-full rounded-2xl bg-accent px-4 py-4 text-lg font-semibold text-white transition hover:bg-accent-ink">
        {fa.panel.home.testAssistant}
      </button>

      <button
        disabled
        title={fa.common.soon}
        className="w-full rounded-2xl border border-surface-border px-4 py-3 text-sm text-ink-muted disabled:opacity-70"
      >
        {fa.panel.settingsAssistant} · {fa.common.soon}
      </button>
    </div>
  );
}
