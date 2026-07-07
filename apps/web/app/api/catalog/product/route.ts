import { NextResponse } from 'next/server';
import { toEnglishDigits } from '@khodkar/shared';
import { getSession } from '@/lib/session';
import { addCatalogProduct } from '@/lib/catalog';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.tenantId)
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  let body: { title?: string; price?: string | number; imageUrl?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
  }

  const rawPrice = body.price;
  const priceNum =
    rawPrice === undefined || rawPrice === '' || rawPrice === null
      ? null
      : Number(toEnglishDigits(String(rawPrice)).replace(/[^\d.]/g, ''));

  const result = await addCatalogProduct(session.tenantId, {
    title: String(body.title ?? ''),
    price: priceNum !== null && Number.isFinite(priceNum) ? priceNum : null,
    imageUrl: body.imageUrl,
  });
  if (!result.ok) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}
