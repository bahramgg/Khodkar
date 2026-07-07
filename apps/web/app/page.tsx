import Link from 'next/link';
import { fa } from '@khodkar/shared';

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-8 px-6 text-center">
      <span className="rounded-full border border-surface-border px-4 py-1 text-sm text-ink-muted">
        {fa.brand}
      </span>
      <h1 className="text-3xl font-bold leading-relaxed sm:text-4xl">
        لینک سایتت را بده؛ <span className="text-accent">۱۰ دقیقه</span> بعد دستیار فروش داری.
      </h1>
      <p className="text-ink-muted">
        کسب‌وکارت را خودت اتومیت کن — بدون دانش فنی، همه‌چیز در گفتگو.
      </p>
      <Link
        href="/login"
        className="rounded-2xl bg-accent px-8 py-3 text-lg font-semibold text-white transition hover:bg-accent-ink"
      >
        شروع رایگان
      </Link>
    </main>
  );
}
