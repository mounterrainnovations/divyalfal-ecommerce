import { CATEGORY_CONFIG } from '@/lib/common/product-interfaces';
import { CATEGORY_MAPPING } from '@/lib/utils/product-utils';
import type { ProductType } from '@/types';

/**
 * The two lists the homepage shows that nobody could edit: the client testimonials, and the
 * six category tiles.
 *
 * WHY THIS EXISTS. Both were arrays declared in source — `components/sections/testimonials.tsx`
 * and `CATEGORY_CONFIG` in `lib/common/product-interfaces.ts`. They are on the public homepage,
 * they are the kind of thing a shop changes without calling a developer (a new client quote, a
 * better photograph for Lehengas), and the portal had no screen for either. This repository is
 * what makes them editable.
 *
 * WHY `SiteSetting` AND NOT NEW TABLES. `SiteSetting` is already a key/value JSON store, it
 * already exists in the production database, and these are two short ordered lists rather than
 * entities anything joins to. Using it means no migration against a live database for a feature
 * that is, in storage terms, two rows.
 *
 * THE SOURCE ARRAYS ARE STILL THE DEFAULTS, AND THAT IS THE SAFETY PROPERTY. A row that is
 * absent, unreadable or malformed reads as the arrays that are live on the site today. So the
 * homepage cannot be emptied by a database that is down, a half-applied migration, or a bad
 * write — the worst case is that the shop keeps showing exactly what it shows now.
 *
 * CATEGORY NAMES ARE NOT EDITABLE, ON PURPOSE. A tile's name is the value the storefront puts
 * in `/products?categories=…`, and `CATEGORY_MAPPING` turns it back into a `ProductType` to
 * query with. Renaming "Lehengas" in an admin field would produce a tile that links to a filter
 * matching nothing, with no error anywhere. So a stored tile may override the picture, the
 * order and whether it shows — never the name, and never which categories exist.
 */

export const TESTIMONIALS_KEY = 'showcase.testimonials';
export const CATEGORY_TILES_KEY = 'showcase.categories';

export interface Testimonial {
  id: string;
  /** The client's name. Blank is allowed — the five seeded quotes are anonymous today. */
  name: string;
  message: string;
  /** A root-relative path or a storage URL. Blank means the card shows no portrait. */
  image: string;
  /** 1–5. Anything outside that is clamped rather than refused. */
  rating: number;
}

export interface CategoryTile {
  /** The display name, and the storefront's filter value. Fixed by `CATEGORY_MAPPING`. */
  name: string;
  /** The enum the name maps to, so a screen can count products without re-deriving it. */
  type: ProductType;
  image: string;
  visible: boolean;
}

/* ------------------------------------------------------------------------------------------ */
/* Defaults — what the site shows today                                                        */
/* ------------------------------------------------------------------------------------------ */

/**
 * The five quotes that have been on the homepage since launch, lifted verbatim out of
 * `components/sections/testimonials.tsx`.
 *
 * The names are empty strings because they are empty in the source today — no client name has
 * ever been published beside these quotes. Inventing five plausible names here would put words
 * in real customers' mouths on a live shop, so they stay blank and the new screen gives the
 * owner the field to fill in.
 */
export const DEFAULT_TESTIMONIALS: Testimonial[] = [
  {
    id: 'seed-1',
    name: '',
    message:
      'Wearing Divyafal by Alpa Rawal was an experience not just a dress, but a story. I felt truly unique and ethereal in my lehenga.',
    image: '/testimonials/1.png',
    rating: 5,
  },
  {
    id: 'seed-2',
    name: '',
    message:
      'Alpa Rawal’s craftsmanship is unmatched. Every stitch reflects artistry, blending structure and elegance into wearable art.',
    image: '/testimonials/2.png',
    rating: 5,
  },
  {
    id: 'seed-3',
    name: '',
    message:
      'Divyafal’ lives up to its name. My outfit felt like a rare treasure timeless, personal, and heirloom-worthy.',
    image: '/testimonials/3.png',
    rating: 5,
  },
  {
    id: 'seed-4',
    name: '',
    message:
      'My Divyafal engagement outfit was pure magic. Alpa captured the emotion perfectly the fit, color, and grace were flawless.',
    image: '/testimonials/4.png',
    rating: 5,
  },
  {
    id: 'seed-5',
    name: '',
    message:
      'Designing with Alpa was a dream. She transformed my vision into a stunning reality with her heartfelt artistry',
    image: '/testimonials/5.png',
    rating: 5,
  },
];

/** The six tiles, in the order the homepage draws them, with the pictures it uses today. */
export const DEFAULT_CATEGORY_TILES: CategoryTile[] = CATEGORY_CONFIG.map(item => ({
  name: item.name,
  type: CATEGORY_MAPPING[item.name as keyof typeof CATEGORY_MAPPING] ?? 'OTHER',
  image: item.image,
  visible: true,
}));

/** The names a stored tile is allowed to be about. Anything else is discarded on read. */
const KNOWN_TILE_NAMES = new Set(DEFAULT_CATEGORY_TILES.map(tile => tile.name));

/* ------------------------------------------------------------------------------------------ */
/* Parsing                                                                                     */
/* ------------------------------------------------------------------------------------------ */

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/**
 * A stored testimonial list, or null when the stored value is not one.
 *
 * Entries without a message are dropped rather than shown: a quote card with no quote is a
 * blank card on the homepage. Everything else is coerced — a missing rating becomes 5, a
 * rating of 9 becomes 5 — because refusing the whole list over one bad number would mean
 * falling back to the seed and silently discarding the owner's other four edits.
 */
export function parseTestimonials(value: unknown): Testimonial[] | null {
  if (!Array.isArray(value)) return null;

  const list: Testimonial[] = [];
  for (const [index, raw] of value.entries()) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Record<string, unknown>;
    const message = text(item.message);
    if (!message) continue;

    const rating = Number(item.rating);
    list.push({
      id: text(item.id) || `t${index}`,
      name: text(item.name),
      message,
      image: text(item.image),
      rating: Number.isFinite(rating) ? Math.min(5, Math.max(1, Math.round(rating))) : 5,
    });
  }
  return list;
}

/**
 * Stored category tiles merged onto the canonical six.
 *
 * The stored value can only ever say three things about a tile it names — its picture, whether
 * it shows, and where it sits. A name it does not recognise is ignored, and a canonical tile
 * the stored list never mentions keeps its default and is appended in its original position.
 * So the set of categories is decided by the enum, now and always.
 */
export function parseCategoryTiles(value: unknown): CategoryTile[] | null {
  if (!Array.isArray(value)) return null;

  const overrides = new Map<string, { image?: string; visible?: boolean }>();
  const order: string[] = [];

  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Record<string, unknown>;
    const name = text(item.name);
    if (!KNOWN_TILE_NAMES.has(name) || overrides.has(name)) continue;

    order.push(name);
    overrides.set(name, {
      image: typeof item.image === 'string' ? item.image.trim() : undefined,
      visible: typeof item.visible === 'boolean' ? item.visible : undefined,
    });
  }

  if (order.length === 0) return null;

  const byName = new Map(DEFAULT_CATEGORY_TILES.map(tile => [tile.name, tile]));
  const tiles: CategoryTile[] = [];

  for (const name of order) {
    const base = byName.get(name);
    if (!base) continue;
    const override = overrides.get(name) ?? {};
    tiles.push({
      ...base,
      image: override.image || base.image,
      visible: override.visible ?? base.visible,
    });
  }

  // Anything the stored order forgot keeps its default, in its default position.
  for (const tile of DEFAULT_CATEGORY_TILES) {
    if (!overrides.has(tile.name)) tiles.push(tile);
  }

  return tiles;
}
