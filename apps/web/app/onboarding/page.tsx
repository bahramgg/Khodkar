import { fa } from '@khodkar/shared';
import { requireSession } from '@/lib/session';

export const runtime = 'nodejs';

export default async function OnboardingPage() {
  await requireSession();
  // Placeholder — the agentic onboarding (crawl → interview → sandbox) is built
  // in week 7 (docs/master-plan-fa.md §7). Week 1 just proves auth + routing.
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold">{fa.auth.welcome}</h1>
      <p className="text-ink-muted">
        به {fa.brand} خوش آمدی. آنبوردینگ به‌زودی این‌جا فعال می‌شود.
      </p>
    </main>
  );
}
