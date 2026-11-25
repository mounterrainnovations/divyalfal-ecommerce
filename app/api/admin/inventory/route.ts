import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth-guard';
import { isMissingTable, notSetUpResponse } from '@/lib/admin/not-set-up';

/**
 * The portal's end of stock: `ProductVariant`, which is where every size, colour and count the
 * shop has ever recorded actually lives.
 *
 * GET    /api/admin/inventory              -> `{ variants, products }`
 * POST   /api/admin/inventory              -> the created variant
 * PATCH  /api/admin/inventory              -> the updated variant, or `{ updated: n }` for a batch
 * DELETE /api/admin/inventory?id=…         -> `{ deleted: true }`, or **409 naming the orders**
 *
 * WHY GET RETURNS EVERY PRODUCT AND NOT JUST THE VARIANTS. Eight variants cover two of the
 * fifteen products. The other thirteen have no sizes recorded at all, and the difference
 * between "no sizes recorded" and "zero in stock" is the whole truth of this screen: the first
 * is a gap in the data, the second is a garment that cannot be sold. A list of variants alone
 * cannot express the first, so the catalogue comes with it and the screen derives which
 * products are uncovered (`app/dashboard/inventory/stock.ts`). The payload is fifteen rows of
 * five fields; paging it would cost more in complexity than it could ever save in bytes.
 *
 * WHY `updatedAt` IS WRITTEN BY HAND. `ProductVariant.updatedAt` carries no `@updatedAt` in
 * the schema, because the schema is `prisma db pull` from a database the pre-revamp
 * application wrote — and the column is `NOT NULL` with no default. Prisma therefore refuses
 * any create or update that omits it. Every write below sets it; adding the attribute to the
 * schema instead would have been a migration this change is not allowed to make.
 */

/** The product fields the stock screen needs: enough to show a row, nothing more. */
const PRODUCT_SHAPE = {
  id: true,
  name: true,
  photos: true,
  category: true,
  isArchived: true,
} as const;

/** A JSON-safe variant row, with its product attached. */
function shapeVariant(variant: {
  id: string;
  productId: string;
  size: string;
  color: string | null;
  stock: number;
  updatedAt: Date;
  Product?: { id: string; name: string; photos: string[]; category: string; isArchived: boolean };
}) {
  return {
    id: variant.id,
    productId: variant.productId,
    size: variant.size,
    color: variant.color,
    stock: variant.stock,
    updatedAt: variant.updatedAt.toISOString(),
    product: variant.Product
      ? {
          id: variant.Product.id,
          name: variant.Product.name,
          // The first photograph or nothing — never a stand-in. A thumbnail that silently
          // shows another garment's picture is worse than an empty frame that says so.
          photo: variant.Product.photos[0] ?? null,
          category: variant.Product.category,
          isArchived: variant.Product.isArchived,
        }
      : null,
  };
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
  } catch {
    return unauthorizedResponse();
  }

  try {
    const [variants, products] = await Promise.all([
      prisma.productVariant.findMany({
        include: { Product: { select: PRODUCT_SHAPE } },
        // Grouped by garment, then by size, so the table reads as a stock list rather than as
        // whatever order the rows happen to have been inserted in.
        orderBy: [{ productId: 'asc' }, { size: 'asc' }],
      }),
      prisma.product.findMany({ select: PRODUCT_SHAPE, orderBy: { name: 'asc' } }),
    ]);

    return NextResponse.json({
      variants: variants.map(shapeVariant),
      products: products.map(product => ({
        id: product.id,
        name: product.name,
        photo: product.photos[0] ?? null,
        category: product.category,
        isArchived: product.isArchived,
      })),
    });
  } catch (error) {
    if (isMissingTable(error)) return notSetUpResponse();
    console.error('[API] GET /api/admin/inventory failed', error);
    return NextResponse.json({ error: 'Failed to load stock' }, { status: 500 });
  }
}

/** Whether a value is a whole, non-negative count. Stock is units of a garment, not a measure. */
function wholeCount(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return null;
  return parsed;
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

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Expected an object' }, { status: 400 });
  }

  const input = body as { productId?: unknown; size?: unknown; color?: unknown; stock?: unknown };
  const productId = typeof input.productId === 'string' ? input.productId.trim() : '';
  const size = typeof input.size === 'string' ? input.size.trim() : '';
  const stock = input.stock === undefined ? 0 : wholeCount(input.stock);
  const color =
    typeof input.color === 'string' && input.color.trim() !== '' ? input.color.trim() : null;

  if (!productId) return NextResponse.json({ error: 'A product is required' }, { status: 400 });
  if (!size) return NextResponse.json({ error: 'A size is required' }, { status: 400 });
  if (stock === null) {
    return NextResponse.json(
      { error: 'Stock must be a whole number of units, zero or more' },
      { status: 400 }
    );
  }

  try {
    const created = await prisma.productVariant.create({
      // `id` has no default in the database (the old application generated them), so it is
      // generated here; `updatedAt` for the reason in the file header.
      data: { id: crypto.randomUUID(), productId, size, color, stock, updatedAt: new Date() },
      include: { Product: { select: PRODUCT_SHAPE } },
    });
    return NextResponse.json(shapeVariant(created), { status: 201 });
  } catch (error) {
    // P2003: the product this size was asked for does not exist. Said plainly, because the
    // likeliest cause is a product deleted in another tab while this screen was open.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      return NextResponse.json(
        { error: 'That product no longer exists. Reload the screen and try again.' },
        { status: 409 }
      );
    }
    if (isMissingTable(error)) return notSetUpResponse();
    console.error('[API] POST /api/admin/inventory failed', error);
    return NextResponse.json({ error: 'Failed to add the size' }, { status: 500 });
  }
}

/**
 * PATCH takes either one variant — `{ id, stock?, size?, color? }` — or a batch of stock
 * changes, `{ updates: [{ id, stock }, …] }`.
 *
 * The batch exists because the stock table's natural use is "walk the rail, correct six
 * numbers, save": six round trips is six chances to half-save, and an admin cannot tell which
 * of the six failed. The batch runs in a transaction, so either every correction lands or none
 * does and the screen's unsaved marks are still right.
 */
export async function PATCH(request: Request) {
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

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Expected an object' }, { status: 400 });
  }

  const input = body as {
    id?: unknown;
    size?: unknown;
    color?: unknown;
    stock?: unknown;
    updates?: unknown;
  };

  if (Array.isArray(input.updates)) {
    const rows: { id: string; stock: number }[] = [];
    for (const raw of input.updates) {
      if (!raw || typeof raw !== 'object') {
        return NextResponse.json({ error: 'Each update must be an object' }, { status: 400 });
      }
      const { id, stock } = raw as { id?: unknown; stock?: unknown };
      const count = wholeCount(stock);
      if (typeof id !== 'string' || !id || count === null) {
        return NextResponse.json(
          { error: 'Each update needs an id and a whole number of units' },
          { status: 400 }
        );
      }
      rows.push({ id, stock: count });
    }
    if (rows.length === 0) return NextResponse.json({ updated: 0 });

    try {
      const now = new Date();
      await prisma.$transaction(
        rows.map(row =>
          prisma.productVariant.update({
            where: { id: row.id },
            data: { stock: row.stock, updatedAt: now },
          })
        )
      );
      return NextResponse.json({ updated: rows.length });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return NextResponse.json(
          { error: 'One of those sizes no longer exists. Reload the screen and try again.' },
          { status: 404 }
        );
      }
      if (isMissingTable(error)) return notSetUpResponse();
      console.error('[API] PATCH /api/admin/inventory (batch) failed', error);
      return NextResponse.json({ error: 'Failed to save the stock changes' }, { status: 500 });
    }
  }

  const id = typeof input.id === 'string' ? input.id.trim() : '';
  if (!id) return NextResponse.json({ error: 'A variant id is required' }, { status: 400 });

  // Built field by field so a patch can carry one of the three without blanking the others.
  const data: Prisma.ProductVariantUpdateInput = { updatedAt: new Date() };

  if (input.stock !== undefined) {
    const count = wholeCount(input.stock);
    if (count === null) {
      return NextResponse.json(
        { error: 'Stock must be a whole number of units, zero or more' },
        { status: 400 }
      );
    }
    data.stock = count;
  }

  if (input.size !== undefined) {
    const size = typeof input.size === 'string' ? input.size.trim() : '';
    if (!size) return NextResponse.json({ error: 'A size is required' }, { status: 400 });
    data.size = size;
  }

  // An explicit empty colour means "this size has no colour of its own", which is a real
  // state — four of the eight rows in the live table are in it — so it clears the column
  // rather than being ignored.
  if (input.color !== undefined) {
    data.color =
      typeof input.color === 'string' && input.color.trim() !== '' ? input.color.trim() : null;
  }

  try {
    const updated = await prisma.productVariant.update({
      where: { id },
      data,
      include: { Product: { select: PRODUCT_SHAPE } },
    });
    return NextResponse.json(shapeVariant(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'That size no longer exists' }, { status: 404 });
    }
    if (isMissingTable(error)) return notSetUpResponse();
    console.error('[API] PATCH /api/admin/inventory failed', error);
    return NextResponse.json({ error: 'Failed to save the size' }, { status: 500 });
  }
}

/** "appears on 2 orders" — the count, in words, for the refusal below. */
function ordersSentence(orders: number): string {
  return orders === 1 ? 'appears on 1 order' : `appears on ${orders} orders`;
}

/**
 * DELETE /api/admin/inventory?id=…
 *
 * 200 `{ deleted: true }` when the size was never ordered; **409 naming the orders** when it
 * was. `OrderItem.productVariantId` is a required foreign key, so a size that has been bought
 * cannot be removed — the database will not have it, and nor should it: the order would lose
 * the record of what was actually sold.
 *
 * The orders are counted *before* the delete so the refusal can say how many there are, and
 * the foreign-key error is still caught behind it, because the count and the delete are two
 * statements and an order can land between them. Either way the admin reads a sentence about
 * their shop rather than `Foreign key constraint failed on the field: productVariantId`.
 */
export async function DELETE(request: Request) {
  try {
    await requireAdmin(request);
  } catch {
    return unauthorizedResponse();
  }

  const id = new URL(request.url).searchParams.get('id')?.trim() ?? '';
  if (!id) return NextResponse.json({ error: 'A variant id is required' }, { status: 400 });

  try {
    // Distinct orders, not order items: "appears on 2 orders" is what an admin can go and
    // look at, and one order holding the same size twice is still one order.
    const referencing = await prisma.orderItem.findMany({
      where: { productVariantId: id },
      select: { orderId: true },
      distinct: ['orderId'],
    });

    if (referencing.length > 0) {
      return NextResponse.json(
        {
          error: `This size ${ordersSentence(referencing.length)} and cannot be removed. Set its stock to 0 instead, which takes it out of stock without rewriting what was sold.`,
          orders: referencing.length,
        },
        { status: 409 }
      );
    }

    await prisma.productVariant.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'That size no longer exists' }, { status: 404 });
      }
      // The race the pre-check cannot close: an order placed between the count and the delete.
      if (error.code === 'P2003' || error.code === 'P2014') {
        return NextResponse.json(
          {
            error:
              'This size has just been ordered and can no longer be removed. Set its stock to 0 instead.',
          },
          { status: 409 }
        );
      }
    }
    if (isMissingTable(error)) return notSetUpResponse();
    console.error('[API] DELETE /api/admin/inventory failed', error);
    return NextResponse.json({ error: 'Failed to remove the size' }, { status: 500 });
  }
}
