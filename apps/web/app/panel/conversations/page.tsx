import { fa } from '@khodkar/shared';
import { getDb, listPendingDrafts, listUnanswered } from '@khodkar/db';
import { requireTenant } from '@/lib/tenant';
import { DraftCard } from '../draft-card';
import { UnansweredCard } from '../unanswered-card';

export const runtime = 'nodejs';

export default async function ConversationsPage() {
  const { tenant } = await requireTenant();
  const db = getDb();
  const [drafts, unanswered] = await Promise.all([
    listPendingDrafts(db, tenant.id),
    listUnanswered(db, tenant.id),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="mb-4 text-lg font-bold">
          {fa.panel.conversations.filterPending}
          {drafts.length > 0 && (
            <span className="nums ms-2 rounded-full bg-accent/15 px-2 py-0.5 text-sm text-accent-ink">
              {drafts.length}
            </span>
          )}
        </h2>
        {drafts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-surface-border bg-surface-card px-6 py-12 text-center text-sm text-ink-muted">
            {fa.panel.conversations.noPending}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {drafts.map((d) => (
              <li key={d.draftId}>
                <DraftCard
                  draftId={d.draftId}
                  question={d.question ?? ''}
                  proposedText={d.proposedText}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-bold">{fa.panel.unanswered.title}</h2>
        {unanswered.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-surface-border bg-surface-card px-6 py-10 text-center text-sm text-ink-muted">
            {fa.panel.unanswered.empty}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {unanswered.map((u) => (
              <li key={u.id}>
                <UnansweredCard id={u.id} question={u.question} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
