import { describe, expect, it } from 'vitest';
import {
  bucketFor,
  bucketOrders,
  buildBuckets,
  dayKey,
  describeWindow,
  formatShare,
  MIN_BUCKETS_WITH_ORDERS,
  MIN_ORDERS_TO_PLOT,
  parseRange,
  plotVerdict,
  resolveWindow,
  share,
  startOfWeek,
  type SeriesPoint,
} from './windows';

/**
 * These are the sums behind a screen an owner will make decisions on, so what is checked here is
 * what would be wrong invisibly: a window off by a day at either end, an order in the wrong
 * month, a share that reads 0% for a real figure, and above all the rule that decides whether a
 * line may be drawn at all. With eight orders in the live database that rule is the screen's
 * whole honesty, and it has to refuse for a stated reason rather than by rendering nothing.
 *
 * Every date below is built with the local-time constructor, because the module works in local
 * time on purpose (see its header) and a test written in UTC would pass or fail by timezone.
 */

/** 25 November 2026, a Wednesday, early afternoon. */
const NOW = new Date(2026, 10, 25, 13, 45, 30);

describe('parseRange', () => {
  it('takes the four ranges it knows', () => {
    expect(parseRange('30d')).toBe('30d');
    expect(parseRange('90d')).toBe('90d');
    expect(parseRange('12m')).toBe('12m');
    expect(parseRange('all')).toBe('all');
  });

  it('falls back to the default rather than refusing an unusable value', () => {
    // A mistyped `?range=` is a typo in a URL, not a client that needs a 400 to learn from.
    expect(parseRange('last-tuesday')).toBe('12m');
    expect(parseRange('')).toBe('12m');
    expect(parseRange(null)).toBe('12m');
    expect(parseRange(undefined)).toBe('12m');
  });
});

describe('resolveWindow', () => {
  it('counts the last 30 days inclusive of today, from midnight', () => {
    const window = resolveWindow('30d', NOW);
    // 27 Oct to 25 Nov is thirty dates. Twenty-nine days back, not thirty.
    expect(window.from).toEqual(new Date(2026, 9, 27, 0, 0, 0, 0));
    expect(window.to).toBe(NOW);
    expect(window.unit).toBe('week');
  });

  it('counts the last 90 days the same way', () => {
    expect(resolveWindow('90d', NOW).from).toEqual(new Date(2026, 7, 28, 0, 0, 0, 0));
  });

  it('makes twelve whole months, including the one in progress', () => {
    const window = resolveWindow('12m', NOW);
    // Not 365 days back: that would start mid-December and then label a half month as a month.
    expect(window.from).toEqual(new Date(2025, 11, 1, 0, 0, 0, 0));
    expect(window.unit).toBe('month');
  });

  it('does not let a long month overflow the month arithmetic', () => {
    // Naive `setMonth(-11)` on the 31st lands on 1 May 2025 via a 31 April that does not exist.
    const window = resolveWindow('12m', new Date(2026, 2, 31, 9, 0));
    expect(window.from).toEqual(new Date(2025, 3, 1, 0, 0, 0, 0));
  });

  it('gives `all` no lower bound at all, rather than an invented one', () => {
    const window = resolveWindow('all', NOW);
    expect(window.from).toBeNull();
    expect(window.unit).toBe('month');
  });
});

describe('describeWindow', () => {
  it('states both ends of a bounded window', () => {
    expect(describeWindow(resolveWindow('12m', NOW))).toBe('1 Dec 2025 to 25 Nov 2026');
  });

  it('says what an unbounded window means instead of leaving the start blank', () => {
    expect(describeWindow(resolveWindow('all', NOW))).toBe(
      'everything recorded, up to 25 Nov 2026'
    );
  });
});

describe('dayKey and startOfWeek', () => {
  it('writes a local date, not a UTC one', () => {
    // 23:30 local on the 25th is the 25th. `toISOString().slice(0, 10)` would say the 26th in
    // any timezone east of UTC, which silently moves an order into the next bucket.
    expect(dayKey(new Date(2026, 10, 25, 23, 30))).toBe('2026-11-25');
    expect(dayKey(new Date(2026, 0, 5, 0, 1))).toBe('2026-01-05');
  });

  it('starts a week on Monday', () => {
    expect(startOfWeek(new Date(2026, 10, 25, 13, 0))).toEqual(new Date(2026, 10, 23, 0, 0, 0, 0));
    // A Sunday belongs to the week that began the Monday before it, not to the next one.
    expect(startOfWeek(new Date(2026, 10, 22, 13, 0))).toEqual(new Date(2026, 10, 16, 0, 0, 0, 0));
    expect(startOfWeek(new Date(2026, 10, 23, 0, 0))).toEqual(new Date(2026, 10, 23, 0, 0, 0, 0));
  });
});

describe('buildBuckets', () => {
  it('makes one bucket per week, starting on the Monday on or before the window', () => {
    const window = resolveWindow('30d', NOW);
    const buckets = buildBuckets(window.from as Date, window.to, 'week');

    // Five weeks, and the first one begins 26 October although the window begins the 27th: a
    // week is a week, and a four-day first bar labelled like the others would understate it.
    expect(buckets.map(bucket => bucket.label)).toEqual([
      '26 Oct',
      '2 Nov',
      '9 Nov',
      '16 Nov',
      '23 Nov',
    ]);
    expect(buckets[0].key).toBe('2026-10-26');
    expect(buckets[0].end).toEqual(new Date(2026, 10, 2, 0, 0, 0, 0));
  });

  it('makes one bucket per calendar month, twelve of them for a year', () => {
    const window = resolveWindow('12m', NOW);
    const buckets = buildBuckets(window.from as Date, window.to, 'month');

    expect(buckets).toHaveLength(12);
    expect(buckets[0].label).toBe('Dec 2025');
    expect(buckets[11].label).toBe('Nov 2026');
    // Every month's end is the next month's start, with no gap and no overlap.
    for (let index = 1; index < buckets.length; index += 1) {
      expect(buckets[index - 1].end).toEqual(buckets[index].start);
    }
  });

  it('returns nothing when the window ends before it starts', () => {
    expect(buildBuckets(new Date(2026, 10, 25), new Date(2026, 10, 24), 'week')).toEqual([]);
  });
});

describe('bucketFor', () => {
  const buckets = buildBuckets(new Date(2026, 9, 1), new Date(2026, 11, 15), 'month');

  it('places an instant in the month it falls in', () => {
    expect(buckets[bucketFor(buckets, new Date(2026, 9, 31, 23, 59))].label).toBe('Oct 2026');
    expect(buckets[bucketFor(buckets, new Date(2026, 10, 1, 0, 0))].label).toBe('Nov 2026');
  });

  it('treats a bucket as half-open, so a boundary instant is in exactly one bucket', () => {
    const november = buckets.findIndex(bucket => bucket.label === 'Nov 2026');
    expect(bucketFor(buckets, buckets[november].start)).toBe(november);
    expect(bucketFor(buckets, buckets[november].end)).toBe(november + 1);
  });

  it('reports -1 rather than the nearest bucket for an instant outside them all', () => {
    expect(bucketFor(buckets, new Date(2026, 8, 30, 23, 59))).toBe(-1);
    expect(bucketFor(buckets, new Date(2027, 0, 1))).toBe(-1);
  });
});

describe('bucketOrders', () => {
  const buckets = buildBuckets(new Date(2026, 3, 1), new Date(2026, 5, 15), 'month');

  it('counts every order and sums only the ones that count toward revenue', () => {
    const points = bucketOrders(buckets, [
      { at: new Date(2026, 4, 10, 11, 0), amount: 6000, counted: true },
      { at: new Date(2026, 4, 10, 12, 0), amount: 12000, counted: true },
      // A cancelled order: it happened, so it is an order; it was never money, so it is not
      // revenue. Both halves of that have to survive the bucketing.
      { at: new Date(2026, 4, 10, 13, 0), amount: 9000, counted: false },
    ]);

    expect(points.map(point => point.orders)).toEqual([0, 3, 0]);
    expect(points.map(point => point.revenue)).toEqual([0, 18000, 0]);
  });

  it('drops an order outside every bucket instead of folding it into the nearest one', () => {
    const points = bucketOrders(buckets, [
      { at: new Date(2026, 2, 31, 23, 59), amount: 6000, counted: true },
      { at: new Date(2026, 6, 1), amount: 6000, counted: true },
    ]);
    expect(points.every(point => point.orders === 0 && point.revenue === 0)).toBe(true);
  });

  it('keeps the bucket labels and keys it was given', () => {
    const points = bucketOrders(buckets, []);
    expect(points.map(point => point.label)).toEqual(['Apr 2026', 'May 2026', 'Jun 2026']);
    expect(points.map(point => point.key)).toEqual(['2026-04-01', '2026-05-01', '2026-06-01']);
  });
});

/** A series with the given counts, labelled as months. */
function series(counts: number[]): SeriesPoint[] {
  return counts.map((orders, index) => ({
    key: `2026-${String(index + 1).padStart(2, '0')}-01`,
    label: `M${index + 1}`,
    orders,
    revenue: orders * 6000,
  }));
}

describe('plotVerdict', () => {
  it('refuses a window with no buckets, and says what it refused', () => {
    const verdict = plotVerdict([], 'month');
    expect(verdict.plot).toBe(false);
    expect(verdict.reason).toMatch(/nothing in this window/i);
  });

  it('refuses an empty window without drawing a flat line along zero', () => {
    const verdict = plotVerdict(series([0, 0, 0, 0, 0]), 'week');
    expect(verdict.plot).toBe(false);
    // The reason has to say why zero is not the same as nothing — otherwise the screen is a
    // blank card and the reader assumes it is broken.
    expect(verdict.reason).toMatch(/No orders were placed in this window/);
    expect(verdict.reason).toMatch(/trading and selling nothing/);
  });

  /**
   * The live case, and the reason this rule exists: eight orders on one day in May, sitting in
   * one of twelve monthly buckets. A line through that has eleven points of zero and one spike,
   * and every reader of it takes away a shape that is not in the data.
   */
  it('refuses a spike in a single bucket, and counts out loud what it is refusing', () => {
    const verdict = plotVerdict(series([0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0]), 'month');
    expect(verdict.plot).toBe(false);
    expect(verdict.reason).toBe(
      'All 8 orders in this window fall in 1 of its 12 months. A line through that would describe one month and invent the rest, so the figures are listed instead.'
    );
  });

  it('refuses too few orders even when they are spread out', () => {
    const verdict = plotVerdict(series([1, 1, 1, 1, 1, 1]), 'month');
    expect(verdict.plot).toBe(false);
    expect(verdict.reason).toMatch(/^6 orders across 6 months is too few/);
    expect(verdict.reason).toMatch(/one order either way would reverse it/);
  });

  it('refuses a big window of orders that all landed in two buckets', () => {
    // Volume alone is not enough: 40 orders in two weeks is one event, not a trend.
    const verdict = plotVerdict(series([0, 0, 20, 20, 0, 0]), 'week');
    expect(verdict.plot).toBe(false);
    expect(verdict.reason).toMatch(/fall in 2 of its 6 weeks/);
  });

  it('plots once the figures are spread widely enough and there are enough of them', () => {
    expect(plotVerdict(series([2, 3, 1, 4, 2, 2]), 'month')).toEqual({ plot: true, reason: '' });
  });

  it('plots exactly at both thresholds, so the rule is the documented one', () => {
    const atThreshold = series([4, 3, 3, 0, 0, 0]);
    expect(atThreshold.reduce((sum, point) => sum + point.orders, 0)).toBe(MIN_ORDERS_TO_PLOT);
    expect(atThreshold.filter(point => point.orders > 0)).toHaveLength(MIN_BUCKETS_WITH_ORDERS);
    expect(plotVerdict(atThreshold, 'month').plot).toBe(true);

    // One order fewer, or one bucket narrower, and it refuses.
    expect(plotVerdict(series([4, 3, 2, 0, 0, 0]), 'month').plot).toBe(false);
    expect(plotVerdict(series([5, 5, 0, 0, 0, 0]), 'month').plot).toBe(false);
  });
});

describe('share', () => {
  it('divides', () => {
    expect(share(3, 8)).toBe(0.375);
    expect(share(8, 8)).toBe(1);
    expect(share(0, 8)).toBe(0);
  });

  it('never returns NaN or Infinity, because every caller draws a bar with it', () => {
    expect(share(3, 0)).toBe(0);
    expect(share(3, -1)).toBe(0);
    expect(share(Number.NaN, 8)).toBe(0);
    expect(share(3, Number.NaN)).toBe(0);
  });

  it('clamps nonsense rather than drawing a bar past the end of its track', () => {
    expect(share(9, 8)).toBe(1);
    expect(share(-3, 8)).toBe(0);
  });
});

describe('formatShare', () => {
  it('rounds to a whole percent', () => {
    expect(formatShare(3, 8)).toBe('38%');
    expect(formatShare(1, 3)).toBe('33%');
    expect(formatShare(2, 3)).toBe('67%');
    expect(formatShare(8, 8)).toBe('100%');
  });

  it('distinguishes a real but tiny share from none at all', () => {
    // "0%" against a genuine order reads as "no orders", which is a different fact.
    expect(formatShare(1, 1000)).toBe('<1%');
    expect(formatShare(0, 1000)).toBe('0%');
  });

  it('says there is no share when there is nothing to be a share of', () => {
    // Not "0%": that claims a denominator this window does not have.
    expect(formatShare(0, 0)).toBe('—');
    expect(formatShare(5, 0)).toBe('—');
    expect(formatShare(1, Number.NaN)).toBe('—');
  });
});
