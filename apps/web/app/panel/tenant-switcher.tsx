'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fa } from '@khodkar/shared/i18n-fa';

interface TenantOption {
  id: string;
  name: string;
}

export function TenantSwitcher({
  tenants,
  activeId,
}: {
  tenants: TenantOption[];
  activeId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const tenantId = e.target.value;
    if (tenantId === activeId) return;
    setBusy(true);
    try {
      const res = await fetch('/api/tenant/switch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tenantId }),
      });
      if (res.ok) {
        router.push('/panel');
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <select
      aria-label={fa.panel.switchTenant}
      value={activeId}
      onChange={onChange}
      disabled={busy}
      className="max-w-[12rem] truncate bg-transparent text-lg font-bold text-ink outline-none disabled:opacity-60"
    >
      {tenants.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </select>
  );
}
