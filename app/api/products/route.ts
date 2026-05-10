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
import { checkAdmin } from '@/lib/auth-utils';

export async function GET(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      console.error('[API] DATABASE_URL is not set');
      return NextResponse.json({ error: 'Database configuration error' }, { status: 500 });
    }
    const { searchParams } = new URL(request.url);

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
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 100);

    const where: Prisma.ProductWhereInput = {
      isArchived: searchParams.get('includeArchived') === 'true' ? undefined : false,
    };

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

    const skip = (page - 1) * limit;
    const [total, dbProducts] = await retryDatabaseOperation(async () =>
      Promise.all([
        prisma.product.count({ where }),
        prisma.product.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: { variants: true },
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
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { isAdmin } = await checkAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const data = await req.json();

    if (!data.name || !data.price) {
      return NextResponse.json({ error: 'Name and price are required' }, { status: 400 });
    }

    const product = await retryDatabaseOperation(async () =>
      prisma.$transaction(async (tx) => {
        const newProduct = await tx.product.create({
          data: {
            id: data.id || crypto.randomUUID(),
            name: data.name,
            price: new Prisma.Decimal(data.price),
            specifications: data.description || data.specifications || '',
            category: (data.category as ProductType) || 'OTHER',
            photos: data.photos || (data.image ? [data.image] : []),
            sale: data.sale || false,
            salePrice: data.salePrice ? new Prisma.Decimal(data.salePrice) : null,
          }
        });
        
        if (data.variants && Array.isArray(data.variants)) {
          await tx.productVariant.createMany({
            data: data.variants.map((v: any) => ({
              productId: newProduct.id,
              size: v.size,
              color: v.color || null,
              stock: v.stock || 0,
            }))
          });
        } else {
          // Default variants if none provided
          const defaultSizes = ['S', 'M', 'L', 'Custom'];
          await tx.productVariant.createMany({
            data: defaultSizes.map(size => ({
              productId: newProduct.id,
              size,
              stock: 10,
            }))
          });
        }
        
        return tx.product.findUnique({
          where: { id: newProduct.id },
          include: { variants: true }
        });
      })
    );

    if (!product) throw new Error('Product creation failed');

    return NextResponse.json(transformDbProductToProduct(product), { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
