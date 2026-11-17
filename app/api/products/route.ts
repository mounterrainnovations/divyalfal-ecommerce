import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import {
  transformDbProductToProduct,
  transformDbProductsToProducts,
  getDbCategory,
} from '@/lib/utils/product-utils';
import type { ProductCategory, ProductType } from '@/types';
import { retryDatabaseOperation } from '@/lib/utils/database';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth-guard';

export async function GET(request: Request) {
  try {
    // Check database connection
    if (!process.env.DATABASE_URL) {
      console.error('[API] DATABASE_URL is not set');
      return NextResponse.json({ error: 'Database configuration error' }, { status: 500 });
    }
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
  // Admin-only write. First statement, outside the try/catch so a refusal is never rewritten.
  try {
    await requireAdmin(req);
  } catch {
    return unauthorizedResponse();
  }

  try {
    const data = await req.json();

    // Validate required fields
    if (!data.name || !data.price) {
      return NextResponse.json({ error: 'Name and price are required' }, { status: 400 });
    }

    // Transform data to match Prisma schema.
    //
    // `sale` and `salePrice` are written here as well as in PATCH. They used to be dropped on
    // create — the admin form has always sent them, so a product added as on-sale came back
    // at full price and had to be saved a second time before the discount existed. The rule is
    // the form's own: a sale price only means anything while the sale is on, so it is stored
    // only then and cleared otherwise rather than left to linger behind a false flag.
    const sale = data.sale === true;
    const hasSalePrice = sale && data.salePrice !== null && data.salePrice !== undefined && data.salePrice !== '';

    const productData = {
      id: data.id || crypto.randomUUID(),
      name: data.name,
      price: new Prisma.Decimal(data.price),
      sale,
      salePrice: hasSalePrice ? new Prisma.Decimal(data.salePrice) : null,
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
