import { NextResponse } from 'next/server';
import { completeCheckout } from '@/lib/billing';
import { env } from '@/lib/env';

export const runtime = 'nodejs';

/** Zarinpal redirects the user here with ?Authority=…&Status=OK|NOK. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const authority = url.searchParams.get('Authority') ?? '';
  const status = url.searchParams.get('Status') ?? '';

  const result = await completeCheckout(authority, status);
  const base = env.appUrl || url.origin;
  const dest = result.ok
    ? `${base}/panel/billing?status=success`
    : `${base}/panel/billing?status=failed`;
  return NextResponse.redirect(dest);
}
