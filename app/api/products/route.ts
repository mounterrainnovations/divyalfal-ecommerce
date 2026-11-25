import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { transformDbProductToProduct, getDbCategory } from '@/lib/utils/product-utils';
import type { ProductCategory, ProductType } from '@/types';
import { retryDatabaseOperation } from '@/lib/utils/database';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth-guard';
import { archivedWhere, productTypeFromParam } from './filters';

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
    // The admin catalogue's two filters. Both are optional and both parse in `./filters.ts`,
    // where the defaults — live products only, no category constraint — are stated once and
    // tested, because this endpoint answers the public storefront as well as the portal.
    const singleCategory = productTypeFromParam(searchParams.get('category'));
    const archived = archivedWhere(searchParams.get('archived'));
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

    // Build where clause.
    //
    // `archived` is spread first and is `{}` for `?archived=all`, so "everything" is the
    // absence of a constraint rather than a second code path. With no parameter it is
    // `{ isArchived: false }` — see the note on `archivedMode`: the storefront must never be
    // handed a garment the shop has taken down.
    const where: Prisma.ProductWhereInput = { ...archived };

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

    // The singular `?category=` *narrows* whatever the plural parameter already set rather
    // than replacing it. Assigning `where.category` twice would silently discard the
    // storefront's multi-category filter if a caller ever sent both, and a filter that quietly
    // widens its own result is the kind of bug nobody reports because the page still looks
    // fine. Nothing sends both today; this is so nothing has to remember not to.
    if (singleCategory) {
      const alreadyNarrowed = categories.length > 0 && where.category !== undefined;
      const allowed = alreadyNarrowed
        ? (where.category as { in: ProductType[] }).in.filter(type => type === singleCategory)
        : [singleCategory];
      where.category = { in: allowed };
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

    /*
     * `isArchived` travels beside the transformed product rather than inside it.
     *
     * The shared `Product` shape lives in `types/index.ts` and the transform in
     * `lib/utils/product-utils.ts`; neither is this change's to edit, and the admin catalogue
     * still has to know which rows are archived in order to badge them and offer Restore. An
     * added field is additive for the storefront, which reads the fields it knows by name and
     * has never seen this one — and it is the truth about the row either way.
     */
    const products = dbProducts.map(row => ({
      ...transformDbProductToProduct(row),
      isArchived: row.isArchived,
    }));
    const totalPages = Math.ceil(total / limit);

    /*
     * `?counts=1` adds how the *unfiltered-by-archive* catalogue splits — live against
     * archived, under the same search and category — so the admin header can say "8 of 15
     * products · 6 archived not shown" instead of leaving an admin to wonder where the rest
     * of the catalogue went.
     *
     * BEHIND A PARAMETER ON PURPOSE. This is the storefront's listing endpoint and it is hit
     * on every filter change there; two counts nobody asked for are a cost paid on the public
     * path for a header only the portal draws.
     *
     * Each count spreads `where` and then states `isArchived` itself, which overrides whatever
     * the archive filter put there — so the split is measured across both halves while the
     * search and category still apply, whichever half is being listed. A failure here is not
     * fatal: the list is the screen's job, and a missing count costs it one clause.
     */
    let counts: { live: number; archived: number } | undefined;
    if (searchParams.get('counts') === '1') {
      try {
        const [live, archivedCount] = await Promise.all([
          prisma.product.count({ where: { ...where, isArchived: false } }),
          prisma.product.count({ where: { ...where, isArchived: true } }),
        ]);
        counts = { live, archived: archivedCount };
      } catch (error) {
        console.error('[API] GET /api/products could not count the archive split:', error);
      }
    }

    return NextResponse.json({
      products,
      total,
      page,
      limit,
      totalPages,
      ...(counts ? { counts } : {}),
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
