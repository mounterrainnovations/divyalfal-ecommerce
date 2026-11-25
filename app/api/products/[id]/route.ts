import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { transformDbProductToProduct } from '@/lib/utils/product-utils';
import { retryDatabaseOperation } from '@/lib/utils/database';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth-guard';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const dbProduct = await retryDatabaseOperation(async () =>
      prisma.product.findUnique({ where: { id } })
    );

    if (!dbProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const product = transformDbProductToProduct(dbProduct);
    return NextResponse.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to fetch product',
        ...(process.env.NODE_ENV === 'development' && { message: errorMessage }),
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Admin-only write. First statement, outside the try/catch so a refusal is never rewritten.
  try {
    await requireAdmin(req);
  } catch {
    return unauthorizedResponse();
  }

  try {
    const { id } = await params;
    const data = await req.json();

    /*
     * ARCHIVE AND RESTORE RIDE ON THIS HANDLER, and needed no new endpoint: the body is passed
     * to `update` as given, so `PATCH { isArchived: true }` already reached the column. The one
     * thing added is the coercion below.
     *
     * WHY COERCE. `isArchived` is the first boolean an admin can set from a URL rather than
     * from a form — the archive control is a one-field patch — and Prisma rejects the string
     * `"true"` for a `Boolean` column with a validation error that surfaces to the portal as a
     * bare 500. `=== true` is deliberately strict about what counts as archiving: only a real
     * JSON `true` takes a garment off the shop, and anything else restores it, so a malformed
     * body can never half-hide a product. The field is only touched when it is present, so an
     * ordinary product save (which never sends it) is unaffected.
     */
    if (data && typeof data === 'object' && 'isArchived' in data) {
      data.isArchived = data.isArchived === true || data.isArchived === 'true';
    }

    const product = await retryDatabaseOperation(async () =>
      prisma.product.update({ where: { id }, data })
    );
    return NextResponse.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('Record to update not found')) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        error: 'Failed to update product',
        ...(process.env.NODE_ENV === 'development' && { message: errorMessage }),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  // Admin-only write. First statement, outside the try/catch so a refusal is never rewritten.
  try {
    await requireAdmin(_);
  } catch {
    return unauthorizedResponse();
  }

  try {
    const { id } = await params;

    /*
     * A PRODUCT AN ORDER REFERENCES CANNOT BE DELETED, AND NOW SAYS SO.
     *
     * `OrderItem.productId` is a required foreign key with no cascade, so the database refuses
     * the delete outright — and until this check the portal answered that refusal with a bare
     * 500 and "Failed to delete product", which reads as a broken portal rather than as the
     * shop's own history protecting itself. The orders are counted first so the sentence can
     * say how many there are, and the alternative is named in the same breath: archiving takes
     * a garment off the shop and leaves every order's record of it intact.
     *
     * Distinct orders rather than order items: two lines of the same order is still one order,
     * and "2 orders" is the thing an admin can go and look at.
     */
    const referencing = await prisma.orderItem.findMany({
      where: { productId: id },
      select: { orderId: true },
      distinct: ['orderId'],
    });

    if (referencing.length > 0) {
      const orders =
        referencing.length === 1 ? 'appears on 1 order' : `appears on ${referencing.length} orders`;
      return NextResponse.json(
        {
          error: `This product ${orders} and cannot be deleted. Archive it instead: it comes off the shop immediately and the orders keep their record of what was sold.`,
          orders: referencing.length,
        },
        { status: 409 }
      );
    }

    await retryDatabaseOperation(async () => prisma.product.delete({ where: { id } }));
    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('Record to delete does not exist')) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // The race the count above cannot close: an order placed between the two statements.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === 'P2003' || error.code === 'P2014')
    ) {
      return NextResponse.json(
        {
          error:
            'This product has just been ordered and can no longer be deleted. Archive it instead.',
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to delete product',
        ...(process.env.NODE_ENV === 'development' && { message: errorMessage }),
      },
      { status: 500 }
    );
  }
}
