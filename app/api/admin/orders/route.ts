import { NextResponse } from 'next/server';
import type { OrderStatus, OrderType, PaymentStatus } from '@prisma/client';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth-guard';
import { isMissingTable, notSetUpResponse } from '@/lib/admin/not-set-up';
import {
  createOfflineOrder,
  InsufficientStockError,
  listOrders,
  ORDER_STATUSES,
  ORDER_TYPES,
  OrderValidationError,
  PAYMENT_STATUSES,
} from '@/lib/repositories/orders';

/**
 * GET  /api/admin/orders?search=&status=&paymentStatus=&type=&page=&perPage=
 *        -> `{ orders, total, page, perPage, totalPages }`
 * POST /api/admin/orders with an offline sale -> 201 and the created order, fully included
 *
 * Thin on purpose: the filters are validated here because a bad enum is an HTTP-level mistake
 * and Prisma would answer it with a 500, and everything else is `lib/repositories/orders.ts`.
 *
 * POST is the walk-in counter sale. It is the only write in the portal that moves stock, so
 * its three refusals are kept distinct: **400** for a malformed line (the form can point at
 * the field), **409** for not enough stock (a true conflict with the shelf — nothing is wrong
 * with the request, the goods are not there), and **503** while the tables are missing. A 409
 * carries `shortfalls`, so the screen can name every short line at once instead of making the
 * admin resubmit to discover the second one.
 */

/** A query parameter that must be one of a fixed set, or absent. */
function readEnum<T extends string>(
  value: string | null,
  allowed: readonly T[]
): { ok: true; value: T | undefined } | { ok: false } {
  if (!value) return { ok: true, value: undefined };
  const upper = value.toUpperCase();
  if (!(allowed as readonly string[]).includes(upper)) return { ok: false };
  return { ok: true, value: upper as T };
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
  } catch {
    return unauthorizedResponse();
  }

  const params = new URL(request.url).searchParams;

  const status = readEnum<OrderStatus>(params.get('status'), ORDER_STATUSES);
  if (!status.ok) {
    return NextResponse.json(
      { error: `status must be one of ${ORDER_STATUSES.join(', ')}` },
      { status: 400 }
    );
  }

  const paymentStatus = readEnum<PaymentStatus>(params.get('paymentStatus'), PAYMENT_STATUSES);
  if (!paymentStatus.ok) {
    return NextResponse.json(
      { error: `paymentStatus must be one of ${PAYMENT_STATUSES.join(', ')}` },
      { status: 400 }
    );
  }

  const type = readEnum<OrderType>(params.get('type'), ORDER_TYPES);
  if (!type.ok) {
    return NextResponse.json(
      { error: `type must be one of ${ORDER_TYPES.join(', ')}` },
      { status: 400 }
    );
  }

  try {
    // `page` and `perPage` are not validated here: `resolvePaging` clamps them, and refusing a
    // stale bookmark with a 400 would be less useful than showing page one.
    const result = await listOrders({
      search: params.get('search') ?? undefined,
      status: status.value,
      paymentStatus: paymentStatus.value,
      type: type.value,
      page: Number(params.get('page')) || undefined,
      perPage: Number(params.get('perPage')) || undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (isMissingTable(error)) return notSetUpResponse();
    console.error('[API] GET /api/admin/orders failed', error);
    return NextResponse.json({ error: 'Failed to load orders' }, { status: 500 });
  }
}

export async function POST(request: Request) {
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

  try {
    const order = await createOfflineOrder(body);
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return NextResponse.json(
        { error: error.message, shortfalls: error.shortfalls },
        { status: 409 }
      );
    }
    if (error instanceof OrderValidationError) {
      return NextResponse.json({ error: error.message, field: error.field }, { status: 400 });
    }
    if (isMissingTable(error)) return notSetUpResponse();
    console.error('[API] POST /api/admin/orders failed', error);
    return NextResponse.json({ error: 'Failed to record the order' }, { status: 500 });
  }
}
