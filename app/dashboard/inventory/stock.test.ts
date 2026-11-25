// The stock screen's arithmetic, against the shape of the live data: fifteen products, eight
// variants, and thirteen garments with no sizes recorded at all.
//
// Most of what is checked here is one rule — **no sizes recorded is not zero in stock** —
// because collapsing the two is the easy mistake, it is invisible on screen (a tidy table of
// "Out of stock" pills), and acting on it means reordering garments that are hanging up in the
// shop. Nothing here touches Prisma.
import { describe, expect, it } from 'vitest';
import {
  LOW_STOCK_AT,
  STOCK_LABEL,
  describeProductStock,
  filterVariants,
  groupByProduct,
  isPending,
  pendingStockEdits,
  productStock,
  productsWithoutSizes,
  stockState,
  stockTone,
  totals,
  unitsForProduct,
  type ProductRef,
  type VariantRow,
} from './stock';

function product(id: string, name: string, isArchived = false): ProductRef {
  return { id, name, photo: null, category: 'SAREE', isArchived };
}

function variant(
  id: string,
  productId: string,
  size: string,
  stock: number,
  color: string | null = null
): VariantRow {
  return {
    id,
    productId,
    size,
    color,
    stock,
    updatedAt: '2026-11-01T00:00:00.000Z',
    product: product(productId, productId === 'banarasi' ? 'Banarasi Red Silk Saree' : 'Midnight Silk Saree'),
  };
}

/** The two covered garments, exactly as production records them. */
const VARIANTS: VariantRow[] = [
  variant('v1', 'banarasi', 'L', 10),
  variant('v2', 'banarasi', 'M', 8),
  variant('v3', 'banarasi', 'S', 7),
  variant('v4', 'banarasi', 'XS', 1),
  variant('v5', 'midnight', 'S', 10),
  variant('v6', 'midnight', 'M', 10),
  variant('v7', 'midnight', 'L', 10),
  variant('v8', 'midnight', 'Custom', 999),
];

/** Fifteen products, of which two have sizes — the live catalogue's shape. */
const PRODUCTS: ProductRef[] = [
  product('banarasi', 'Banarasi Red Silk Saree'),
  product('midnight', 'Midnight Silk Saree'),
  ...Array.from({ length: 13 }, (_, index) => product(`p${index}`, `Garment ${index + 1}`)),
];

describe('stockState', () => {
  it('calls zero out of stock', () => {
    expect(stockState(0)).toBe('out');
  });

  it('calls one through the threshold low', () => {
    expect(stockState(1)).toBe('low');
    expect(stockState(LOW_STOCK_AT)).toBe('low');
  });

  it('calls one above the threshold in stock', () => {
    expect(stockState(LOW_STOCK_AT + 1)).toBe('in');
    expect(stockState(999)).toBe('in');
  });

  it('reads a negative count as out rather than hiding it', () => {
    // The column is a plain Int the previous application could write to, so a negative is
    // possible; "minus one on the rail" honestly means there is nothing there.
    expect(stockState(-1)).toBe('out');
  });

  it('states its condition in words as well as colour', () => {
    // Colour is never the only carrier of meaning in this portal.
    expect(STOCK_LABEL.out).toBe('Out of stock');
    expect(STOCK_LABEL.low).toBe('Low');
    expect(STOCK_LABEL.in).toBe('In stock');
    expect(stockTone('out')).toBe('danger');
    expect(stockTone('low')).toBe('warn');
    expect(stockTone('in')).toBe('success');
  });
});

describe('no sizes recorded is not zero in stock', () => {
  it('reports null, not 0, for a product with no variants', () => {
    expect(unitsForProduct('p1', VARIANTS)).toBeNull();
  });

  it('reports a real total for a product that has them', () => {
    expect(unitsForProduct('banarasi', VARIANTS)).toBe(26);
    expect(unitsForProduct('midnight', VARIANTS)).toBe(1029);
  });

  it('reports 0 for a product whose sizes are genuinely all empty', () => {
    // This is the one case where zero is the truth, and it must still be distinguishable from
    // the case above: a number, not a null.
    const soldOut = [variant('x1', 'sold', 'M', 0), variant('x2', 'sold', 'L', 0)];
    expect(unitsForProduct('sold', soldOut)).toBe(0);
  });

  it('describes an uncovered garment as having no sizes set up yet', () => {
    expect(describeProductStock(productStock('p1', VARIANTS))).toBe('no sizes set up yet');
  });

  it('describes a covered garment with its sizes and units', () => {
    expect(describeProductStock(productStock('banarasi', VARIANTS))).toBe('4 sizes · 26 units');
  });

  it('counts one size and one unit in the singular', () => {
    expect(describeProductStock(productStock('one', [variant('y1', 'one', 'M', 1)]))).toBe(
      '1 size · 1 unit'
    );
  });

  it('lists every product with no sizes, and only those', () => {
    const uncovered = productsWithoutSizes(PRODUCTS, VARIANTS);
    expect(uncovered).toHaveLength(13);
    expect(uncovered.map(item => item.id)).not.toContain('banarasi');
    expect(uncovered.map(item => item.id)).not.toContain('midnight');
  });

  it('lists nothing as uncovered once every product has a size', () => {
    expect(productsWithoutSizes(PRODUCTS.slice(0, 2), VARIANTS)).toEqual([]);
  });
});

describe('totals', () => {
  const figures = totals(PRODUCTS, VARIANTS);

  it('counts the sizes that exist and the products they cover', () => {
    expect(figures.variantsTracked).toBe(8);
    expect(figures.productsCovered).toBe(2);
    expect(figures.productsAll).toBe(15);
  });

  it('sums the units across every recorded size', () => {
    expect(figures.unitsInStock).toBe(1055);
  });

  it('never counts a product with no sizes as out of stock', () => {
    // The whole screen turns on this: thirteen uncovered garments must appear in `withoutSizes`
    // and nowhere near the out-of-stock figure, which is the one an owner would act on.
    expect(figures.outOfStock).toBe(0);
    expect(figures.withoutSizes).toBe(13);
  });

  it('counts a recorded size at zero as out of stock', () => {
    const withEmpty = [...VARIANTS, variant('v9', 'banarasi', 'XXL', 0)];
    const counted = totals(PRODUCTS, withEmpty);
    expect(counted.outOfStock).toBe(1);
    // …and the garment is still covered, so it does not also appear in the gap.
    expect(counted.withoutSizes).toBe(13);
  });

  it('ignores a negative count when summing units rather than subtracting it', () => {
    // A corrupt negative must not quietly reduce the shop's total stock.
    const counted = totals(PRODUCTS, [variant('n1', 'banarasi', 'M', -5)]);
    expect(counted.unitsInStock).toBe(0);
  });

  it('has nothing to report for an empty database', () => {
    expect(totals([], [])).toEqual({
      variantsTracked: 0,
      productsCovered: 0,
      unitsInStock: 0,
      outOfStock: 0,
      withoutSizes: 0,
      productsAll: 0,
    });
  });
});

describe('filterVariants', () => {
  it('returns everything by default', () => {
    expect(filterVariants(VARIANTS)).toHaveLength(8);
  });

  it('narrows to a stock state', () => {
    const withEmpty = [...VARIANTS, variant('v9', 'banarasi', 'XXL', 0)];
    expect(filterVariants(withEmpty, { stock: 'out' }).map(row => row.id)).toEqual(['v9']);
    expect(filterVariants(withEmpty, { stock: 'low' }).map(row => row.id)).toEqual(['v4']);
    expect(filterVariants(withEmpty, { stock: 'in' })).toHaveLength(7);
  });

  it('matches the product name, the size and the colour', () => {
    const coloured = [...VARIANTS, variant('v9', 'banarasi', 'XXL', 3, 'Emerald')];
    expect(filterVariants(coloured, { search: 'emerald' }).map(row => row.id)).toEqual(['v9']);
    expect(filterVariants(coloured, { search: 'midnight' })).toHaveLength(4);
    expect(filterVariants(coloured, { search: 'custom' }).map(row => row.id)).toEqual(['v8']);
  });

  it('ignores case and surrounding space in the search', () => {
    expect(filterVariants(VARIANTS, { search: '  MIDNIGHT  ' })).toHaveLength(4);
  });

  it('combines the two filters rather than choosing between them', () => {
    expect(filterVariants(VARIANTS, { stock: 'low', search: 'banarasi' })).toHaveLength(1);
    expect(filterVariants(VARIANTS, { stock: 'low', search: 'midnight' })).toHaveLength(0);
  });
});

describe('groupByProduct', () => {
  it('groups the rows under their garment in first-seen order', () => {
    const groups = groupByProduct(VARIANTS);
    expect(groups.map(group => group.productId)).toEqual(['banarasi', 'midnight']);
    expect(groups[0].rows).toHaveLength(4);
    expect(groups[1].rows).toHaveLength(4);
  });
});

describe('unsaved stock edits', () => {
  it('reports only the rows whose typed value differs from the saved one', () => {
    const edits = { v1: '12', v2: '8' };
    expect(pendingStockEdits(VARIANTS, edits)).toEqual([{ id: 'v1', stock: 12 }]);
  });

  it('does not arm a save for a value retyped unchanged', () => {
    expect(pendingStockEdits(VARIANTS, { v1: '10' })).toEqual([]);
    expect(isPending(VARIANTS[0], '10')).toBe(false);
  });

  it('ignores a cleared box rather than reading it as none left', () => {
    // Clearing the field is something an admin does on the way to typing a number. Reading it
    // as zero would let a mid-keystroke "Save all" empty the rail.
    expect(pendingStockEdits(VARIANTS, { v1: '' })).toEqual([]);
    expect(pendingStockEdits(VARIANTS, { v1: '   ' })).toEqual([]);
    expect(isPending(VARIANTS[0], '')).toBe(false);
  });

  it('ignores a value that is not a whole, non-negative count', () => {
    expect(pendingStockEdits(VARIANTS, { v1: '-1' })).toEqual([]);
    expect(pendingStockEdits(VARIANTS, { v1: '1.5' })).toEqual([]);
    expect(pendingStockEdits(VARIANTS, { v1: 'ten' })).toEqual([]);
    expect(isPending(VARIANTS[0], '1.5')).toBe(false);
  });

  it('allows a deliberate zero, which is how a size is marked sold out', () => {
    expect(pendingStockEdits(VARIANTS, { v1: '0' })).toEqual([{ id: 'v1', stock: 0 }]);
    expect(isPending(VARIANTS[0], '0')).toBe(true);
  });

  it('ignores typed values for rows that are no longer in the table', () => {
    // A reload drops the edits, but a filter change does not; a save must never carry a row
    // the admin can no longer see.
    expect(pendingStockEdits(VARIANTS.slice(0, 1), { v5: '3' })).toEqual([]);
  });
});
