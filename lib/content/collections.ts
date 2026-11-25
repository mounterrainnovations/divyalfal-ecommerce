/**
 * Collections: curated groups of garments, with a page of their own.
 *
 * WHY THIS EXISTS. The homepage has a section called "Explore our collection" which showed
 * four individual dresses. The owner's complaint was that the word "collection" promises a
 * *grouping* and the strip delivered garments — the category strip two sections down already
 * does the right thing, so the fix is to make this one behave the same way: show what the
 * collections are, and let a click open the garments inside one.
 *
 * A collection is therefore a name, a photograph, a sentence, and a hand-picked ordered list
 * of product ids. Nothing is computed from the catalogue: "Bridal" is not a query, it is a
 * choice the shop makes about which eleven garments belong together.
 *
 * WHY `SiteSetting` AND NOT A `Collection` TABLE. The same reason `lib/content/showcase.ts`
 * gives: `SiteSetting` is already a key/value JSON store in the production database, and this
 * is one short ordered list rather than an entity anything joins to. The alternative is a
 * migration against a live database for what is, in storage terms, a single row. The cost of
 * the choice is that the product ids here are not foreign keys — nothing stops a collection
 * from naming a garment that has since been deleted — so every reader of `productIds` has to
 * treat a missing product as normal rather than as corruption. Both of them do.
 *
 * WHY THIS FILE HAS NO PRISMA IMPORT. It is imported by `lib/hooks/useCollections.ts`, which
 * is a client hook on the public homepage. The database half lives in
 * `lib/repositories/collections.ts`. Without the split, importing `DEFAULT_COLLECTIONS` into a
 * `'use client'` component would pull the Prisma client into the browser bundle.
 */

export const COLLECTIONS_KEY = 'showcase.collections';

export interface Collection {
  /** Stable across renames and reorders; the admin screen's React key and patch handle. */
  id: string;
  /** The public URL segment: `/collections/<slug>`. Always URL-safe, always unique. */
  slug: string;
  name: string;
  /** One or two sentences under the heading on the collection's page. Blank is allowed. */
  blurb: string;
  /** A root-relative path or a storage URL. Blank means the tile shows no photograph. */
  image: string;
  /** Hand-picked garments, in the order the collection's page lists them. */
  productIds: string[];
  /** Whether the homepage strip offers it. A hidden collection keeps its page. */
  visible: boolean;
}

/* ------------------------------------------------------------------------------------------ */
/* Defaults — deliberately nothing                                                             */
/* ------------------------------------------------------------------------------------------ */

/**
 * There are no default collections, and that is not an oversight.
 *
 * Every other list in this module's sibling (`showcase.ts`) defaults to what is already live on
 * the site, because there *was* something live to default to. Collections are new: the shop has
 * never published one, so there is no "Bridal" with a real photograph and a real set of
 * garments to fall back to. Shipping three invented collections with marketing copy and stock
 * photography would put words and pictures on a real couture shop's homepage that its owner
 * never wrote and never chose.
 *
 * So an empty list is the honest default, and the two readers are built around it:
 *  - the admin screen says there are none yet and offers the button to add one;
 *  - `components/sections/explore.tsx` keeps the product strip it has shown all along, so the
 *    live homepage loses nothing on the deploy and gains the collection strip the moment the
 *    first collection is saved.
 */
export const DEFAULT_COLLECTIONS: Collection[] = [];

/* ------------------------------------------------------------------------------------------ */
/* Slugs                                                                                       */
/* ------------------------------------------------------------------------------------------ */

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/**
 * A name turned into a URL segment: lowercase, ASCII, hyphen-separated.
 *
 * The decomposition-and-strip pass is what makes "Chikankārī" into `chikankari` rather than
 * dropping the accented letter, which matters for a shop whose garment names are transliterated
 * Hindi. A name with no Latin letters at all (Devanagari, say) legitimately reduces to an empty
 * string; that is the caller's problem to solve, not something to paper over here, because only
 * the caller knows what the other slugs are and what it can safely fall back to.
 */
export function slugify(value: string): string {
  return (
    value
      .normalize('NFKD')
      // Combining marks left behind by the decomposition above.
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64)
  );
}

/**
 * `candidate`, or the first `candidate-2`, `candidate-3`, … that `taken` does not already hold.
 *
 * WHY SUFFIX RATHER THAN REFUSE. Two collections called "Festive" is a thing an owner will do,
 * and the parser's job is to keep the list usable rather than to reject it: dropping the second
 * one would make a collection the owner can see on the admin screen vanish from the public site
 * with no explanation. The first occurrence keeps the bare slug, so adding a second "Festive"
 * cannot change the URL of the first — a published link stays published.
 */
function unique(candidate: string, taken: Set<string>): string {
  if (!taken.has(candidate)) {
    taken.add(candidate);
    return candidate;
  }
  for (let suffix = 2; ; suffix += 1) {
    const next = `${candidate}-${suffix}`;
    if (!taken.has(next)) {
      taken.add(next);
      return next;
    }
  }
}

/* ------------------------------------------------------------------------------------------ */
/* Parsing                                                                                     */
/* ------------------------------------------------------------------------------------------ */

/** Product ids, cleaned: strings only, blanks gone, each garment at most once. */
function parseProductIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const ids: string[] = [];
  const seen = new Set<string>();
  for (const raw of value) {
    const id = text(raw);
    // The same garment twice would render twice on the collection's page, which reads as a
    // bug in the shop rather than as a curation choice.
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

/**
 * A stored collection list, or null when the stored value is not a list at all.
 *
 * The shape of the defensiveness is `parseTestimonials`': refuse the value only when it is not
 * an array, drop an entry that could not be rendered, and coerce everything else. Refusing the
 * whole list over one bad field would fall back to `DEFAULT_COLLECTIONS` — which is empty — and
 * so would wipe the owner's other collections off the homepage because one of them had a
 * `visible` of `"yes"` instead of `true`.
 *
 * WHAT IS DROPPED, AND WHY ONLY THIS. An entry with no name. A collection tile is a photograph
 * with a name under it and a URL built from that name; with no name there is no label, no slug
 * and nothing for a visitor to click. Everything else has a sane reading: no blurb is a page
 * with no standfirst, no picture is a tile with an empty frame, no products is a collection the
 * owner has not filled in yet (which the admin screen warns about and the public page states
 * plainly), and a non-array `productIds` is an empty one.
 *
 * WHAT IT CANNOT DO. It cannot invent a collection — there is no entry in the output that was
 * not an object with a name in the input — and it cannot return two collections with the same
 * slug or the same id, because both are allocated through `unique` as the list is built. Those
 * two properties are what the routing and the admin screen depend on.
 */
export function parseCollections(value: unknown): Collection[] | null {
  if (!Array.isArray(value)) return null;

  const list: Collection[] = [];
  const slugs = new Set<string>();
  const ids = new Set<string>();

  for (const [index, raw] of value.entries()) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Record<string, unknown>;

    const name = text(item.name);
    if (!name) continue;

    /*
     * A STORED SLUG WINS OVER THE NAME, ON PURPOSE. The slug is a published URL. Fixing a
     * typo in "Festve Edit" must not break the link the shop already put in an Instagram bio,
     * so once a collection has a slug it keeps it, and only a collection that has never had
     * one gets it derived from the name (which is what the admin screen does on creation).
     * The stored value is still run through `slugify`, so a hand-edited row cannot put a
     * space or a slash into a route.
     */
    const slug = unique(
      slugify(text(item.slug)) ||
        slugify(name) ||
        // A name in a non-Latin script slugifies to nothing. The id is the next-best stable
        // handle, and the index is the last resort — positional, but only ever reached by a
        // collection that has neither a usable name nor a usable id.
        slugify(text(item.id)) ||
        `collection-${index + 1}`,
      slugs
    );

    list.push({
      id: unique(text(item.id) || `c${index}`, ids),
      slug,
      name,
      blurb: text(item.blurb),
      image: text(item.image),
      productIds: parseProductIds(item.productIds),
      // Anything other than an explicit `false` shows. A collection the owner saved and cannot
      // find on the homepage is a worse failure than one that appears before they meant it to.
      visible: item.visible !== false,
    });
  }

  return list;
}

/** The collections the homepage strip offers, in order. */
export function visibleCollections(collections: Collection[]): Collection[] {
  return collections.filter(collection => collection.visible);
}
