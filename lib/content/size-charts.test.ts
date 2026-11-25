import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SIZE_CHARTS,
  chartForCategory,
  chartHasRows,
  parseSizeCharts,
  type SizeChart,
} from './size-charts';

/**
 * These two functions decide what measurements a customer reads on a couture shop's product
 * page, so the cases below are the ones that would be visible — or worse, wrong — on the live
 * site if they were off: a table one column out of step, a chart claiming a category that does
 * not exist, two charts fighting over Lehengas, and above all a saree page showing a blouse's
 * numbers because they happened to be the only ones stored.
 */

/** A well-formed chart, as the admin screen would send it. */
function chart(overrides: Partial<SizeChart> = {}): SizeChart {
  return {
    id: 'a',
    slug: 'lehenga',
    name: 'Lehenga',
    note: 'All measurements in inches.',
    columns: ['Size', 'Waist'],
    rows: [['S', '26']],
    categories: ['LEHENGA'],
    visible: true,
    ...overrides,
  };
}

describe('DEFAULT_SIZE_CHARTS', () => {
  /*
   * Not a tautology, and the one test in this file that is about ethics rather than shape.
   * Seeding a plausible chart is the obvious thing for someone to do later; a customer ordering
   * a made-to-measure garment from invented figures is the cost. The assertion is here so that
   * change cannot land quietly.
   */
  it('is empty, because no measurement may ever be invented for a couture shop', () => {
    expect(DEFAULT_SIZE_CHARTS).toEqual([]);
  });
});

describe('parseSizeCharts', () => {
  it('refuses anything that is not an array, so the caller can fall back to the defaults', () => {
    expect(parseSizeCharts(null)).toBeNull();
    expect(parseSizeCharts(undefined)).toBeNull();
    expect(parseSizeCharts('[]')).toBeNull();
    expect(parseSizeCharts({ 0: chart() })).toBeNull();
  });

  it('round-trips a well-formed chart unchanged', () => {
    expect(parseSizeCharts([chart()])).toEqual([chart()]);
  });

  it('returns an empty list for an empty array rather than null', () => {
    // The distinction matters: null means "fall back", `[]` means "the shop has no charts".
    expect(parseSizeCharts([])).toEqual([]);
  });

  it('drops a chart with no name, which has nothing to title the size guide with', () => {
    const parsed = parseSizeCharts([chart({ name: '   ' }), chart({ name: 'Blouse' })]);
    expect(parsed).toHaveLength(1);
    expect(parsed?.[0].name).toBe('Blouse');
  });

  it('drops a chart with no columns, which has no table to draw', () => {
    expect(parseSizeCharts([chart({ columns: [] })])).toEqual([]);
    expect(parseSizeCharts([{ ...chart(), columns: 'Size,Waist' }])).toEqual([]);
  });

  it('keeps a blank column heading, because the first column of a chart is often unlabelled', () => {
    const parsed = parseSizeCharts([chart({ columns: ['', 'Bust'] })]);
    expect(parsed?.[0].columns).toEqual(['', 'Bust']);
  });

  it('pads a short row to the column count instead of refusing the whole chart', () => {
    const parsed = parseSizeCharts([
      chart({ columns: ['Size', 'Bust', 'Waist'], rows: [['M']] }),
    ]);
    expect(parsed?.[0].rows).toEqual([['M', '', '']]);
  });

  it('truncates a long row rather than widening the table under it', () => {
    const parsed = parseSizeCharts([
      chart({ columns: ['Size', 'Bust'], rows: [['M', '36', '30', 'stray']] }),
    ]);
    expect(parsed?.[0].rows).toEqual([['M', '36']]);
  });

  it('drops a row that is not an array at all, there being nothing to reshape', () => {
    const parsed = parseSizeCharts([{ ...chart(), rows: [['M', '26'], 'M, 26', null] }]);
    expect(parsed?.[0].rows).toEqual([['M', '26']]);
  });

  it('keeps cells as the free text they are, and never parses them into numbers', () => {
    const parsed = parseSizeCharts([
      chart({
        columns: ['Size', 'Bust', 'Length'],
        rows: [['XL', '34–36', 'Made to order']],
      }),
    ]);
    expect(parsed?.[0].rows[0]).toEqual(['XL', '34–36', 'Made to order']);
  });

  it('stringifies a hand-edited numeric cell rather than losing the chart over it', () => {
    const parsed = parseSizeCharts([{ ...chart(), rows: [['S', 26]] }]);
    expect(parsed?.[0].rows).toEqual([['S', '26']]);
  });

  it('keeps a blank row, because silently deleting what the owner left is worse than drawing it', () => {
    const parsed = parseSizeCharts([chart({ rows: [['', ''], ['S', '26']] })]);
    expect(parsed?.[0].rows).toEqual([
      ['', ''],
      ['S', '26'],
    ]);
  });

  it('ignores a category the enum does not have', () => {
    const parsed = parseSizeCharts([
      { ...chart(), categories: ['LEHENGA', 'SWIMWEAR', '', 'lehenga'] },
    ]);
    expect(parsed?.[0].categories).toEqual(['LEHENGA']);
  });

  it('de-duplicates a repeated category', () => {
    const parsed = parseSizeCharts([{ ...chart(), categories: ['SUIT', 'SUIT'] }]);
    expect(parsed?.[0].categories).toEqual(['SUIT']);
  });

  it('tolerates categories being absent or the wrong type', () => {
    const parsed = parseSizeCharts([
      { ...chart(), categories: undefined },
      { ...chart(), name: 'Blouse', slug: 'blouse', categories: 'LEHENGA' },
    ]);
    expect(parsed?.map(item => item.categories)).toEqual([[], []]);
  });

  it('derives a slug from the name when the stored chart has none', () => {
    const parsed = parseSizeCharts([{ ...chart(), slug: '', name: 'Kurta & Pant' }]);
    expect(parsed?.[0].slug).toBe('kurta-pant');
  });

  it('makes a colliding slug unique instead of dropping one of the charts', () => {
    const parsed = parseSizeCharts([
      { ...chart(), slug: '', name: 'Blouse' },
      { ...chart(), slug: '', name: 'blouse' },
      { ...chart(), slug: '', name: 'BLOUSE' },
    ]);
    expect(parsed?.map(item => item.slug)).toEqual(['blouse', 'blouse-2', 'blouse-3']);
    expect(parsed).toHaveLength(3);
  });

  it('falls back to a positional slug for a name with no slug-able characters', () => {
    const parsed = parseSizeCharts([{ ...chart(), slug: '', name: '—' }]);
    expect(parsed?.[0].slug).toBe('chart-1');
  });

  it('gives a chart an id when the stored one is missing, so React keys stay stable', () => {
    const parsed = parseSizeCharts([
      { ...chart(), id: '' },
      { ...chart(), id: '', name: 'Blouse' },
    ]);
    expect(parsed?.map(item => item.id)).toEqual(['sc0', 'sc1']);
  });

  it('treats a missing visible flag as shown, a chart having been written to be read', () => {
    const parsed = parseSizeCharts([
      { ...chart(), visible: undefined },
      { ...chart(), name: 'Blouse', visible: 'yes' },
      { ...chart(), name: 'Kurta', visible: false },
    ]);
    expect(parsed?.map(item => item.visible)).toEqual([true, true, false]);
  });

  it('skips entries that are not objects without losing the rest of the list', () => {
    const parsed = parseSizeCharts([null, 'Lehenga', 42, ['Size'], chart()]);
    expect(parsed).toHaveLength(1);
    expect(parsed?.[0].name).toBe('Lehenga');
  });

  it('round-trips its own output, so a re-save cannot drift', () => {
    const once = parseSizeCharts([
      chart({ columns: ['Size', 'Bust', 'Waist'], rows: [['M'], ['L', '38', '32', 'x']] }),
    ]);
    expect(parseSizeCharts(once)).toEqual(once);
  });
});

describe('chartForCategory', () => {
  const lehenga = chart({ id: 'l', slug: 'lehenga', name: 'Lehenga', categories: ['LEHENGA'] });
  const blouse = chart({
    id: 'b',
    slug: 'blouse',
    name: 'Blouse',
    categories: ['SAREE', 'LEHENGA'],
  });

  it('returns nothing when there are no charts at all', () => {
    expect(chartForCategory([], 'LEHENGA')).toBeNull();
    expect(chartForCategory(DEFAULT_SIZE_CHARTS, 'SAREE')).toBeNull();
  });

  it('never falls back to an unrelated chart: a saree page shows no blouse measurements', () => {
    expect(chartForCategory([lehenga], 'SAREE')).toBeNull();
    expect(chartForCategory([lehenga], 'OTHER')).toBeNull();
  });

  it('returns the chart listing the product category', () => {
    expect(chartForCategory([lehenga, blouse], 'SAREE')?.name).toBe('Blouse');
  });

  it('gives a shared category to the first chart, which is the owner-set order', () => {
    expect(chartForCategory([lehenga, blouse], 'LEHENGA')?.name).toBe('Lehenga');
    expect(chartForCategory([blouse, lehenga], 'LEHENGA')?.name).toBe('Blouse');
  });

  it('skips a hidden chart and lets the next one cover the category', () => {
    const hidden = { ...lehenga, visible: false };
    expect(chartForCategory([hidden, blouse], 'LEHENGA')?.name).toBe('Blouse');
    expect(chartForCategory([hidden], 'LEHENGA')).toBeNull();
  });

  it("prefers a product's explicitly chosen chart over the category default", () => {
    expect(chartForCategory([lehenga, blouse], 'LEHENGA', 'blouse')?.name).toBe('Blouse');
  });

  it('honours an explicit choice even for a category that chart does not list', () => {
    const kurta = chart({ id: 'k', slug: 'kurta', name: 'Kurta', categories: [] });
    expect(chartForCategory([lehenga, kurta], 'LEHENGA', 'kurta')?.name).toBe('Kurta');
  });

  it('falls through to the category default when the explicit slug is unknown or hidden', () => {
    const hiddenBlouse = { ...blouse, visible: false };
    expect(chartForCategory([lehenga, blouse], 'LEHENGA', 'gown')?.name).toBe('Lehenga');
    expect(chartForCategory([lehenga, hiddenBlouse], 'LEHENGA', 'blouse')?.name).toBe('Lehenga');
  });

  it('ignores a blank or absent explicit slug', () => {
    expect(chartForCategory([lehenga], 'LEHENGA', '   ')?.name).toBe('Lehenga');
    expect(chartForCategory([lehenga], 'LEHENGA', null)?.name).toBe('Lehenga');
  });

  it('returns nothing for a product with no category, short of an explicit choice', () => {
    expect(chartForCategory([lehenga], null)).toBeNull();
    expect(chartForCategory([lehenga], undefined)).toBeNull();
    expect(chartForCategory([lehenga], '')).toBeNull();
    expect(chartForCategory([lehenga], null, 'lehenga')?.name).toBe('Lehenga');
  });
});

describe('chartHasRows', () => {
  it('is false for a chart that is still only headings', () => {
    expect(chartHasRows(chart({ rows: [] }))).toBe(false);
    expect(chartHasRows(chart())).toBe(true);
  });
});
