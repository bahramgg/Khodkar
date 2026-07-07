import type { Metadata, Viewport } from 'next';
import { fa } from '@khodkar/shared';
import './globals.css';

export const metadata: Metadata = {
  title: `${fa.brand} — دستیار فروش هوشمند`,
  description: 'لینک سایتت را بده؛ ۱۰ دقیقه بعد دستیار فروش داری.',
};

export const viewport: Viewport = {
  themeColor: '#FBFAF8',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        {/* Vazirmatn via CDN with a graceful system fallback if offline. */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/vazirmatn@33.0.3/Vazirmatn-font-face.css"
        />
      </head>
      <body className="min-h-screen bg-surface text-ink antialiased">{children}</body>
    </html>
  );
}
