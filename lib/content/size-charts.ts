import { CATEGORY_MAPPING_REVERSE } from '@/lib/utils/product-utils';
import type { ProductType } from '@/types';

/**
 * Custom size charts: the measurement tables a shop writes once and a product page shows
 * behind a "Size guide" link.
 *
 * WHY THIS EXISTS. The product page has carried a `Size Chart` link since launch pointing at
 * `href="#"` — a dead link on every garment in the shop. The owner asked for the chart to be
 * real and to be configured from the portal rather than compiled into a component. A couture
 * shop's chart is not one table: a lehenga, a blouse and a kurta are measured differently, and
 * which columns a chart needs is the shop's decision, not a developer's.
 *
 * WHY `SiteSetting` AND NOT A `SizeChart` TABLE. The same reason the homepage lists live there
 * (see `lib/content/showcase.ts`): `SiteSetting` is an existing key/value JSON store, these are
 * a handful of short ordered documents that nothing joins to, and a new table would mean a
 * migration against a live production database for what is, in storage terms, one row.
 *
 * A CHART IS EDITORIAL REFERENCE, NOT STOCK. `ProductVariant` rows say which sizes the shop
 * actually holds; a chart says what those size names mean in inches. The two must not be
 * conflated — a chart row for "XL" is not a claim that an XL exists, and a variant selling out
 * does not change what XL measures. A chart may *mention* which sizes exist, and that is as
 * close as the two come.
 *
 * THIS MODULE IS PURE ON PURPOSE. No `@prisma/client` import, because the hook in
 * `lib/hooks/useSizeCharts.ts` and the public display component both import from here, and a
 * Prisma import would pull the query engine into the browser bundle. The database half lives
 * in `lib/repositories/size-charts.ts`.
 */

export const SIZE_CHARTS_KEY = 'showcase.sizeCharts';

export interface SizeChart {
  /** Stable identity for React keys and for the admin screen's selection. */
  id: string;
  /**
   * The stable, human-readable handle a product refers to when it names its own chart.
   * Derived from the name when the stored value has none, and unique within the list.
   */
  slug: string;
  /** "Lehenga", "Blouse", "Kurta". Required: a chart with no name is not addressable. */
  name: string;
  /** Free text under the table — units, how to measure, what made-to-measure means. */
  note: string;
  /** The header row, left to right. */
  columns: string[];
  /**
   * The body, row-major, each row the width of `columns`.
   *
   * CELLS ARE STRINGS, AND THAT IS DELIBERATE — not a shortcut around parsing numbers. A real
   * ethnic-wear chart does not hold numbers: it says "34–36" for a range, "32 (+2 ease)",
   * "Made to order", "As per measurement", "—" for a dimension that garment does not have, and
   * a size name like "XL" in the first column. Typing these as `number` would force every one
   * of them into a lie or an empty cell, and nothing in this feature ever does arithmetic on a
   * cell: the table is rendered, not computed.
   */
  rows: string[][];
  /**
   * Which product categories fall back to this chart when the product names none itself.
   *
   * Stored as a loose string array in the JSON column; narrowed to `ProductType` on the way
   * out, because every consumer compares it against a product's own enum value and an
   * unchecked string there is a comparison that silently never matches.
   */
  categories: ProductType[];
  /** The owner's switch for "not on the shop right now". */
  visible: boolean;
}

/**
 * The `ProductType` values a stored chart is allowed to name.
 *
 * Taken from `CATEGORY_MAPPING_REVERSE`, which is keyed by the enum itself, so adding a
 * category to the schema extends this set without anyone remembering to come back here.
 */
const KNOWN_CATEGORIES = new Set(Object.keys(CATEGORY_MAPPING_REVERSE) as ProductType[]);

/** Every category a chart may be attached to, in the order the portal offers them. */
export const CHART_CATEGORIES = Object.keys(CATEGORY_MAPPING_REVERSE) as ProductType[];

/* ------------------------------------------------------------------------------------------ */
/* Defaults                                                                                    */
/* ------------------------------------------------------------------------------------------ */

/**
 * There are no default size charts, and this empty array is the most important decision in
 * the module.
 *
 * Every other editable list in this codebase defaults to what the site already shows, because
 * that is the safe fallback. Here there is nothing to fall back to — the link has always been
 * dead — and the obvious alternative is to seed a plausible-looking "Lehenga" chart with bust
 * 34, waist 28, hip 36. That would be actively harmful, not merely untidy: a customer reads a
 * chart on a couture shop and orders a garment cut to those figures. Measurements invented to
 * fill a table are measurements the shop never agreed to and no tailor ever checked, and the
 * first anyone would know of it is a garment that does not fit.
 *
 * So the shop starts with no chart, the product page renders nothing at all rather than
 * something wrong, and the portal says plainly that no chart has been set up yet. Only the
 * shop's own numbers ever appear here.
 */
export const DEFAULT_SIZE_CHARTS: SizeChart[] = [];

/* ------------------------------------------------------------------------------------------ */
/* Parsing                                                                                     */
/* ------------------------------------------------------------------------------------------ */

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/**
 * A cell, from whatever the column held.
 *
 * Numbers are stringified rather than refused: the shape is authored by this app's own admin
 * screen, but a row hand-edited into the JSON column may well carry `34` instead of `"34"`,
 * and losing a chart over that would be absurd.
 */
const cell = (value: unknown): string => {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return text(value);
};

/** A URL-safe handle from a chart's name. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * A row, forced to the table's width.
 *
 * Reshaping rather than refusing is the whole point: a chart is edited column by column, and
 * the moment someone adds a seventh column every existing row is six cells wide. Refusing the
 * chart there would throw away a table the owner spent an afternoon on, over a shape the
 * editor itself produces in normal use. A short row grows blank cells; a long one loses its
 * tail, which is the only cell content with nowhere to be drawn.
 */
function padRow(row: unknown[], width: number): string[] {
  const cells = row.slice(0, width).map(cell);
  while (cells.length < width) cells.push('');
  return cells;
}

/**
 * A stored size-chart list, or null when the stored value is not one.
 *
 * Defensive in the same way `parseTestimonials` is, and for the same reason: this stands
 * between a JSON column and a public page, so one malformed entry must never cost the owner
 * the rest of the list.
 *
 *  - A chart with no name, or with no columns, is dropped. Neither is renderable — the first
 *    has nothing to label the "Size guide" with, the second has no table.
 *  - A row of the wrong width is reshaped, not rejected (see `padRow`).
 *  - A row that is not an array at all is dropped; there is nothing to reshape.
 *  - A blank row is KEPT. It draws as an empty line, which is untidy, but silently deleting
 *    something the owner can see in the editor is worse than drawing it: a save would quietly
 *    eat the row they had just inserted and not yet filled in.
 *  - An unknown category string is ignored, so a chart can never claim a category the enum
 *    does not have.
 *  - A duplicate slug is suffixed rather than dropped, because the slug is derived and a
 *    collision ("Blouse" and "blouse") is the owner's naming, not corruption. Losing a whole
 *    chart over it would be a data loss nobody asked for.
 */
export function parseSizeCharts(value: unknown): SizeChart[] | null {
  if (!Array.isArray(value)) return null;

  const charts: SizeChart[] = [];
  const takenSlugs = new Set<string>();

  for (const [index, raw] of value.entries()) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const item = raw as Record<string, unknown>;

    const name = text(item.name);
    if (!name) continue;

    if (!Array.isArray(item.columns)) continue;
    // A blank header is allowed — the leading column of a measurement table is very often
    // unlabelled ("" | Bust | Waist) — but the table must have at least one column to draw.
    const columns = item.columns.map(cell);
    if (columns.length === 0) continue;

    const rows = Array.isArray(item.rows)
      ? item.rows
          .filter((row): row is unknown[] => Array.isArray(row))
          .map(row => padRow(row, columns.length))
      : [];

    const categories: ProductType[] = [];
    if (Array.isArray(item.categories)) {
      for (const entry of item.categories) {
        const category = text(entry) as ProductType;
        if (KNOWN_CATEGORIES.has(category) && !categories.includes(category)) {
          categories.push(category);
        }
      }
    }

    let slug = slugify(text(item.slug) || name) || `chart-${index + 1}`;
    if (takenSlugs.has(slug)) {
      let suffix = 2;
      while (takenSlugs.has(`${slug}-${suffix}`)) suffix += 1;
      slug = `${slug}-${suffix}`;
    }
    takenSlugs.add(slug);

    charts.push({
      id: text(item.id) || `sc${index}`,
      slug,
      name,
      note: text(item.note),
      columns,
      rows,
      categories,
      // Absent means shown: a chart that exists was written to be read, and the flag is the
      // owner's way of taking one down rather than a gate it must pass to go up.
      visible: typeof item.visible === 'boolean' ? item.visible : true,
    });
  }

  return charts;
}

/* ------------------------------------------------------------------------------------------ */
/* Resolution                                                                                  */
/* ------------------------------------------------------------------------------------------ */

/**
 * The chart a product page should offer, or null for "show no size guide at all".
 *
 * Three rules, in order:
 *
 *  1. A chart the product names itself wins. The `slug` is how that reference is written, and
 *     it is matched before the category default so a single unusual garment — a corseted
 *     lehenga, a kurta set cut to a different block — can carry its own table without the shop
 *     having to invent a category for it. `explicitSlug` is a parameter rather than a product
 *     field because `Product` has nowhere to store one today: adding the column is a migration,
 *     and this feature was built under the constraint of not applying one. The rule is written
 *     and tested here so that wiring a future `product.sizeChartSlug` through is one argument,
 *     not a redesign.
 *  2. Otherwise the first VISIBLE chart listing the product's category. First, not best: the
 *     order is the owner's, set on the portal screen, so "which chart wins for Lehengas" is a
 *     question they answer by moving a row rather than one this function guesses at.
 *  3. Otherwise nothing. Deliberately not "the first chart" or "any chart" — a saree page
 *     showing blouse measurements because they were the only ones stored is worse than a page
 *     with no size guide, which is exactly what the shop has today and what it keeps until
 *     someone writes a saree chart.
 *
 * `visible: false` is respected even for an explicit pick, and the lookup then falls through to
 * the category default. The flag means "not on the shop"; an explicit reference is a choice of
 * *which* chart, not an override of the owner's own off switch.
 */
export function chartForCategory(
  charts: SizeChart[],
  category: ProductType | string | null | undefined,
  explicitSlug?: string | null
): SizeChart | null {
  const visible = charts.filter(chart => chart.visible);

  const wanted = text(explicitSlug);
  if (wanted) {
    const named = visible.find(chart => chart.slug === wanted);
    if (named) return named;
  }

  if (!category) return null;
  return visible.find(chart => chart.categories.includes(category as ProductType)) ?? null;
}

/** Whether a chart has anything to draw. Headers with no rows under them is not a chart yet. */
export function chartHasRows(chart: SizeChart): boolean {
  return chart.rows.length > 0;
}
