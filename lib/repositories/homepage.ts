import { Prisma, type HomepageSection, type Product } from '@prisma/client';
import { revalidateTag } from 'next/cache';
import { prisma } from '@/lib/db';
import { contentTag } from '@/lib/repositories/content';

/**
 * Homepage curation.
 *
 * A `HomepageSection` row holds the order the movement sits in, whether it is shown, and an
 * optional hand-picked `productIds` list. Empty `productIds` means "as it is today": the
 * automatic query the public route has always run. So curation is strictly additive -- an
 * un-curated section behaves exactly as it did before this table existed.
 *
 * `Product` is read here and never written.
 */

export const HOMEPAGE_TAG = 'homepage-sections';

export interface SectionInput {
  key: string;
  order: number;
  visible: boolean;
  productIds: string[];
}

/** Every section in display order. */
export async function getSections(): Promise<HomepageSection[]> {
  return prisma.homepageSection.findMany({ orderBy: { order: 'asc' } });
}

/**
 * Save order, visibility and curation for the sections named, in one transaction.
 *
 * Only sections that already exist are written: the seven movements are defined by the seed,
 * not by whatever the client's browser happens to POST, so an unknown key is reported back
 * rather than silently creating an eighth movement nothing renders.
 */
export async function saveSections(
  input: SectionInput[]
): Promise<{ saved: string[]; unknown: string[]; revalidated: boolean }> {
  const keys = input.map(section => section.key);
  const existing = new Set(
    (
      await prisma.homepageSection.findMany({ where: { key: { in: keys } }, select: { key: true } })
    ).map(section => section.key)
  );

  const known = input.filter(section => existing.has(section.key));
  const unknown = keys.filter(key => !existing.has(key));

  if (known.length > 0) {
    await prisma.$transaction(
      known.map(section =>
        prisma.homepageSection.update({
          where: { key: section.key },
          data: {
            order: section.order,
            visible: section.visible,
            productIds: section.productIds,
          },
        })
      )
    );
  }

  // Written and committed. A failed cache drop is reported, never thrown.
  let revalidated = true;
  for (const tag of [HOMEPAGE_TAG, contentTag('home')]) {
    try {
      // See `lib/repositories/content.ts`: Next 16 requires a cache-life profile, and 'max'
      // is the one that cannot expire before the caches it invalidates.
      revalidateTag(tag, 'max');
    } catch (error) {
      revalidated = false;
      console.error(`[homepage] revalidateTag(${tag}) failed`, error);
    }
  }

  return { saved: known.map(section => section.key), unknown, revalidated };
}

// ---------------------------------------------------------------------------------------------
// The automatic queries: exactly what `/api/homepage-sections` has always run.
// ---------------------------------------------------------------------------------------------

const AUTOMATIC: Record<string, () => Promise<Product[]>> = {
  /** 4 items priced between the stored bounds, newest first. */
  bestSellers: () =>
    prisma.product.findMany({
      where: {
        price: { gte: new Prisma.Decimal(5000), lte: new Prisma.Decimal(10000) },
      },
      orderBy: { createdAt: 'desc' },
      take: 4,
    }),

  /** The collection movement: the 4 latest items. */
  collection: () => prisma.product.findMany({ orderBy: { createdAt: 'desc' }, take: 4 }),

  /** One item per category, newest in each. */
  shopByStyle: async () => {
    const categories = [
      'SAREE',
      'INDO_WESTERN',
      'LEHENGA',
      'SUIT',
      'KURTA_PANT',
      'WESTERN',
    ] as const;
    const found = await Promise.all(
      categories.map(category =>
        prisma.product.findFirst({ where: { category }, orderBy: { createdAt: 'desc' } })
      )
    );
    return found.filter((product): product is Product => product !== null);
  },
};

/** The movements that carry no products at all: copy-only sections. */
const COPY_ONLY = new Set(['hero', 'categories', 'atelier', 'inHerWords', 'close']);

/**
 * The products a section should show.
 *
 * Hand-picked `productIds` win, **in their stored order**, with any id whose product has since
 * been deleted dropped in silence -- a stale id is the normal consequence of deleting a garment
 * and must not blank the movement or fail the request. An empty `productIds` falls through to
 * the automatic query, which is the behaviour the site has today.
 */
export async function resolveSectionProducts(key: string): Promise<Product[]> {
  // Reading the curation must never be able to break the storefront. The CMS migration has not
  // been applied to production yet, so until it is this read fails with "relation does not
  // exist" -- and a homepage that loses its product rails because a *curation* table is missing
  // would be a worse bug than no curation at all. Any failure here falls through to the
  // automatic query, which is what the site served before this table existed.
  let section: HomepageSection | null = null;
  try {
    section = await prisma.homepageSection.findUnique({ where: { key } });
  } catch (error) {
    console.error(`[homepage] could not read curation for "${key}"; using the automatic query`, error);
  }

  if (section && section.productIds.length > 0) {
    const products = await prisma.product.findMany({ where: { id: { in: section.productIds } } });
    const byId = new Map(products.map(product => [product.id, product]));
    return section.productIds
      .map(id => byId.get(id))
      .filter((product): product is Product => product !== undefined);
  }

  if (COPY_ONLY.has(key)) return [];
  return AUTOMATIC[key] ? AUTOMATIC[key]() : [];
}
