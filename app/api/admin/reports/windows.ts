/**
 * The report window, the buckets inside it, the shares beside the figures, and the one rule
 * that decides whether a series is allowed to be drawn at all.
 *
 * WHY THIS IS A SEPARATE FILE WITH NO IMPORTS. Three callers need the same arithmetic and they
 * run in three different places: the route computes the window before it queries, the screen
 * re-describes that window to a reader and decides what to draw, and the tests beside this file
 * are the only place any of it can be checked cheaply. Nothing here touches Prisma,
 * `next/server` or the DOM, so all three can import it and the maths exists once.
 *
 * WHY DATES ARE HANDLED IN LOCAL TIME. Every boundary below — the start of a day, of a Monday
 * week, of a month — is the reader's own boundary, because the labels beside the figures say
 * "Oct 2026" and an owner in Bhopal means their October. Doing the same work in SQL with
 * `date_trunc` would put the boundaries in the database's timezone and the labels in the
 * server's, and the two disagreeing by five and a half hours is the kind of error that never
 * looks like one: a single order quietly in the wrong week.
 *
 * THE HONESTY RULE LIVES HERE, in `plotVerdict`. This shop has eight orders, all from one day,
 * so every window either contains nothing or contains one spike. A chart drawn from that is not
 * a chart of anything — it is a picture of one afternoon with weeks of zero either side, and a
 * reader will take a trend from it however little is behind it. So the rule refuses, in so many
 * words, and the caller lists the figures instead.
 */

export const RANGES = ['30d', '90d', '12m', 'all'] as const;
export type Range = (typeof RANGES)[number];

export const RANGE_LABEL: Record<Range, string> = {
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  '12m': 'Last 12 months',
  all: 'All time',
};

/**
 * Twelve months by default, not thirty days.
 *
 * The orders in this database are all from one day in May, so a 30-day default would open this
 * screen on an empty window. That is true, but it reads as a broken report rather than as a
 * quiet shop, and the first thing an owner would doubt is the screen instead of the figure.
 * Twelve months is also the span an owner actually asks about ("how did the year go?"), and it
 * is wide enough that an empty one means something.
 */
export const DEFAULT_RANGE: Range = '12m';

/** Anything unrecognised becomes the default rather than a 400: a bad `?range=` is a typo. */
export function parseRange(value: string | null | undefined): Range {
  return RANGES.includes(value as Range) ? (value as Range) : DEFAULT_RANGE;
}

export type BucketUnit = 'week' | 'month';

/** The plural the honest-empty sentences need; `unit` itself is already the singular. */
export const UNIT_PLURAL: Record<BucketUnit, string> = { week: 'weeks', month: 'months' };

export interface ReportWindow {
  range: Range;
  /** Inclusive lower bound. `null` for `all`, which has no lower bound by definition. */
  from: Date | null;
  /** Inclusive upper bound: the instant the report was asked for. */
  to: Date;
  /**
   * Weeks for the short ranges, months for the long ones. Thirty days in monthly buckets is
   * two bars; twelve months in weekly buckets is fifty-two, which at this width is a comb.
   */
  unit: BucketUnit;
}

function startOfDay(at: Date): Date {
  const date = new Date(at);
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfMonth(at: Date): Date {
  const date = startOfDay(at);
  date.setDate(1);
  return date;
}

/** The Monday of the week containing `at`. Monday, because a shop's week does not start Sunday. */
export function startOfWeek(at: Date): Date {
  const date = startOfDay(at);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date;
}

function addDays(at: Date, days: number): Date {
  const date = new Date(at);
  date.setDate(date.getDate() + days);
  return date;
}

/** Month arithmetic on a date already at the 1st, so no 31st can overflow into the next one. */
function addMonths(at: Date, months: number): Date {
  const date = new Date(at);
  date.setMonth(date.getMonth() + months);
  return date;
}

/** `2026-11-25` in local time. `toISOString` is UTC, which moves a late-evening day by one. */
export function dayKey(at: Date): string {
  const month = String(at.getMonth() + 1).padStart(2, '0');
  const day = String(at.getDate()).padStart(2, '0');
  return `${at.getFullYear()}-${month}-${day}`;
}

export function resolveWindow(range: Range, now: Date): ReportWindow {
  if (range === 'all') return { range, from: null, to: now, unit: 'month' };

  if (range === '12m') {
    // Eleven months back from the start of this month, so the window is twelve whole months
    // including the one in progress — not 365 days, which would cut the earliest month in half
    // and then label the half-month as if it were a whole one.
    return { range, from: addMonths(startOfMonth(now), -11), to: now, unit: 'month' };
  }

  const days = range === '30d' ? 30 : 90;
  // Inclusive of today, so "last 30 days" covers thirty dates rather than thirty-one.
  return { range, from: addDays(startOfDay(now), -(days - 1)), to: now, unit: 'week' };
}

const DAY_LABEL = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/** "11 Oct 2026 to 25 Nov 2026" — the exact span every figure on the screen covers. */
export function describeWindow(window: { from: Date | null; to: Date }): string {
  const to = DAY_LABEL.format(window.to);
  return window.from
    ? `${DAY_LABEL.format(window.from)} to ${to}`
    : `everything recorded, up to ${to}`;
}

export interface Bucket {
  /** `2026-10-05` — the bucket's own first day, in local time. Stable enough for a CSV. */
  key: string;
  /** Already formatted for a reader: "5 Oct" for a week, "Oct 2026" for a month. */
  label: string;
  start: Date;
  /** Exclusive: the next bucket's start. */
  end: Date;
}

const WEEK_LABEL = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const MONTH_LABEL = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' });

/**
 * The cap is a guard, not a feature: `all` on a shop that has traded for a decade is 120
 * monthly buckets and nothing legitimate reaches 600. Without it, a `from` far enough in the
 * past would spin here rather than fail.
 */
const MAX_BUCKETS = 600;

/** Every bucket between `from` and `to`, oldest first, including the one in progress. */
export function buildBuckets(from: Date, to: Date, unit: BucketUnit): Bucket[] {
  if (from.getTime() > to.getTime()) return [];

  const buckets: Bucket[] = [];
  let start = unit === 'week' ? startOfWeek(from) : startOfMonth(from);

  while (start.getTime() <= to.getTime() && buckets.length < MAX_BUCKETS) {
    const end = unit === 'week' ? addDays(start, 7) : addMonths(start, 1);
    buckets.push({
      key: dayKey(start),
      label: unit === 'week' ? WEEK_LABEL.format(start) : MONTH_LABEL.format(start),
      start,
      end,
    });
    start = end;
  }

  return buckets;
}

/** Which bucket an instant falls in, or -1 when it falls outside all of them. */
export function bucketFor(buckets: Bucket[], at: Date): number {
  const time = at.getTime();
  // A linear scan over a few dozen buckets, once per order. A shop with enough orders for this
  // to cost anything would have outgrown bucketing in JavaScript long before.
  for (let index = 0; index < buckets.length; index += 1) {
    if (time >= buckets[index].start.getTime() && time < buckets[index].end.getTime()) {
      return index;
    }
  }
  return -1;
}

/** One order, reduced to the three things a bucket needs to know about it. */
export interface BucketableOrder {
  at: Date;
  /** `Order.totalAmount`, in rupees. */
  amount: number;
  /** Whether this order counts toward revenue — see `REVENUE_EXCLUDES` in `aggregate.ts`. */
  counted: boolean;
}

export interface SeriesPoint {
  key: string;
  label: string;
  /** Every order placed in the bucket, cancelled and returned ones included. */
  orders: number;
  /** Rupees from the orders in the bucket that count toward revenue. */
  revenue: number;
}

/**
 * Orders into buckets. An order outside every bucket is dropped rather than folded into the
 * nearest one: a figure in the wrong week is worse than one that is visibly missing, and the
 * headline count comes from SQL over the same window, so the two disagreeing would show.
 */
export function bucketOrders(buckets: Bucket[], orders: BucketableOrder[]): SeriesPoint[] {
  const points: SeriesPoint[] = buckets.map(bucket => ({
    key: bucket.key,
    label: bucket.label,
    orders: 0,
    revenue: 0,
  }));

  for (const order of orders) {
    const index = bucketFor(buckets, order.at);
    if (index === -1) continue;
    points[index].orders += 1;
    if (order.counted) points[index].revenue += order.amount;
  }

  return points;
}

/* ---------------------------------------------------------------------------------------- */
/* The rule that refuses to draw                                                             */
/* ---------------------------------------------------------------------------------------- */

/**
 * A series is drawn only when its orders are spread across at least this many buckets. Two
 * points make a line out of nothing; three is the fewest that can show a direction rather than
 * assert one.
 */
export const MIN_BUCKETS_WITH_ORDERS = 3;

/**
 * …and only when the window holds at least this many orders. Four orders across four months is
 * a shape made of four coin flips — the line would rise or fall on one order either way, and a
 * reader cannot see that from the drawing.
 */
export const MIN_ORDERS_TO_PLOT = 10;

export interface PlotVerdict {
  plot: boolean;
  /** Empty when plotting. Otherwise the exact sentence the screen shows in the chart's place. */
  reason: string;
}

export function plotVerdict(points: SeriesPoint[], unit: BucketUnit): PlotVerdict {
  const total = points.reduce((sum, point) => sum + point.orders, 0);
  const active = points.filter(point => point.orders > 0).length;
  const plural = UNIT_PLURAL[unit];

  if (points.length === 0) {
    return {
      plot: false,
      reason: 'There is nothing in this window to bucket into weeks or months.',
    };
  }

  if (total === 0) {
    return {
      plot: false,
      reason:
        'No orders were placed in this window. A line along zero would say the shop was trading and selling nothing, which is not the same as a shop with nothing to record.',
    };
  }

  if (active < MIN_BUCKETS_WITH_ORDERS) {
    return {
      plot: false,
      reason: `All ${total} ${total === 1 ? 'order' : 'orders'} in this window fall in ${active} of its ${points.length} ${plural}. A line through that would describe one ${unit} and invent the rest, so the figures are listed instead.`,
    };
  }

  if (total < MIN_ORDERS_TO_PLOT) {
    return {
      plot: false,
      reason: `${total} orders across ${points.length} ${plural} is too few for the shape of a line to mean anything — one order either way would reverse it. The figures are listed instead.`,
    };
  }

  return { plot: true, reason: '' };
}

/* ---------------------------------------------------------------------------------------- */
/* Shares                                                                                    */
/* ---------------------------------------------------------------------------------------- */

/**
 * `part` of `whole` as a fraction between 0 and 1. A zero or negative whole gives 0 rather than
 * `NaN` or `Infinity`, because every caller is about to multiply this by a bar's width.
 */
export function share(part: number, whole: number): number {
  if (!Number.isFinite(part) || !Number.isFinite(whole) || whole <= 0) return 0;
  return Math.min(1, Math.max(0, part / whole));
}

/**
 * The same share as type. "—" when there is no whole to be a share of, because "0%" there
 * claims a denominator that does not exist; "<1%" for a real but tiny share, because rounding
 * a genuine order down to "0%" reads as none at all.
 *
 * Each share is rounded on its own, so a column of them need not total exactly 100% — which is
 * why every share on this screen is shown beside its own count and never in place of one.
 */
export function formatShare(part: number, whole: number): string {
  if (!Number.isFinite(whole) || whole <= 0) return '—';
  const fraction = share(part, whole);
  if (fraction === 0) return '0%';
  const percent = Math.round(fraction * 100);
  return percent === 0 ? '<1%' : `${percent}%`;
}
