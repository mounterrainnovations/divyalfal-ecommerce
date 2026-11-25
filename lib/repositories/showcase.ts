import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import {
  CATEGORY_TILES_KEY,
  DEFAULT_CATEGORY_TILES,
  DEFAULT_TESTIMONIALS,
  TESTIMONIALS_KEY,
  parseCategoryTiles,
  parseTestimonials,
  type CategoryTile,
  type Testimonial,
} from '@/lib/content/showcase';

/**
 * The database half of the two homepage lists.
 *
 * WHY THE SPLIT. The defaults, the types and the parsers are pure and are imported by client
 * components on the public site (see `lib/hooks/useShowcase.ts`), so they live in
 * `lib/content/showcase.ts` — a module with no `@prisma/client` import. Everything that talks
 * to the database lives here. Without the split, importing a default into a `'use client'`
 * component would pull the Prisma client into the browser bundle.
 */

export type { CategoryTile, Testimonial };
export {
  CATEGORY_TILES_KEY,
  DEFAULT_CATEGORY_TILES,
  DEFAULT_TESTIMONIALS,
  TESTIMONIALS_KEY,
  parseCategoryTiles,
  parseTestimonials,
};

/* ------------------------------------------------------------------------------------------ */
/* Reads and writes                                                                            */
/* ------------------------------------------------------------------------------------------ */

async function readRow(key: string): Promise<Prisma.JsonValue | null> {
  const row = await prisma.siteSetting.findUnique({ where: { key } });
  return row ? row.value : null;
}

/** Every testimonial on the homepage. Falls back to the seeded five. */
export async function readTestimonials(): Promise<Testimonial[]> {
  const parsed = parseTestimonials(await readRow(TESTIMONIALS_KEY));
  return parsed ?? DEFAULT_TESTIMONIALS;
}

/** Every category tile, canonical six merged with whatever has been stored. */
export async function readCategoryTiles(): Promise<CategoryTile[]> {
  const parsed = parseCategoryTiles(await readRow(CATEGORY_TILES_KEY));
  return parsed ?? DEFAULT_CATEGORY_TILES;
}

/**
 * Replace the testimonial list wholesale.
 *
 * Wholesale rather than per-row because the list is ordered and short: the screen sends what
 * the owner sees, and there is no merge to get wrong. The value is re-parsed before it is
 * stored, so nothing malformed can reach the column even if a caller skipped validation.
 */
export async function saveTestimonials(value: unknown): Promise<Testimonial[]> {
  const list = parseTestimonials(value);
  if (!list) throw new TypeError('Expected an array of testimonials');

  await prisma.siteSetting.upsert({
    where: { key: TESTIMONIALS_KEY },
    create: { key: TESTIMONIALS_KEY, value: list as unknown as Prisma.InputJsonValue },
    update: { value: list as unknown as Prisma.InputJsonValue },
  });
  return list;
}

/** Replace the category tiles. Only picture, visibility and order survive the round trip. */
export async function saveCategoryTiles(value: unknown): Promise<CategoryTile[]> {
  const tiles = parseCategoryTiles(value);
  if (!tiles) throw new TypeError('Expected an array of category tiles');

  // Stored lean: the name is the key, and the rest is re-derived from the enum on read. A
  // stored `type` would be a second copy of a fact `CATEGORY_MAPPING` already owns.
  const stored = tiles.map(tile => ({
    name: tile.name,
    image: tile.image,
    visible: tile.visible,
  }));

  await prisma.siteSetting.upsert({
    where: { key: CATEGORY_TILES_KEY },
    create: { key: CATEGORY_TILES_KEY, value: stored as unknown as Prisma.InputJsonValue },
    update: { value: stored as unknown as Prisma.InputJsonValue },
  });
  return tiles;
}
