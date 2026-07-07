import Link from 'next/link';
import { fa, toPersianDigits } from '@khodkar/shared';
import {
  getDb,
  countPendingDrafts,
  countLeads,
  countTodayConversations,
  isBotEnabled,
} from '@khodkar/db';
import { requireTenant } from '@/lib/tenant';
import { telegramStatus } from '@/lib/telegram';
import { TelegramConnect } from './telegram-connect';
import { BotControls } from './bot-controls';
import { PilotFeedback } from './pilot-feedback';

export const runtime = 'nodejs';

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-surface-border bg-surface-card px-3 py-6">
      <span className="nums text-3xl font-bold text-ink">{toPersianDigits(value)}</span>
      <span className="mt-1 text-center text-xs text-ink-muted">{label}</span>
    </div>
  );
}

export default async function PanelHome() {
  const { tenant } = await requireTenant();
  const db = getDb();
  const [tg, pending, leads, todayChats, botEnabled] = await Promise.all([
    telegramStatus(tenant.id),
    countPendingDrafts(db, tenant.id),
    countLeads(db, tenant.id),
    countTodayConversations(db, tenant.id),
    isBotEnabled(db, tenant.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 rounded-2xl border border-surface-border bg-surface-card px-4 py-3">
        <span
          className={`h-3 w-3 rounded-full ${tg.connected ? 'bg-green-500' : 'bg-red-400'}`}
          aria-hidden
        />
        <span className="text-sm">
          {tg.connected ? fa.panel.home.botOn : fa.panel.home.botOff}
        </span>
        {tg.connected && tg.username && (
          <span className="ms-auto text-xs text-ink-muted" dir="ltr">
            @{tg.username}
          </span>
        )}
      </div>

      {!tg.connected && <TelegramConnect />}

      <BotControls enabled={botEnabled} />

      <div className="grid grid-cols-3 gap-3">
        <Stat value={todayChats} label={fa.panel.home.todayChats} />
        <Stat value={leads} label={fa.panel.home.newLeads} />
        <Stat value={pending} label={fa.panel.home.pendingApproval} />
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

      <Link
        href="/panel/billing"
        className="text-center text-sm text-accent-ink underline"
      >
        {fa.plans.manage}
      </Link>

      <PilotFeedback />
    </div>
  );
}
