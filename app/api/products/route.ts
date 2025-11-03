import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import {
  transformDbProductToProduct,
  transformDbProductsToProducts,
  getDbCategory,
} from '@/lib/utils/product-utils';
import type { ProductCategory, ProductType } from '@/types';

export async function GET(request: Request) {
  try {
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
        .filter(Boolean);
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

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const [total, dbProducts] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
    ]);

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
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
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
      name: data.name,
      price: new Prisma.Decimal(data.price),
      specifications: data.specifications || '',
      category: (data.category as ProductType) || 'OTHER',
      photos: data.photos || [],
    };

    const product = await prisma.product.create({ data: productData });

    return NextResponse.json(transformDbProductToProduct(product), { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
