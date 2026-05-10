import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { transformDbProductToProduct } from '@/lib/utils/product-utils';
import { retryDatabaseOperation } from '@/lib/utils/database';
import { checkAdmin } from '@/lib/auth-utils';


export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const dbProduct = await retryDatabaseOperation(async () =>
      prisma.product.findUnique({ where: { id }, include: { variants: true } })
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
  try {
    const { isAdmin } = await checkAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    // Clean and transform data to match Prisma schema
    const updateData: any = {};
    if (body.name) updateData.name = body.name;
    if (body.price) updateData.price = new Prisma.Decimal(body.price);
    if (body.category) updateData.category = body.category;
    if (body.isArchived !== undefined) updateData.isArchived = body.isArchived;
    
    // Map image/photos
    if (body.photos) {
      updateData.photos = body.photos;
    } else if (body.image) {
      updateData.photos = [body.image];
    }

    // Map description to specifications
    if (body.description || body.specifications) {
      updateData.specifications = body.description || body.specifications;
    }

    const product = await retryDatabaseOperation(async () =>
      prisma.product.update({ where: { id }, data: updateData })
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
  try {
    const { isAdmin } = await checkAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { id } = await params;

    await retryDatabaseOperation(async () => prisma.product.delete({ where: { id } }));
    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('Record to delete does not exist')) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
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
