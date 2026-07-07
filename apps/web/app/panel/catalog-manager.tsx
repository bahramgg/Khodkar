'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fa, toPersianDigits, formatToman } from '@khodkar/shared/i18n-fa';

interface Item {
  id: string;
  title: string;
  sku: string | null;
  price: number | null;
  rentPrice: number | null;
}

export function CatalogManager({ items }: { items: Item[] }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [image, setImage] = useState('');
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter(
      (p) => p.title.toLowerCase().includes(term) || (p.sku ?? '').toLowerCase().includes(term),
    );
  }, [items, q]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/catalog/product', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title, price, imageUrl: image }),
      });
      if (res.ok) {
        setTitle('');
        setPrice('');
        setImage('');
        setAdding(false);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold">{fa.panel.catalog.title}</h2>
        <span className="text-sm text-ink-muted">
          {fa.panel.catalog.count(toPersianDigits(items.length))}
        </span>
      </div>

      <div className="mb-4 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={fa.panel.catalog.searchPlaceholder}
          className="flex-1 rounded-xl border border-surface-border px-4 py-2.5 text-sm outline-none focus:border-accent"
        />
        <button
          onClick={() => setAdding((a) => !a)}
          className="shrink-0 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white"
        >
          + {fa.panel.catalog.addProduct}
        </button>
      </div>

      {adding && (
        <form
          onSubmit={add}
          className="mb-4 flex flex-col gap-2 rounded-2xl border border-surface-border bg-surface-card p-4"
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={fa.panel.catalog.titlePlaceholder}
            required
            className="rounded-xl border border-surface-border px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="numeric"
            placeholder={fa.panel.catalog.pricePlaceholder}
            className="rounded-xl border border-surface-border px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <input
            value={image}
            onChange={(e) => setImage(e.target.value)}
            dir="ltr"
            placeholder={fa.panel.catalog.imagePlaceholder}
            className="rounded-xl border border-surface-border px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={busy || title.trim().length < 2}
            className="rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {fa.panel.catalog.save}
          </button>
        </form>
      )}

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-surface-border bg-surface-card px-6 py-12 text-center text-sm text-ink-muted">
          {items.length === 0 ? fa.panel.catalog.empty : fa.panel.catalog.noResults}
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {filtered.map((p) => (
            <li
              key={p.id}
              className="flex flex-col gap-1 rounded-2xl border border-surface-border bg-surface-card p-3"
            >
              <span className="line-clamp-2 text-sm font-medium">{p.title}</span>
              {p.sku && (
                <span className="text-xs text-ink-muted" dir="ltr">
                  {p.sku}
                </span>
              )}
              {p.price != null && (
                <span className="nums mt-1 text-sm text-accent-ink">{formatToman(p.price)}</span>
              )}
              {p.rentPrice != null && (
                <span className="nums text-xs text-ink-muted">
                  {fa.panel.catalog.rent}: {formatToman(p.rentPrice)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
