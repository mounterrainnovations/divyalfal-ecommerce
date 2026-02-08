import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { transformDbProductsToProducts } from '@/lib/utils/product-utils';
import { retryDatabaseOperation } from '@/lib/utils/database';

/**
 * GET /api/homepage-sections
 * Returns all homepage section data in a single request
 */
export async function GET() {
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
