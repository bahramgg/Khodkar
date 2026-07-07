'use client';

import { useRouter } from 'next/navigation';
import { fa } from '@khodkar/shared/i18n-fa';

export function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }
  return (
    <button onClick={logout} className="text-sm text-ink-muted underline">
      {fa.common.logout}
    </button>
  );
}
