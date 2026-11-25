import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import {
  bucketOrders,
  buildBuckets,
  describeWindow,
  RANGE_LABEL,
  resolveWindow,
  type BucketUnit,
  type Range,
  type ReportWindow,
  type SeriesPoint,
} from './windows';

/**
 * Every figure the Reports screen shows, read from the tables that hold them.
 *
 * WHY THE QUERIES LIVE HERE AND NOT IN `route.ts`. The route is the guard, the range parse and
 * the four error outcomes; this file is the reading. Separating them means the reading can be
 * run from a script against a replica without going through a session cookie, and it keeps the
 * route short enough that the guard is visibly the first thing it does.
 *
 * WHAT IS AGGREGATED WHERE. Everything below is a `count`, an `aggregate` or a `groupBy` — the
 * database does the arithmetic and sends back one row per group. There are exactly two
 * exceptions, both deliberate and both marked where they happen:
 *
 *  1. `readSeries` selects two columns per order in the window and buckets them into weeks or
 *     months in JavaScript. Postgres could do it with `date_trunc`, but then the week
 *     boundaries would be in the database's timezone while the labels beside them are in the
 *     server's, and `prisma.groupBy` cannot group by an expression anyway, so it would have to
 *     be raw SQL duplicating `buildBuckets`. Two columns from the orders of one window is a
 *     cheap read, and the headline count still comes from SQL, so if the two ever disagree the
 *     screen shows it rather than hides it.
 *  2. `readTopProducts` is raw SQL, because revenue per product is `SUM(price * quantity)` —
 *     a product of two columns, which `prisma.groupBy` has no way to express. The aggregation
 *     is still done entirely by the database; only the sort for the second view happens here,
 *     over the handful of rows the group-by returns.
 *
 * MONEY, AND THE TWO COLUMNS THAT DISAGREE ABOUT ITS UNIT. `Order.totalAmount` is
 * `Decimal(10, 2)` and `Payment.amount` is a plain `Int`, and the live rows show they are not
 * in the same unit:
 *
 *  - `Order.totalAmount` holds 6000 and 12000, against `OrderItem.price` of 6000 and 12000 and
 *    a catalogue of sarees priced in thousands. It is **whole rupees**, and nothing here
 *    multiplies or divides it.
 *  - `Payment.amount` holds 600000 and 1200000 against those same orders — exactly a hundred
 *    times each one, which is Razorpay's convention and the only reading under which a ₹6,000
 *    saree was not paid for with ₹6,00,000. It is **paise**, and `paiseToRupees` divides it by
 *    a hundred, once, where it is read.
 *
 * This is the one inferred fact on the screen, so the screen says so out loud
 * (`PAYMENT_AMOUNT_NOTE`) rather than quietly presenting a derived figure as a recorded one.
 * It is also the only place the factor of a hundred appears: if the gateway ever starts writing
 * rupees, this is the line to change, and until then the payments total agreeing to the paisa
 * with the orders total is the evidence that the reading is right.
 *
 * PRECISION. A `Decimal` is not a number, and the sums are added up by Postgres as `numeric`,
 * so nothing accumulates in binary floating point on the way here. One `Number()` at the end
 * is exact for every value these columns can hold: the largest `Decimal(10, 2)`,
 * 99,999,999.99, needs 34 bits of mantissa and a double has 53.
 */

/**
 * The revenue basis, stated once and sent to the screen so the UI cannot describe it wrongly.
 *
 * A cancelled order was never money, and a returned one was money given back; counting either
 * as revenue would tell an owner they earned something they do not have. They are still
 * counted as orders, because the shop did receive them, and the excluded total is reported
 * beside the revenue rather than silently dropped.
 */
export const REVENUE_EXCLUDES = ['CANCELLED', 'RETURNED'] as const;

export const REVENUE_BASIS =
  'Revenue is the sum of every order total in the window except cancelled and returned orders. Those orders are still counted as orders.';

/** Said on the screen, because a figure this file derived must not look like one it read. */
export const PAYMENT_AMOUNT_NOTE =
  'The gateway records amounts in paise, so these have been divided by a hundred to read as rupees. The recorded paise match the order totals exactly, which is what that reading rests on.';

/**
 * A single size recorded with this much stock is a made-to-order placeholder, not a shelf.
 *
 * One variant in this catalogue — "Custom" on the Midnight Silk Saree — holds 999, against
 * sizes holding 1 to 10. Adding it to a stock total produces "1,055 units in stock" for a shop
 * with about fifty garments actually counted, which is a number an owner could order cloth
 * against. So 999 and above is reported separately and named, rather than either summed in
 * silently or dropped: the figure is real, it just is not units of anything.
 */
export const STOCK_PLACEHOLDER_FROM = 999;

export const STOCK_PLACEHOLDER_NOTE = `A size recorded with ${STOCK_PLACEHOLDER_FROM} or more units is treated as a made-to-order placeholder rather than a count of garments, and is reported on its own line.`;

export interface Breakdown {
  /** The enum member or raw column value, e.g. `PENDING`. The screen owns the wording. */
  key: string;
  count: number;
  /** Rupees of order total in this group, on the group's own membership — not the basis above. */
  amount: number;
}

export interface TopProduct {
  productId: string;
  name: string;
  category: string;
  units: number;
  revenue: number;
}

export interface StockByProduct {
  productId: string;
  name: string;
  isArchived: boolean;
  /** Units across every recorded size of this garment, placeholders included. */
  units: number;
  /** Of those, the units sitting on placeholder sizes — see `STOCK_PLACEHOLDER_FROM`. */
  placeholderUnits: number;
  variants: number;
}

export interface ReportPayload {
  range: Range;
  rangeLabel: string;
  window: { from: string | null; to: string; text: string };
  unit: BucketUnit;
  generatedAt: string;
  revenueBasis: string;
  headline: {
    /** Every order placed in the window, whatever its status. */
    orders: number;
    /** Rupees, on the basis above. */
    revenue: number;
    /** How many orders that revenue figure covers. */
    revenueOrders: number;
    /** Orders left out of revenue, and what they were worth. */
    excludedOrders: number;
    excludedAmount: number;
    /** Revenue divided by the orders it covers; null when it covers none. */
    averageOrderValue: number | null;
    paidOrders: number;
    unpaidOrders: number;
    rfqOrders: number;
  };
  series: SeriesPoint[];
  byStatus: Breakdown[];
  byPaymentStatus: Breakdown[];
  topProducts: TopProduct[];
  catalogue: {
    /** The catalogue as it stands now — a product has no date an owner would report on. */
    total: number;
    live: number;
    archived: number;
    byCategory: { key: string; count: number }[];
  };
  stock: {
    variants: number;
    /** Every recorded unit, placeholder sizes included. */
    unitsInStock: number;
    /** The same total with the placeholder sizes taken out: the garments actually counted. */
    unitsCounted: number;
    outOfStockVariants: number;
    productsTotal: number;
    productsWithVariants: number;
    /** Garments with no size recorded at all: unknown stock, which is not zero stock. */
    productsWithoutVariants: number;
    byProduct: StockByProduct[];
    zeroStock: { id: string; product: string; size: string; color: string | null }[];
    /** The placeholder sizes themselves, named so an owner can judge them. */
    placeholders: { id: string; product: string; size: string; stock: number }[];
  };
  /** `null` when the enquiries table is not in this database — not the same as zero enquiries. */
  enquiries: {
    inWindow: number;
    everTotal: number;
    byStatus: { key: string; count: number }[];
    bySource: { key: string; count: number }[];
  } | null;
  /** `null` when the payments table could not be read. */
  payments: {
    count: number;
    /** Rupees, converted from the paise the gateway stores. See the money note above. */
    amount: number;
    byStatus: { key: string; count: number; amount: number }[];
  } | null;
}

/** `Decimal | null` to rupees. Null is a `SUM` over no rows, which is zero rupees. */
function rupees(value: Prisma.Decimal | null): number {
  return value === null ? 0 : Number(value);
}

/** Raw SQL hands back `numeric` as a Decimal and `bigint` as a BigInt; both coerce cleanly. */
function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** The window as a Prisma filter. `all` has no lower bound, so the key is simply absent. */
function createdWithin(window: ReportWindow): { gte?: Date; lte: Date } {
  return window.from ? { gte: window.from, lte: window.to } : { lte: window.to };
}

/**
 * The headline figures and the two breakdowns, in six grouped reads.
 *
 * `paidOrders` counts every order in the window whose payment status is PAID, cancelled ones
 * included: the question "how much of this has been paid for" is about money received, and a
 * cancelled order that was paid is a refund waiting to happen rather than a figure to hide.
 */
async function readOrders(window: ReportWindow) {
  const where = { createdAt: createdWithin(window) };
  const counted = { ...where, status: { notIn: [...REVENUE_EXCLUDES] } };
  const excluded = { ...where, status: { in: [...REVENUE_EXCLUDES] } };

  const [byStatus, byPaymentStatus, byType, countedTotals, excludedTotals] = await Promise.all([
    prisma.order.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
      _sum: { totalAmount: true },
    }),
    prisma.order.groupBy({
      by: ['paymentStatus'],
      where,
      _count: { _all: true },
      _sum: { totalAmount: true },
    }),
    prisma.order.groupBy({ by: ['type'], where, _count: { _all: true } }),
    prisma.order.aggregate({ where: counted, _count: { _all: true }, _sum: { totalAmount: true } }),
    prisma.order.aggregate({
      where: excluded,
      _count: { _all: true },
      _sum: { totalAmount: true },
    }),
  ]);

  const revenue = rupees(countedTotals._sum.totalAmount);
  const revenueOrders = countedTotals._count._all;
  const orders = revenueOrders + excludedTotals._count._all;

  const paidOrders = byPaymentStatus.find(row => row.paymentStatus === 'PAID')?._count._all ?? 0;
  const rfqOrders = byType.find(row => row.type === 'RFQ')?._count._all ?? 0;

  return {
    headline: {
      orders,
      revenue,
      revenueOrders,
      excludedOrders: excludedTotals._count._all,
      excludedAmount: rupees(excludedTotals._sum.totalAmount),
      // Rounded to the paisa rather than left as a repeating fraction: the figure is displayed
      // through `formatPrice`, which shows whole rupees, and a CSV should not carry fifteen
      // decimal places of an average of three orders.
      averageOrderValue:
        revenueOrders === 0 ? null : Math.round((revenue / revenueOrders) * 100) / 100,
      paidOrders,
      unpaidOrders: orders - paidOrders,
      rfqOrders,
    },
    byStatus: byStatus.map(row => ({
      key: row.status,
      count: row._count._all,
      amount: rupees(row._sum.totalAmount),
    })),
    byPaymentStatus: byPaymentStatus.map(row => ({
      key: row.paymentStatus,
      count: row._count._all,
      amount: rupees(row._sum.totalAmount),
    })),
  };
}

/**
 * Orders per bucket. See exception (1) in the file header for why this one read selects rows.
 *
 * For `all` the buckets start at the earliest order rather than at some arbitrary epoch, which
 * is why the rows are ordered: the first one is the shop's first order.
 */
async function readSeries(window: ReportWindow): Promise<SeriesPoint[]> {
  const rows = await prisma.order.findMany({
    where: { createdAt: createdWithin(window) },
    select: { createdAt: true, totalAmount: true, status: true },
    orderBy: { createdAt: 'asc' },
  });

  const from = window.from ?? rows[0]?.createdAt ?? null;
  if (!from) return [];

  const buckets = buildBuckets(from, window.to, window.unit);
  const excluded = new Set<string>(REVENUE_EXCLUDES);

  return bucketOrders(
    buckets,
    rows.map(row => ({
      at: row.createdAt,
      amount: Number(row.totalAmount),
      counted: !excluded.has(row.status),
    }))
  );
}

/**
 * Units and revenue per garment, grouped by the database. See exception (2) in the header.
 *
 * `Product.category` is the column `type`, and the status filter casts the enum to text so the
 * excluded statuses can be bound as parameters instead of interpolated into the SQL.
 *
 * The limit is a guard on a catalogue that has fifteen products today. The screen shows the
 * first handful; a garment outside the hundred best-selling could in theory out-earn one
 * inside it, which would only matter in a shop large enough to need a different query.
 */
async function readTopProducts(window: ReportWindow): Promise<TopProduct[]> {
  const lower = window.from ? Prisma.sql`AND o."createdAt" >= ${window.from}` : Prisma.empty;

  const rows = await prisma.$queryRaw<
    { id: string; name: string; category: string; units: number; revenue: Prisma.Decimal }[]
  >`
    SELECT p.id            AS id,
           p.name          AS name,
           p."type"::text  AS category,
           SUM(oi.quantity)::int           AS units,
           SUM(oi.price * oi.quantity)     AS revenue
    FROM "OrderItem" oi
    JOIN "Order" o   ON o.id = oi."orderId"
    JOIN "Product" p ON p.id = oi."productId"
    WHERE o."createdAt" <= ${window.to}
      ${lower}
      AND o.status::text NOT IN (${Prisma.join([...REVENUE_EXCLUDES])})
    GROUP BY p.id, p.name, p."type"
    ORDER BY units DESC, revenue DESC
    LIMIT 100
  `;

  return rows.map(row => ({
    productId: row.id,
    name: row.name,
    category: row.category,
    units: toNumber(row.units),
    revenue: toNumber(row.revenue),
  }));
}

/**
 * The catalogue as it stands, not as it stood in the window: a product's `createdAt` is when it
 * was photographed into the portal, which is not a fact about trading, and filtering the mix by
 * the window would report "0 sarees" for a shop with nine of them.
 */
async function readCatalogue(): Promise<ReportPayload['catalogue']> {
  const [byCategory, total, archived] = await Promise.all([
    prisma.product.groupBy({ by: ['category'], _count: { _all: true } }),
    prisma.product.count(),
    prisma.product.count({ where: { isArchived: true } }),
  ]);

  return {
    total,
    live: total - archived,
    archived,
    byCategory: byCategory
      .map(row => ({ key: row.category as string, count: row._count._all }))
      .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key)),
  };
}

/**
 * Stock, and the gap in it.
 *
 * Eight variants cover two of the fifteen products. The other thirteen have no size recorded at
 * all, and "no size recorded" is not "none in stock" — the first is a hole in the data, the
 * second is a garment that cannot be sold. `productsWithoutVariants` is counted in SQL rather
 * than assumed, so the screen can say the number out loud and be right about it tomorrow.
 */
async function readStock(): Promise<ReportPayload['stock']> {
  const [
    groups,
    placeholderGroups,
    zeroStock,
    placeholders,
    productsTotal,
    productsWithoutVariants,
  ] = await Promise.all([
    prisma.productVariant.groupBy({
      by: ['productId'],
      _sum: { stock: true },
      _count: { _all: true },
    }),
    // The same group-by over the placeholder sizes alone, so every per-product figure can be
    // shown both ways without either total being computed from a list of rows.
    prisma.productVariant.groupBy({
      by: ['productId'],
      where: { stock: { gte: STOCK_PLACEHOLDER_FROM } },
      _sum: { stock: true },
    }),
    prisma.productVariant.findMany({
      where: { stock: 0 },
      select: { id: true, size: true, color: true, Product: { select: { name: true } } },
      orderBy: [{ productId: 'asc' }, { size: 'asc' }],
    }),
    prisma.productVariant.findMany({
      where: { stock: { gte: STOCK_PLACEHOLDER_FROM } },
      select: { id: true, size: true, stock: true, Product: { select: { name: true } } },
      orderBy: { stock: 'desc' },
    }),
    prisma.product.count(),
    prisma.product.count({ where: { ProductVariant: { none: {} } } }),
  ]);

  const placeholderByProduct = new Map(
    placeholderGroups.map(group => [group.productId, group._sum.stock ?? 0])
  );

  // Names for the grouped rows: the group-by returns ids, and a stock list of UUIDs is useless
  // to the person walking the rail. One read of as many products as have variants.
  const named = await prisma.product.findMany({
    where: { id: { in: groups.map(group => group.productId) } },
    select: { id: true, name: true, isArchived: true },
  });
  const nameById = new Map(named.map(product => [product.id, product]));

  const byProduct: StockByProduct[] = groups
    .map(group => ({
      productId: group.productId,
      name: nameById.get(group.productId)?.name ?? 'A product that no longer exists',
      isArchived: nameById.get(group.productId)?.isArchived ?? false,
      units: group._sum.stock ?? 0,
      placeholderUnits: placeholderByProduct.get(group.productId) ?? 0,
      variants: group._count._all,
    }))
    // Sorted on the counted units rather than the raw total, so one placeholder size cannot
    // put a garment at the top of a stock list it has one of.
    .sort(
      (a, b) =>
        b.units - b.placeholderUnits - (a.units - a.placeholderUnits) ||
        a.name.localeCompare(b.name)
    );

  const unitsInStock = groups.reduce((sum, group) => sum + (group._sum.stock ?? 0), 0);
  const placeholderUnits = placeholderGroups.reduce(
    (sum, group) => sum + (group._sum.stock ?? 0),
    0
  );

  return {
    variants: groups.reduce((sum, group) => sum + group._count._all, 0),
    unitsInStock,
    unitsCounted: unitsInStock - placeholderUnits,
    outOfStockVariants: zeroStock.length,
    productsTotal,
    productsWithVariants: groups.length,
    productsWithoutVariants,
    byProduct,
    zeroStock: zeroStock.map(variant => ({
      id: variant.id,
      product: variant.Product?.name ?? 'Unnamed product',
      size: variant.size,
      color: variant.color,
    })),
    placeholders: placeholders.map(variant => ({
      id: variant.id,
      product: variant.Product?.name ?? 'Unnamed product',
      size: variant.size,
      stock: variant.stock,
    })),
  };
}

/**
 * Enquiries in the window, and how many there have ever been.
 *
 * Both, because they answer different questions and the pair is the honest version: "none this
 * month" beside "none ever" means a form nobody has used, while "none this month" beside
 * "forty ever" means something changed. Today both are zero.
 *
 * A failure here is answered with null rather than thrown. The enquiries table arrived with the
 * CMS migration, which is not applied in every database this runs against, and a report on
 * orders should not go dark because a different table is missing.
 */
async function readEnquiries(window: ReportWindow): Promise<ReportPayload['enquiries']> {
  try {
    const where = { createdAt: createdWithin(window) };
    const [inWindow, everTotal, byStatus, bySource] = await Promise.all([
      prisma.enquiry.count({ where }),
      prisma.enquiry.count(),
      prisma.enquiry.groupBy({ by: ['status'], where, _count: { _all: true } }),
      prisma.enquiry.groupBy({ by: ['source'], where, _count: { _all: true } }),
    ]);

    return {
      inWindow,
      everTotal,
      byStatus: byStatus.map(row => ({ key: row.status as string, count: row._count._all })),
      bySource: bySource.map(row => ({
        // `source` is nullable, and a null source is a real state: an enquiry saved before the
        // column existed. It is labelled, not dropped.
        key: row.source ?? '',
        count: row._count._all,
      })),
    };
  } catch (error) {
    console.error('[reports] enquiries unavailable:', error);
    return null;
  }
}

/** Paise to rupees. The only place the factor of a hundred appears — see the money note. */
function paiseToRupees(paise: number): number {
  return Math.round(paise) / 100;
}

/**
 * What the payment gateway actually recorded, as a cross-check on `Order.paymentStatus`.
 *
 * `Payment.status` is a free-text column written by the old application, so the values are
 * whatever it wrote ("captured", "created", "failed" today); they are grouped and shown as they
 * are rather than mapped onto an enum this code would have to invent. The two cannot be assumed
 * to agree with `Order.paymentStatus` either — showing both is the point of the card.
 */
async function readPayments(window: ReportWindow): Promise<ReportPayload['payments']> {
  try {
    const where = { created_at: createdWithin(window) };
    const [totals, byStatus] = await Promise.all([
      prisma.payment.aggregate({ where, _count: { _all: true }, _sum: { amount: true } }),
      prisma.payment.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
        _sum: { amount: true },
      }),
    ]);

    return {
      count: totals._count._all,
      amount: paiseToRupees(totals._sum.amount ?? 0),
      byStatus: byStatus.map(row => ({
        key: row.status,
        count: row._count._all,
        amount: paiseToRupees(row._sum.amount ?? 0),
      })),
    };
  } catch (error) {
    console.error('[reports] payments unavailable:', error);
    return null;
  }
}

/** The whole report for one range. `now` is a parameter so a test can fix the window. */
export async function readReport(range: Range, now: Date = new Date()): Promise<ReportPayload> {
  const window = resolveWindow(range, now);

  const [orders, series, topProducts, catalogue, stock, enquiries, payments] = await Promise.all([
    readOrders(window),
    readSeries(window),
    readTopProducts(window),
    readCatalogue(),
    readStock(),
    readEnquiries(window),
    readPayments(window),
  ]);

  return {
    range,
    rangeLabel: RANGE_LABEL[range],
    window: {
      from: window.from ? window.from.toISOString() : null,
      to: window.to.toISOString(),
      text: describeWindow(window),
    },
    unit: window.unit,
    generatedAt: now.toISOString(),
    revenueBasis: REVENUE_BASIS,
    ...orders,
    series,
    topProducts,
    catalogue,
    stock,
    enquiries,
    payments,
  };
}
