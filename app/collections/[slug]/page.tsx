import { cache } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { notFound } from 'next/navigation';
import ProductCard from '@/components/features/products/product-card';
import Footer from '@/components/layout/footer';
import {
  CONTAINER,
  HEADING,
  HEADING_GAP,
  SECTION,
  SIZES,
} from '@/components/sections/section-shell';
import { prisma } from '@/lib/db';
import { readCollectionBySlug, type Collection } from '@/lib/repositories/collections';
import { transformDbProductsToProducts } from '@/lib/utils/product-utils';
import { cn } from '@/lib/utils';
import type { DbProduct, Product } from '@/types';

/**
 * One collection's page: what the homepage strip clicks through to.
 *
 * This is the second half of the change the owner asked for — the strip shows the collections,
 * and this is where the garments inside one are. It is a server component because a collection
 * is a `SiteSetting` row plus a product query, and both belong on the server: the alternative
 * is two client fetches and a page that is blank until they land.
 *
 * ORDER IS THE CURATION. `productIds` is an ordered list the owner arranged in the portal, and
 * `WHERE id IN (...)` returns rows in whatever order Postgres likes, so the result is sorted
 * back into the stored order below. A collection whose first garment is not the one the owner
 * put first is not the collection they curated.
 *
 * A MISSING GARMENT IS NORMAL, NOT CORRUPTION. `productIds` is JSON and not a foreign key (see
 * `lib/content/collections.ts` for why there is no `Collection` table), so a garment can be
 * deleted out from under a collection. It is simply absent from the query's rows and therefore
 * from this page; the portal shows the owner how many have gone that way.
 */

export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

interface Found {
  collection: Collection;
  products: Product[];
}

/*
 * Wrapped in `cache` because Next calls `generateMetadata` and the component for the same
 * request, and this does two database reads. `fetch` is deduplicated for us; a Prisma call is
 * not, so without this every collection page runs its `SiteSetting` read and its product query
 * twice. (`app/product/[id]/page.tsx` has the same shape and pays that cost; this is the one
 * place it was cheap to not repeat.)
 */
const getCollection = cache(async (slug: string): Promise<Found | null> => {
  try {
    const collection = await readCollectionBySlug(slug);
    if (!collection) return null;

    /*
     * A HIDDEN COLLECTION KEEPS ITS PAGE, which is the same rule the category tiles follow:
     * hiding is about the homepage strip, not about withdrawing a URL. A shop that has put a
     * collection's link in an Instagram bio should be able to take the tile off the front page
     * without breaking that link, and nothing here is private — it is a list of garments that
     * are all in the public catalogue anyway.
     */

    if (collection.productIds.length === 0) return { collection, products: [] };

    const rows = await prisma.product.findMany({
      where: { id: { in: collection.productIds } },
    });

    // Back into the order the owner arranged. The map is built once rather than calling
    // `find` per id, which matters for a collection of any size.
    const byId = new Map(rows.map(row => [row.id, row]));
    const ordered: DbProduct[] = [];
    for (const id of collection.productIds) {
      const row = byId.get(id);
      // Absent because the garment was deleted after the collection named it. Normal; see above.
      if (row) ordered.push(row);
    }

    return { collection, products: transformDbProductsToProducts(ordered) };
  } catch (error) {
    /*
     * Null for a failure as well as for an unknown slug, which makes this page a 404 when the
     * database is unreachable. It is the behaviour `app/product/[id]/page.tsx` already has,
     * and conflating the two is the lesser evil here: the alternative is a 500 page on a
     * storefront route, and a visitor can do nothing with either but try again.
     */
    console.error('[collections] could not read the collection:', error);
    return null;
  }
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await getCollection(slug);

  if (!found) return { title: 'Collection Not Found' };

  const { collection, products } = found;
  return {
    title: `${collection.name} - Divyafal`,
    // The owner's own words where they wrote them. Where they did not, a plain statement of
    // what the page holds rather than a sentence of marketing copy invented on their behalf.
    description:
      collection.blurb ||
      `${products.length} ${products.length === 1 ? 'piece' : 'pieces'} from the ${collection.name} collection by Divyafal.`,
  };
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await getCollection(slug);

  if (!found) {
    notFound();
  }

  const { collection, products } = found;

  return (
    <>
      <section className={SECTION}>
        <div className={CONTAINER}>
          <nav className="mb-6 sm:mb-8">
            <ol className="flex flex-wrap items-center gap-2 font-serif text-xs text-gray-600 sm:text-sm md:text-base">
              <li>
                <Link href="/" className="transition hover:text-black">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight className="h-4 w-4" />
              </li>
              <li>
                <Link href="/products" className="transition hover:text-black">
                  All Product
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight className="h-4 w-4" />
              </li>
              <li className="font-medium text-black">{collection.name}</li>
            </ol>
          </nav>

          <div
            className={cn(
              HEADING_GAP,
              'grid items-center gap-8 md:gap-12',
              // The photograph only earns half the page when there is one. Without it the
              // heading and the blurb take the measure they would have had anyway, rather
              // than sitting in a column beside an empty frame.
              collection.image ? 'md:grid-cols-2' : 'md:grid-cols-1'
            )}
          >
            {collection.image ? (
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-gray-100 sm:aspect-[3/4] md:aspect-[4/5]">
                <Image
                  src={collection.image}
                  alt={collection.name}
                  fill
                  sizes={SIZES.half}
                  priority
                  className="object-cover"
                />
              </div>
            ) : null}

            <div className="min-w-0">
              <h1 className={HEADING}>{collection.name}</h1>
              {collection.blurb ? (
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-gray-600 sm:text-base">
                  {collection.blurb}
                </p>
              ) : null}
              <p className="mt-4 text-xs text-gray-500 sm:text-sm">
                {products.length === 0
                  ? 'No pieces in this collection yet.'
                  : `${products.length} ${products.length === 1 ? 'piece' : 'pieces'}`}
              </p>
            </div>
          </div>

          {products.length === 0 ? (
            /*
             * An empty collection is a real state — the owner has made one and not yet picked
             * its garments, or every garment in it has since been deleted — and the honest
             * thing is to say so and offer the way out. Filling the grid with "you may also
             * like" stock would be the site pretending this collection has contents.
             */
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-6 py-12 text-center">
              <p className="text-sm text-gray-600 sm:text-base">
                This collection has no pieces in it yet.
              </p>
              <Link
                href="/products"
                className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-full border border-gray-900 px-6 py-2.5 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-900 hover:text-white"
              >
                Browse everything
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  // The first row is above the fold on every width this grid has.
                  priority={index < 4}
                />
              ))}
            </div>
          )}
        </div>
      </section>
      <Footer />
    </>
  );
}
