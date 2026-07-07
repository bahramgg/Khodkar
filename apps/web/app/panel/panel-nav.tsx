'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { fa } from '@khodkar/shared/i18n-fa';

const ITEMS = [
  { href: '/panel', label: fa.panel.nav.home },
  { href: '/panel/conversations', label: fa.panel.nav.conversations },
  { href: '/panel/catalog', label: fa.panel.nav.catalog },
  { href: '/panel/campaigns', label: fa.panel.nav.campaigns },
] as const;

export function PanelNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 mx-auto max-w-2xl border-t border-surface-border bg-surface-card">
      <ul className="grid grid-cols-4">
        {ITEMS.map((item) => {
          const active =
            item.href === '/panel' ? pathname === '/panel' : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center justify-center py-4 text-sm transition ${
                  active ? 'font-bold text-accent-ink' : 'text-ink-muted hover:text-ink'
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
