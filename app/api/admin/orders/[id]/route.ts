import { NextResponse } from 'next/server';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth-guard';
import { isMissingTable, notSetUpResponse } from '@/lib/admin/not-set-up';
import {
  getOrder,
  OrderNotFoundError,
  OrderValidationError,
  updateOrder,
  validateOrderPatch,
} from '@/lib/repositories/orders';

/**
 * GET   /api/admin/orders/[id] -> the order with customer, address, lines, payments and totals
 * PATCH /api/admin/orders/[id] with any of `{ status, paymentStatus, trackingId, trackingUrl }`
 *         -> the updated order, in the same shape
 *
 * Those four fields are the whole of what the portal may change about an order, and the reason
 * is not caution: the lines, the amounts and the customer are what the customer agreed to, and
 * a portal that can quietly rewrite them is a portal that can make a dispute unresolvable.
 * Correcting a line means a new order and a reason; it is not an edit.
 *
 * PATCH returns the full order rather than the patch, so the screen renders a server fact and
 * never a hopeful local copy of one.
 */

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
  } catch {
    return unauthorizedResponse();
  }

  const { id } = await params;

  try {
    return NextResponse.json(await getOrder(id));
  } catch (error) {
    if (error instanceof OrderNotFoundError) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (isMissingTable(error)) return notSetUpResponse();
    console.error('[API] GET /api/admin/orders/[id] failed', error);
    return NextResponse.json({ error: 'Failed to load the order' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
  } catch {
    return unauthorizedResponse();
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    // Validated before the read: a patch naming an unknown status should be a 400 whether or
    // not the id exists, and checking the body first keeps that answer independent of the row.
    const patch = validateOrderPatch(body);
    return NextResponse.json(await updateOrder(id, patch));
  } catch (error) {
    if (error instanceof OrderValidationError) {
      return NextResponse.json({ error: error.message, field: error.field }, { status: 400 });
    }
    if (error instanceof OrderNotFoundError) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (isMissingTable(error)) return notSetUpResponse();
    console.error('[API] PATCH /api/admin/orders/[id] failed', error);
    return NextResponse.json({ error: 'Failed to update the order' }, { status: 500 });
  }
}
