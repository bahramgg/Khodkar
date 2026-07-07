import Link from 'next/link';
import { fa, formatToman, PLAN_CATALOG, type Plan } from '@khodkar/shared';
import { LiveDemo } from './live-demo';

const PLAN_ORDER: Plan[] = ['trial', 'basic', 'pro'];

export default function LandingPage() {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-12 px-6 py-14">
      {/* Hero */}
      <section className="flex flex-col items-center gap-6 text-center">
        <span className="rounded-full border border-surface-border px-4 py-1 text-sm text-ink-muted">
          {fa.brand}
        </span>
        <h1 className="text-3xl font-bold leading-relaxed sm:text-4xl">
          {fa.landing.h1a} <span className="text-accent">{fa.landing.h1b}</span>
        </h1>
        <p className="text-ink-muted">{fa.landing.subtitle}</p>
        <Link
          href="/login"
          className="rounded-2xl bg-accent px-8 py-3 text-lg font-semibold text-white transition hover:bg-accent-ink"
        >
          {fa.landing.cta}
        </Link>
      </section>

      {/* Live demo */}
      <LiveDemo />

      {/* Value cards */}
      <section className="grid gap-3 sm:grid-cols-3">
        {fa.landing.values.map((v) => (
          <div key={v.title} className="rounded-2xl border border-surface-border bg-surface-card p-4">
            <h3 className="mb-1 font-bold">{v.title}</h3>
            <p className="text-sm text-ink-muted">{v.desc}</p>
          </div>
        ))}
      </section>

      {/* Pricing */}
      <section>
        <h2 className="mb-4 text-center text-lg font-bold">{fa.landing.pricingTitle}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {PLAN_ORDER.map((id) => {
            const def = PLAN_CATALOG[id];
            return (
              <div
                key={id}
                className="flex flex-col gap-2 rounded-2xl border border-surface-border bg-surface-card p-4"
              >
                <span className="font-bold">{fa.plans.names[id]}</span>
                <span className="nums text-sm text-accent-ink">
                  {def.priceToman === 0 ? fa.plans.free : `${formatToman(def.priceToman)} / ماه`}
                </span>
                <ul className="flex flex-col gap-1 text-xs text-ink-muted">
                  {fa.plans.features[id].map((f) => (
                    <li key={f}>• {f}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col items-center gap-3 text-center">
        <Link
          href="/login"
          className="rounded-2xl bg-accent px-8 py-3 text-lg font-semibold text-white transition hover:bg-accent-ink"
        >
          {fa.landing.cta}
        </Link>
      </section>
    </main>
  );
}
