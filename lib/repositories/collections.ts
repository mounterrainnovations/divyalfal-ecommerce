import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import {
  COLLECTIONS_KEY,
  DEFAULT_COLLECTIONS,
  parseCollections,
  slugify,
  visibleCollections,
  type Collection,
} from '@/lib/content/collections';

/**
 * The database half of the collections list.
 *
 * WHY THE SPLIT. Same as `lib/repositories/showcase.ts`: the types, the defaults and the
 * parser are pure and are imported by a client hook on the public homepage, so they live in
 * `lib/content/collections.ts` — a module with no `@prisma/client` import. Everything that
 * touches the database is here.
 *
 * The whole list is one `SiteSetting` row under `showcase.collections`. There is no
 * `Collection` table, and adding one would mean a migration against a live production
 * database for a single ordered list; the trade-off and its consequences are argued in the
 * pure module.
 */

export type { Collection };
export { COLLECTIONS_KEY, DEFAULT_COLLECTIONS, parseCollections, slugify, visibleCollections };

/* ------------------------------------------------------------------------------------------ */
/* Reads and writes                                                                            */
/* ------------------------------------------------------------------------------------------ */

/**
 * Every collection the owner has saved, in order.
 *
 * An absent row, an unreadable one and a malformed one all read as `DEFAULT_COLLECTIONS`,
 * which is empty — the state the shop is in today. So "there are no collections" is the
 * answer to both "none have been made" and "the row could not be understood", and every
 * caller already has to handle the first.
 */
export async function readCollections(): Promise<Collection[]> {
  const row = await prisma.siteSetting.findUnique({ where: { key: COLLECTIONS_KEY } });
  const parsed = parseCollections(row ? row.value : null);
  return parsed ?? DEFAULT_COLLECTIONS;
}

/** One collection by its public slug, or null. The lookup behind `/collections/[slug]`. */
export async function readCollectionBySlug(slug: string): Promise<Collection | null> {
  const wanted = slugify(slug);
  if (!wanted) return null;
  const collections = await readCollections();
  return collections.find(collection => collection.slug === wanted) ?? null;
}

/**
 * Replace the collection list wholesale.
 *
 * Wholesale rather than per-collection because the list is ordered and short: the screen sends
 * what the owner is looking at and the row is replaced, so there is no merge to get wrong and
 * no way to leave half a list written. The value is re-parsed before it is stored — the same
 * function the readers use — so nothing malformed can reach the column even if a caller
 * skipped validation, and the slugs in the column are already unique and already URL-safe.
 *
 * An empty array is a legitimate save: it means the owner deleted their last collection, and
 * the homepage goes back to the product strip it showed before any of this existed.
 */
export async function saveCollections(value: unknown): Promise<Collection[]> {
  const list = parseCollections(value);
  if (!list) throw new TypeError('Expected an array of collections');

  await prisma.siteSetting.upsert({
    where: { key: COLLECTIONS_KEY },
    create: { key: COLLECTIONS_KEY, value: list as unknown as Prisma.InputJsonValue },
    update: { value: list as unknown as Prisma.InputJsonValue },
  });
  return list;
}
