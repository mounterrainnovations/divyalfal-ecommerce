import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { transformDbProductToProduct } from '@/lib/utils/product-utils';

/**
 * Retry database operations with exponential backoff
 * Handles connection issues in serverless environments
 */
async function retryDatabaseOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Check if it's a connection-related error that we should retry
      const isRetryableError =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P1001' || // Can't reach database server
          error.code === 'P1017' || // Server has closed the connection
          error.code === 'P2028'); // Transaction API error

      if (!isRetryableError || attempt === maxRetries) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
      console.log(
        `[API] Database operation failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`,
        error.message
      );
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

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
  try {
    const { id } = await params;
    const data = await req.json();
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
  try {
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
