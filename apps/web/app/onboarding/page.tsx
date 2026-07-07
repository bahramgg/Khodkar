import { redirect } from 'next/navigation';
import { VERTICALS, fa } from '@khodkar/shared';
import { requireSession } from '@/lib/session';
import { getInterviewPlan } from '@/lib/onboarding';
import { CreateTenantForm } from './create-tenant-form';
import { OnboardingWizard } from './onboarding-wizard';

export const runtime = 'nodejs';

export default async function OnboardingPage() {
  const session = await requireSession();

  // No tenant yet → step 0: create one (vertical + name).
  if (!session.tenantId) {
    const verticals = VERTICALS.map((id) => ({ id, label: fa.verticals[id] }));
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
        <h1 className="mb-1 text-2xl font-bold">{fa.onboarding.title}</h1>
        <p className="mb-6 text-sm text-ink-muted">{fa.onboarding.subtitle}</p>
        <CreateTenantForm verticals={verticals} />
      </main>
    );
  }

  const plan = await getInterviewPlan(session.tenantId);
  if (plan.status === 'active') redirect('/panel');

  return (
    <main className="mx-auto min-h-screen max-w-md px-6 py-8">
      <OnboardingWizard questions={plan.questions} />
    </main>
  );
}
