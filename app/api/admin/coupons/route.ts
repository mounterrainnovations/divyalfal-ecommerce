import { NextResponse } from 'next/server';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth-guard';
import { isMissingTable, notSetUpResponse } from '@/lib/admin/not-set-up';
import { readCoupons, saveCoupons } from '@/lib/repositories/coupons';

/**
 * The portal's end of the coupon list.
 *
 * GET /api/admin/coupons -> `{ coupons }`
 * PUT /api/admin/coupons with `{ coupons: [...] }` -> `{ coupons }`, as stored
 *
 * Admin-only, both of them. These are the codes that take money off an order, so the guard is
 * the first thing either handler does and a missing session is a 401 before the body is read.
 *
 * THERE IS NO PUBLIC ROUTE HERE, AND THAT IS DELIBERATE. A storefront endpoint that listed the
 * coupons would publish every unannounced code the shop had prepared, including the ones
 * scheduled for a sale that has not started. When a checkout eventually needs to honour a code
 * it will post the code a customer typed and get back a verdict from `validateCoupon` — never
 * the list.
 *
 * The PUT replaces the list whole: the screen sends what the owner sees, the repository
 * re-parses it, and the response is what was actually stored, so the screen's state and the
 * row cannot drift apart.
 */

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
  } catch {
    return unauthorizedResponse();
  }

  try {
    return NextResponse.json({ coupons: await readCoupons() });
  } catch (error) {
    if (isMissingTable(error)) return notSetUpResponse();
    console.error('[API] GET /api/admin/coupons failed', error);
    return NextResponse.json({ error: 'Failed to load the coupons' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin(request);
  } catch {
    return unauthorizedResponse();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Either `{ coupons: [...] }` or the bare array, so a caller cannot half-miss the envelope
  // and have an empty list written over a working one.
  const list =
    body && typeof body === 'object' && !Array.isArray(body)
      ? (body as { coupons?: unknown }).coupons
      : body;

  if (!Array.isArray(list)) {
    return NextResponse.json({ error: 'Expected an array of coupons' }, { status: 400 });
  }

  try {
    return NextResponse.json({ coupons: await saveCoupons(list) });
  } catch (error) {
    if (error instanceof TypeError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (isMissingTable(error)) return notSetUpResponse();
    console.error('[API] PUT /api/admin/coupons failed', error);
    return NextResponse.json({ error: 'Failed to save the coupons' }, { status: 500 });
  }
}
