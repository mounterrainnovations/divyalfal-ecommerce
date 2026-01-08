import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { transformDbProductsToProducts } from '@/lib/utils/product-utils';

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

/**
 * GET /api/homepage-sections
 * Returns all homepage section data in a single request
 */
export async function GET() {
  console.log('[API] GET /api/homepage-sections - Request started');
  try {
    // Check database connection
    if (!process.env.DATABASE_URL) {
      console.error('[API] DATABASE_URL is not set');
      return NextResponse.json({ error: 'Database configuration error' }, { status: 500 });
    }

    const [bestSellers, freshArrivals, exploreCollection, shopByStyle] =
      await retryDatabaseOperation(async () =>
        Promise.all([
          // Best Sellers: 4 items priced between ₹10,000 - ₹20,000
          prisma.product.findMany({
            where: {
              price: {
                gte: new Prisma.Decimal(5000),
                lte: new Prisma.Decimal(10000),
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 4,
          }),

          // Fresh Arrivals: 4 latest items
          prisma.product.findMany({
            orderBy: {
              createdAt: 'desc',
            },
            take: 4,
          }),

          // Explore Collection: 4 items (any category)
          prisma.product.findMany({
            orderBy: {
              createdAt: 'desc',
            },
            take: 4,
          }),

          // Shop by Style: 1 item per category
          Promise.all([
            prisma.product.findFirst({
              where: { category: 'SAREE' },
              orderBy: { createdAt: 'desc' },
            }),
            prisma.product.findFirst({
              where: { category: 'INDO_WESTERN' },
              orderBy: { createdAt: 'desc' },
            }),
            prisma.product.findFirst({
              where: { category: 'LEHENGA' },
              orderBy: { createdAt: 'desc' },
            }),
            prisma.product.findFirst({
              where: { category: 'SUIT' },
              orderBy: { createdAt: 'desc' },
            }),
            prisma.product.findFirst({
              where: { category: 'KURTA_PANT' },
              orderBy: { createdAt: 'desc' },
            }),
            prisma.product.findFirst({
              where: { category: 'WESTERN' },
              orderBy: { createdAt: 'desc' },
            }),
          ]).then(results =>
            results.filter((item): item is NonNullable<typeof item> => item !== null)
          ),
        ])
      );

    console.log(
      `[API] Successfully fetched homepage sections - Best Sellers: ${bestSellers.length}, Fresh Arrivals: ${freshArrivals.length}, Explore: ${exploreCollection.length}, Shop by Style: ${shopByStyle.length}`
    );

    return NextResponse.json({
      bestSellers: transformDbProductsToProducts(bestSellers),
      freshArrivals: transformDbProductsToProducts(freshArrivals),
      exploreCollection: transformDbProductsToProducts(exploreCollection),
      shopByStyle: transformDbProductsToProducts(shopByStyle),
    });
  } catch (error) {
    console.error('[API] Error fetching homepage sections:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    return NextResponse.json(
      {
        error: 'Failed to fetch homepage sections',
        ...(process.env.NODE_ENV === 'development' && {
          message: errorMessage,
          stack: errorStack,
        }),
      },
      { status: 500 }
    );
  }
}
