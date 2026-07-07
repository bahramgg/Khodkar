import { fa } from '@khodkar/shared';
import { requireTenant, getSwitchableTenants } from '@/lib/tenant';
import { LogoutButton } from './logout-button';
import { TenantSwitcher } from './tenant-switcher';
import { PanelNav } from './panel-nav';

export const runtime = 'nodejs';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { session, tenant } = await requireTenant();
  const tenants = await getSwitchableTenants(session.sub);

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-surface-border px-5 py-4">
        <div className="min-w-0">
          <p className="text-xs text-ink-muted">{fa.brand}</p>
          {tenants.length > 1 ? (
            <TenantSwitcher tenants={tenants} activeId={tenant.id} />
          ) : (
            <h1 className="truncate text-lg font-bold">{tenant.name}</h1>
          )}
        </div>
        <LogoutButton />
      </header>

      <main className="flex-1 px-5 py-6 pb-24">{children}</main>

      <PanelNav />
    </div>
  );
}
