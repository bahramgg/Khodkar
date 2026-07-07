import { redirect } from 'next/navigation';
import { VERTICALS, fa } from '@khodkar/shared';
import { requireSession } from '@/lib/session';
import { CreateTenantForm } from './create-tenant-form';

export const runtime = 'nodejs';

export default async function OnboardingPage() {
  const session = await requireSession();
  // Already has an active tenant → straight to the panel.
  if (session.tenantId) redirect('/panel');

  const verticals = VERTICALS.map((id) => ({ id, label: fa.verticals[id] }));
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
      <h1 className="mb-1 text-2xl font-bold">{fa.onboarding.title}</h1>
      <p className="mb-6 text-sm text-ink-muted">{fa.onboarding.subtitle}</p>
      <CreateTenantForm verticals={verticals} />
    </main>
  );
}
