import type { BadgeTone } from '@/components/admin/styles';

/**
 * What the stock screen knows, as plain functions.
 *
 * The screen's whole value is the difference between three states that look alike in a table
 * and are not alike at all: a garment with sizes and units, a garment with sizes and none
 * left, and a garment with **no sizes recorded**. Thirteen of the shop's fifteen products are
 * in the third state. Every function here keeps them apart, and the tests beside this file are
 * mostly about that one distinction, because collapsing it is the easy mistake and it turns
 * "we have never recorded this garment's sizes" into "this garment is sold out".
 */

/** A product, as the inventory endpoint sends it: enough to name and picture a row. */
export interface ProductRef {
  id: string;
  name: string;
  /** The first photograph, or null. Null means no photograph, never a stand-in. */
  photo: string | null;
  category: string;
  isArchived: boolean;
}

/** One size of one garment: the row stock is actually recorded against. */
export interface VariantRow {
  id: string;
  productId: string;
  size: string;
  color: string | null;
  stock: number;
  updatedAt: string;
  product: ProductRef | null;
}

export interface InventoryResponse {
  variants: VariantRow[];
  products: ProductRef[];
}

/* ---------------------------------------------------------------------------------------- */
/* The stock states                                                                          */
/* ---------------------------------------------------------------------------------------- */

/**
 * The count at and below which a size reads as "Low", above zero.
 *
 * THIS NUMBER IS A GUESS. Nobody at the shop has been asked what "running low" means for a
 * garment, and it will differ by garment — five sarees on a rail is comfortable, five of a
 * bridal lehenga is probably months of work. Five is here because it is the number a person
 * can picture and because *some* threshold has to be drawn for the pill to mean anything.
 *
 * It is a named constant with this note attached rather than a `<= 5` in the markup so that
 * the day the shop says "below three for sarees, below ten for suits" the change is one line
 * and a decision about data, not a hunt through a component.
 */
export const LOW_STOCK_AT = 5;

export type StockState = 'out' | 'low' | 'in';

/**
 * Where a *recorded* count sits. Takes a number, never an absence — a size with no row has no
 * stock state, which is what `unitsForProduct` returning null is about.
 *
 * Negative stock is treated as out rather than hidden: the column is a plain `Int` and the old
 * application could write to it, so a negative is possible, and the honest reading of "minus
 * one in stock" is that there is nothing on the rail.
 */
export function stockState(stock: number): StockState {
  if (stock <= 0) return 'out';
  if (stock <= LOW_STOCK_AT) return 'low';
  return 'in';
}

export const STOCK_LABEL: Record<StockState, string> = {
  out: 'Out of stock',
  low: 'Low',
  in: 'In stock',
};

/** The pill's colour. The words above carry the meaning; this only reinforces it. */
export function stockTone(state: StockState): BadgeTone {
  if (state === 'out') return 'danger';
  if (state === 'low') return 'warn';
  return 'success';
}

/* ---------------------------------------------------------------------------------------- */
/* Coverage: which garments have sizes at all                                                */
/* ---------------------------------------------------------------------------------------- */

/**
 * The units recorded for a product, or **null when no sizes have been set up for it**.
 *
 * NULL IS NOT ZERO AND THE DIFFERENCE IS THE POINT. Zero means every size of this garment is
 * sold out, which is a fact about the shop. Null means nobody has ever recorded this garment's
 * sizes, which is a fact about the data. Returning 0 for both — the obvious implementation,
 * `variants.filter(…).reduce(sum, 0)` — would report thirteen of fifteen products as sold out,
 * and an admin acting on that would chase stock that is sitting in the shop.
 */
export function unitsForProduct(productId: string, variants: VariantRow[]): number | null {
  const mine = variants.filter(variant => variant.productId === productId);
  if (mine.length === 0) return null;
  return mine.reduce((sum, variant) => sum + Math.max(0, variant.stock), 0);
}

/** One garment's stock at a glance, for a grouped heading or a product row. */
export interface ProductStock {
  sizes: number;
  /** Null when no sizes are recorded: unknown, not zero. */
  units: number | null;
  outOfStockSizes: number;
}

export function productStock(productId: string, variants: VariantRow[]): ProductStock {
  const mine = variants.filter(variant => variant.productId === productId);
  return {
    sizes: mine.length,
    units: mine.length === 0 ? null : mine.reduce((sum, v) => sum + Math.max(0, v.stock), 0),
    outOfStockSizes: mine.filter(variant => stockState(variant.stock) === 'out').length,
  };
}

/**
 * "4 sizes · 26 units" / "no sizes set up yet" — one garment's stock, in words.
 *
 * The uncovered wording says *yet*, and says nothing about availability, because the screen
 * does not know and must not imply. "Stock unknown" would also be true but reads as a fault;
 * "no sizes set up yet" names the thing an admin can actually do about it.
 */
export function describeProductStock(stock: ProductStock): string {
  if (stock.units === null) return 'no sizes set up yet';
  const sizes = `${stock.sizes} ${stock.sizes === 1 ? 'size' : 'sizes'}`;
  const units = `${stock.units} ${stock.units === 1 ? 'unit' : 'units'}`;
  return `${sizes} · ${units}`;
}

/**
 * The products with no variant rows at all, in the order they were given.
 *
 * This is the screen's second section, and it is not an edge case: it is thirteen of the
 * fifteen products in the live catalogue. A stock screen that showed only the eight variant
 * rows would be a screen about two garments pretending to be a screen about the shop.
 */
export function productsWithoutSizes(
  products: ProductRef[],
  variants: VariantRow[]
): ProductRef[] {
  const covered = new Set(variants.map(variant => variant.productId));
  return products.filter(product => !covered.has(product.id));
}

/* ---------------------------------------------------------------------------------------- */
/* Totals                                                                                    */
/* ---------------------------------------------------------------------------------------- */

export interface Totals {
  /** Variant rows — sizes — that exist at all. */
  variantsTracked: number;
  /** Products with at least one size recorded. */
  productsCovered: number;
  /** Units across every recorded size. */
  unitsInStock: number;
  /** Recorded sizes at zero. Products with no sizes are NOT counted here. */
  outOfStock: number;
  /** Products with no sizes recorded — the gap, counted rather than implied. */
  withoutSizes: number;
  /** Every product, so "2 of 15 covered" can be stated without a second source. */
  productsAll: number;
}

/**
 * The four figures at the top of the screen.
 *
 * `outOfStock` counts **recorded sizes at zero only**. A product with no sizes is absent from
 * that figure and present in `withoutSizes`, which is the same rule as everywhere else in this
 * file: the screen never reports an unknown as a zero. The two numbers sit side by side on the
 * screen precisely so the gap is as visible as the shortage.
 */
export function totals(products: ProductRef[], variants: VariantRow[]): Totals {
  const covered = new Set(variants.map(variant => variant.productId));
  return {
    variantsTracked: variants.length,
    productsCovered: covered.size,
    unitsInStock: variants.reduce((sum, variant) => sum + Math.max(0, variant.stock), 0),
    outOfStock: variants.filter(variant => stockState(variant.stock) === 'out').length,
    withoutSizes: products.filter(product => !covered.has(product.id)).length,
    productsAll: products.length,
  };
}

/* ---------------------------------------------------------------------------------------- */
/* Filtering the table                                                                       */
/* ---------------------------------------------------------------------------------------- */

export type StockFilter = 'all' | 'out' | 'low' | 'in';

export const STOCK_FILTERS: { value: StockFilter; label: string }[] = [
  { value: 'all', label: 'Every size' },
  { value: 'out', label: 'Out of stock' },
  { value: 'low', label: `Low (${LOW_STOCK_AT} or fewer)` },
  { value: 'in', label: 'In stock' },
];

/**
 * Narrow the variant rows by stock state and by a free-text match on the garment, its size and
 * its colour.
 *
 * Client-side rather than a query parameter because the whole table is eight rows today and
 * fifteen products' worth of sizes at its largest conceivable: a round trip per keystroke
 * would be slower than the filter it replaced, and an endpoint parameter nobody can see the
 * effect of is harder to keep honest than a `filter` with a test.
 */
export function filterVariants(
  variants: VariantRow[],
  { stock = 'all', search = '' }: { stock?: StockFilter; search?: string } = {}
): VariantRow[] {
  const needle = search.trim().toLowerCase();
  return variants.filter(variant => {
    if (stock !== 'all' && stockState(variant.stock) !== stock) return false;
    if (!needle) return true;
    return [variant.product?.name ?? '', variant.size, variant.color ?? '']
      .join(' ')
      .toLowerCase()
      .includes(needle);
  });
}

/** Group rows under their garment, products in first-seen order, for a grouped table head. */
export function groupByProduct(variants: VariantRow[]): { product: ProductRef | null; productId: string; rows: VariantRow[] }[] {
  const groups = new Map<string, { product: ProductRef | null; productId: string; rows: VariantRow[] }>();
  for (const variant of variants) {
    const group = groups.get(variant.productId);
    if (group) {
      group.rows.push(variant);
      continue;
    }
    groups.set(variant.productId, {
      productId: variant.productId,
      product: variant.product,
      rows: [variant],
    });
  }
  return [...groups.values()];
}

/* ---------------------------------------------------------------------------------------- */
/* Unsaved stock edits                                                                       */
/* ---------------------------------------------------------------------------------------- */

/**
 * Which of the typed stock values differ from what is saved.
 *
 * The screen lets an admin walk the rail and correct several numbers before saving, so it has
 * to be able to say *exactly* which rows are unsaved — a "Save" that might or might not
 * include the row you just typed in is worse than no batch save at all. A typed value equal to
 * the stored one is not a change: retyping 10 over 10 must not arm the button.
 *
 * A blank or unparseable entry is skipped rather than treated as zero. Clearing the box is
 * something an admin does on the way to typing a number, and reading it as "none left" would
 * let a mid-keystroke save empty the rail.
 */
export function pendingStockEdits(
  variants: VariantRow[],
  edits: Record<string, string>
): { id: string; stock: number }[] {
  const changes: { id: string; stock: number }[] = [];
  for (const variant of variants) {
    const typed = edits[variant.id];
    if (typed === undefined || typed.trim() === '') continue;
    const value = Number(typed);
    if (!Number.isInteger(value) || value < 0) continue;
    if (value === variant.stock) continue;
    changes.push({ id: variant.id, stock: value });
  }
  return changes;
}

/** Whether one row's typed value is an unsaved change, for the row's own "Unsaved" mark. */
export function isPending(variant: VariantRow, typed: string | undefined): boolean {
  if (typed === undefined || typed.trim() === '') return false;
  const value = Number(typed);
  if (!Number.isInteger(value) || value < 0) return false;
  return value !== variant.stock;
}
