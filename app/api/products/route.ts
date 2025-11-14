import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import {
  transformDbProductToProduct,
  transformDbProductsToProducts,
  getDbCategory,
} from '@/lib/utils/product-utils';
import type { ProductCategory, ProductType } from '@/types';

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

export async function GET(request: Request) {
  console.log('[API] GET /api/products - Request started');
  try {
    // Check database connection
    if (!process.env.DATABASE_URL) {
      console.error('[API] DATABASE_URL is not set');
      return NextResponse.json({ error: 'Database configuration error' }, { status: 500 });
    }
    console.log('[API] Database URL check passed');

    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const search = searchParams.get('search') || undefined;
    const categories = searchParams.get('categories')?.split(',').filter(Boolean) || [];
    const minPrice = searchParams.get('minPrice')
      ? Number(searchParams.get('minPrice'))
      : undefined;
    const maxPrice = searchParams.get('maxPrice')
      ? Number(searchParams.get('maxPrice'))
      : undefined;
    const sortBy = searchParams.get('sortBy') || 'newest';
    const order = (searchParams.get('order') as 'asc' | 'desc') || 'desc';
    const page = Number(searchParams.get('page')) || 1;
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 100); // Cap at 100

    // Build where clause
    const where: Prisma.ProductWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { specifications: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categories.length > 0) {
      const dbCategories: ProductType[] = categories
        .map(cat => cat as ProductCategory)
        .map(getDbCategory)
        .filter(Boolean) as ProductType[];
      if (dbCategories.length > 0) {
        where.category = { in: dbCategories };
      }
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = new Prisma.Decimal(minPrice);
      if (maxPrice !== undefined) where.price.lte = new Prisma.Decimal(maxPrice);
    }

    // Build orderBy clause
    const orderBy: Prisma.ProductOrderByWithRelationInput = {};
    switch (sortBy) {
      case 'price-low':
        orderBy.price = 'asc';
        break;
      case 'price-high':
        orderBy.price = 'desc';
        break;
      case 'name':
        orderBy.name = order;
        break;
      case 'newest':
      default:
        orderBy.createdAt = 'desc';
        break;
    }

    // Execute query with pagination and retry mechanism
    const skip = (page - 1) * limit;
    const [total, dbProducts] = await retryDatabaseOperation(async () =>
      Promise.all([
        prisma.product.count({ where }),
        prisma.product.findMany({
          where,
          orderBy,
          skip,
          take: limit,
        }),
      ])
    );

    const products = transformDbProductsToProducts(dbProducts);
    const totalPages = Math.ceil(total / limit);

    console.log(`[API] Successfully fetched ${products.length} products, total: ${total}`);
    return NextResponse.json({
      products,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    console.error('[API] Error fetching products:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    return NextResponse.json(
      {
        error: 'Failed to fetch products',
        ...(process.env.NODE_ENV === 'development' && {
          message: errorMessage,
          stack: errorStack,
        }),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();

    // Validate required fields
    if (!data.name || !data.price) {
      return NextResponse.json({ error: 'Name and price are required' }, { status: 400 });
    }

    // Transform data to match Prisma schema
    const productData = {
      id: data.id || crypto.randomUUID(),
      name: data.name,
      price: new Prisma.Decimal(data.price),
      specifications: data.specifications || '',
      category: (data.category as ProductType) || 'OTHER',
      photos: data.photos || [],
    };

    const product = await retryDatabaseOperation(async () =>
      prisma.product.create({ data: productData })
    );

    return NextResponse.json(transformDbProductToProduct(product), { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
