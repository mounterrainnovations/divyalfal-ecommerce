import { NextResponse } from 'next/server';
import { transformDbProductsToProducts } from '@/lib/utils/product-utils';
import { retryDatabaseOperation } from '@/lib/utils/database';
import { resolveSectionProducts } from '@/lib/repositories/homepage';

/**
 * GET /api/homepage-sections
 * Returns all homepage section data in a single request.
 *
 * **The response shape is fixed** — `bestSellers`, `freshArrivals`, `exploreCollection`,
 * `shopByStyle`, each an array of frontend products. The storefront reads it and
 * `lib/hooks/useHomepageSections` parses it, so all four keys stay even though two of them have
 * no consumer today: dropping an unused key is a breaking change nobody would notice until the
 * homepage rendered its placeholder tier.
 *
 * What changed: each array now comes from `resolveSectionProducts`, so a hand-picked
 * `HomepageSection.productIds` list wins over the automatic query. With no curation — the state
 * of every section until the client picks something — the automatic queries are the same ones
 * this route has always run, so the response is byte-identical to before.
 *
 * The movement-to-key mapping: `collection` feeds `freshArrivals` and `exploreCollection` (one
 * movement, and today both arrays ran the same "4 newest" query), `shopByStyle` feeds
 * `shopByStyle`, and `bestSellers` keeps its own price-banded query under its own key.
 *
 * `HomepageSection.visible` is deliberately **not** applied here. The storefront decides whether
 * to render a movement, and an empty array makes it render its placeholder tier — so honouring
 * `visible` at this layer would replace a hidden section with fake garments rather than nothing.
 * The flag is served by `GET /api/admin/homepage` and belongs to the storefront flip.
 */
export async function GET() {
  try {
    // Check database connection
    if (!process.env.DATABASE_URL) {
      console.error('[API] DATABASE_URL is not set');
      return NextResponse.json({ error: 'Database configuration error' }, { status: 500 });
    }

    const [bestSellers, collection, shopByStyle] = await retryDatabaseOperation(async () =>
      Promise.all([
        resolveSectionProducts('bestSellers'),
        resolveSectionProducts('collection'),
        resolveSectionProducts('shopByStyle'),
      ])
    );

    const collectionProducts = transformDbProductsToProducts(collection);

    return NextResponse.json({
      bestSellers: transformDbProductsToProducts(bestSellers),
      freshArrivals: collectionProducts,
      exploreCollection: collectionProducts,
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
