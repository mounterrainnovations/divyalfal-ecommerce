import type { OrderStatus, OrderType, PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

/**
 * Orders: the eight rows the shop already has, and the walk-in sale the counter needs to
 * record. Every Prisma call the Orders module makes lives here; the routes above it only
 * translate HTTP into these functions and their errors into status codes.
 *
 * FOUR FACTS ABOUT THESE TABLES DRIVE ALMOST EVERY DECISION BELOW, and none of them is
 * guessable from the column names, so they are written down once here rather than rediscovered
 * at each call site.
 *
 * **1. `Order.id` and `OrderItem.id` have no database default.** The checkout that wrote the
 * existing rows generated them in application code, and the introspected schema records that
 * faithfully: `@id` with no `@default(uuid())`. So every insert here generates its own id with
 * `crypto.randomUUID()`. An insert that omits the id does not get a generated one — it fails.
 *
 * **2. Neither `Order.updatedAt` nor `Payment.updated_at` is `@updatedAt`.** Prisma will not
 * maintain them, and the columns are NOT NULL, so every create *and* every update in this file
 * sets the timestamp by hand. Forgetting it on an update is worse than forgetting it on a
 * create: the create fails loudly, the update silently leaves a stale `updatedAt` behind.
 *
 * **3. `OrderItem.productId` AND `OrderItem.productVariantId` are both required.** A line
 * cannot exist without a real product *and* a real `ProductVariant`, and only two of the
 * fifteen products have variants today. There is no honest way around that from here — a line
 * needs a size that exists — so `listSellableProducts` reports both halves of the catalogue
 * and the offline form says plainly which products it cannot sell and why. Nothing in this
 * file invents a variant to make a sale go through.
 *
 * **4. `Payment.amount` is an `Int` holding PAISE, not rupees.** This was checked against the
 * live rows rather than assumed, and the check is the whole point: all five rows are exactly
 * 100x their order's `totalAmount` (600000 against 6000.00, 1200000 against 12000.00), which
 * is Razorpay's own convention. An earlier draft of this file had it backwards on the strength
 * of a plausible-sounding brief, which would have printed a 12,000 rupee order as 12,00,000
 * and written a 6,000 rupee sale as 60. See `paiseForPayment` and `rupeesFromPaise` below:
 * every crossing of that boundary goes through one of those two functions, so the column can
 * never end up with some rows 100x the others.
 */

/* ------------------------------------------------------------------------------------------ */
/* Vocabulary                                                                                  */
/* ------------------------------------------------------------------------------------------ */

/**
 * The enum members, as arrays, for validating query strings and request bodies and for
 * building selects. Written out rather than taken from the generated `$Enums` object so that
 * this module needs no runtime import from `@prisma/client` — which also keeps it importable
 * from a plain unit test.
 *
 * `QUOTE_REQUESTED` exists because two of the eight live orders are RFQs: a quote the shop has
 * not priced yet. It is a status, not a payment state, and the list is in the order the
 * statuses actually progress rather than alphabetical.
 */
export const ORDER_STATUSES = [
  'PENDING',
  'QUOTE_REQUESTED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
] as const satisfies readonly OrderStatus[];

export const PAYMENT_STATUSES = [
  'PENDING',
  'PAID',
  'FAILED',
  'REFUNDED',
] as const satisfies readonly PaymentStatus[];

export const ORDER_TYPES = ['STANDARD', 'RFQ'] as const satisfies readonly OrderType[];

/**
 * The keys the live `shippingAddress` JSON actually uses. Order matters: it is the order an
 * address is read aloud in, and both the detail screen and the invoice render it from here so
 * they cannot drift apart.
 *
 * The column is `Json?`, so it is not a contract — a row may be missing a key or carry one
 * nobody here knows about. Readers must tolerate both; `addressEntries` does.
 */
export const ADDRESS_KEYS = [
  'fullName',
  'phone',
  'email',
  'street',
  'city',
  'state',
  'postalCode',
] as const;

export type AddressKey = (typeof ADDRESS_KEYS)[number];
export type ShippingAddress = Partial<Record<AddressKey, string>>;

/* ------------------------------------------------------------------------------------------ */
/* Failures                                                                                    */
/* ------------------------------------------------------------------------------------------ */

/** No order with that id. The routes answer 404. */
export class OrderNotFoundError extends Error {
  constructor(id: string) {
    super(`No order with id ${id}`);
    this.name = 'OrderNotFoundError';
  }
}

/**
 * The request is malformed, or the data it names does not exist. `field` is the form control
 * the message belongs to, so the screen can put the sentence where the mistake is instead of
 * showing one banner for every kind of refusal.
 */
export class OrderValidationError extends Error {
  readonly field: string;

  constructor(field: string, message: string) {
    super(message);
    this.name = 'OrderValidationError';
    this.field = field;
  }
}

export interface StockShortfall {
  productVariantId: string;
  /** "Chanderi saree · M", built from the product and variant actually in the database. */
  label: string;
  want: number;
  have: number;
}

/**
 * At least one line would take a variant's stock below zero, so none of the order was written.
 *
 * A partially recorded sale is the worst outcome available here: the shop would hold an order
 * that does not match what left the shelf, with no way to tell which half is wrong. So the
 * whole transaction is refused and every short line is named — not just the first — because
 * the person at the counter is about to retype the form and should only have to do it once.
 */
export class InsufficientStockError extends Error {
  readonly shortfalls: StockShortfall[];

  constructor(shortfalls: StockShortfall[]) {
    super(
      `Not enough stock for ${shortfalls.length} line(s): ` +
        shortfalls
          .map(short => `${short.label} (wanted ${short.want}, have ${short.have})`)
          .join('; ')
    );
    this.name = 'InsufficientStockError';
    this.shortfalls = shortfalls;
  }
}

/* ------------------------------------------------------------------------------------------ */
/* Money                                                                                       */
/* ------------------------------------------------------------------------------------------ */

/**
 * Round to paise.
 *
 * `price` is `Decimal(10,2)` in the database and a JavaScript `number` everywhere in this
 * module, so every sum passes through here before it is compared or stored. Without it
 * `3 * 19.99` is 59.97000000000001, which makes a subtotal differ from a total that is in fact
 * identical — and this module decides whether to print an "Adjustment" row by exactly that
 * comparison.
 */
export function money(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface LineLike {
  quantity: number;
  price: number;
}

/** One line's money: unit price times quantity. */
export function lineTotal(line: LineLike): number {
  return money(line.quantity * line.price);
}

/** What the lines add up to. The only subtotal there is — no column stores one. */
export function subtotalOf(lines: readonly LineLike[]): number {
  return money(lines.reduce((sum, line) => sum + lineTotal(line), 0));
}

export interface InvoiceTotals {
  /** Sum of the lines. */
  subtotal: number;
  /** `Order.totalAmount`, which is the only total the database records. */
  total: number;
  /**
   * `total - subtotal`, and zero when they agree.
   *
   * WHY THIS IS NOT CALLED "DISCOUNT" OR "SHIPPING". The schema has no column for either, and
   * the difference on a real row could be either, or a negotiated rounding, or a charge
   * entered by hand at checkout. Naming it would be inventing a fact about someone's order, so
   * the invoice prints one "Adjustment" row and says in words that it is the difference
   * between the lines and the recorded total.
   */
  adjustment: number;
}

export function invoiceTotals(lines: readonly LineLike[], totalAmount: number): InvoiceTotals {
  const subtotal = subtotalOf(lines);
  const total = money(totalAmount);
  return { subtotal, total, adjustment: money(total - subtotal) };
}

/**
 * The integer this module writes into `Payment.amount`: **paise**.
 *
 * NOT AN ASSUMPTION — measured. Every row in `Payment` is exactly 100× its order's
 * `totalAmount` (600000 : 6000.00, and 1200000 : 12000.00, on all five rows), which is the
 * convention Razorpay's API uses and therefore the one the webhook that wrote those rows was
 * following.
 *
 * An earlier draft of this file had it backwards, on the strength of a plausible-sounding
 * brief rather than a query. That version would have printed a ₹12,000 order as ₹12,00,000
 * on the detail screen and the invoice, and written a ₹6,000 counter sale as 6000 paise —
 * ₹60. Worth remembering: the brief was confident and wrong, and one `SELECT` settled it.
 *
 * Paise also loses nothing. A sale of ₹1,234.50 is 123450 exactly, where a rupee column would
 * have had to round it; `Order.totalAmount` keeps the Decimal either way.
 *
 * The inverse is `rupeesFromPaise`, and between them they are the only two places in the
 * codebase that cross this boundary. A column with some rows in rupees and some in paise
 * cannot be repaired afterwards, because nothing later can tell which row is which.
 */
export function paiseForPayment(rupees: number): number {
  return Math.round(money(rupees) * 100);
}

/** Paise back to rupees, for every screen that prints a stored `Payment.amount`. */
export function rupeesFromPaise(paise: number): number {
  return money(paise / 100);
}

/* ------------------------------------------------------------------------------------------ */
/* Reading the address JSON                                                                    */
/* ------------------------------------------------------------------------------------------ */

export interface AddressEntry {
  key: string;
  /** "Postal code" for a known key, the raw key for one nobody here knows about. */
  label: string;
  value: string;
  /** False for a key outside `ADDRESS_KEYS`, which the screen marks as recorded-as-is. */
  known: boolean;
}

const ADDRESS_LABELS: Record<AddressKey, string> = {
  fullName: 'Name',
  phone: 'Phone',
  email: 'Email',
  street: 'Street',
  city: 'City',
  state: 'State',
  postalCode: 'Postal code',
};

function asText(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'string') return raw.trim();
  if (typeof raw === 'number' || typeof raw === 'boolean') return String(raw);
  return JSON.stringify(raw);
}

/**
 * The address as a list to render: the seven known keys first, in reading order, then anything
 * else the row happens to carry.
 *
 * Tolerant in both directions on purpose. `shippingAddress` is a JSON column written by the
 * storefront checkout, so a row may predate a key, hold a null where a string is expected, or
 * carry a field this build has never heard of. Dropping the unknown ones would hide data from
 * the only person able to act on it; crashing on a null would take the whole order detail
 * screen down over a missing postal code. Empty values are omitted rather than printed as
 * blank rows, since a blank row says nothing but looks like a fault.
 */
export function addressEntries(value: unknown): AddressEntry[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  const source = value as Record<string, unknown>;
  const entries: AddressEntry[] = [];

  for (const key of ADDRESS_KEYS) {
    const written = asText(source[key]);
    if (written) entries.push({ key, label: ADDRESS_LABELS[key], value: written, known: true });
  }

  for (const key of Object.keys(source)) {
    if ((ADDRESS_KEYS as readonly string[]).includes(key)) continue;
    const written = asText(source[key]);
    if (written) entries.push({ key, label: key, value: written, known: false });
  }

  return entries;
}

/**
 * The address to store for a walk-in sale: the same seven keys, trimmed, with the empty ones
 * left out, and `null` when nothing was filled in at all.
 *
 * `null` rather than `{}` matters: the detail screen tells "no address was recorded" apart
 * from "an address was recorded and it is empty", and only the first is true of a counter sale
 * the customer carries home themselves.
 */
export function normalizeShippingAddress(input: unknown): ShippingAddress | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const source = input as Record<string, unknown>;

  const address: ShippingAddress = {};
  for (const key of ADDRESS_KEYS) {
    const raw = source[key];
    const written = typeof raw === 'string' ? raw.trim() : '';
    if (written) address[key] = written;
  }

  return Object.keys(address).length > 0 ? address : null;
}

/* ------------------------------------------------------------------------------------------ */
/* Filters and paging                                                                          */
/* ------------------------------------------------------------------------------------------ */

export interface OrderFilters {
  /** Free text, matched against the order id and every name the customer could be under. */
  search?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  type?: OrderType;
  page?: number;
  perPage?: number;
}

export const DEFAULT_PER_PAGE = 20;
const MAX_PER_PAGE = 100;

/**
 * The `where` for a list query.
 *
 * Pure and exported, because it is the part of listing worth testing: an `OR` that quietly
 * loses a branch means a guest order that cannot be found by the only name anybody knows it
 * by, and no test of Prisma would catch that.
 *
 * The search covers both customer shapes. An order belongs either to a `Profile` (whose name
 * lives in another table) or to a guest (whose name lives in the `guest*` columns on the order
 * itself), and the person searching does not know which — they have a name off a WhatsApp
 * message. `id` is matched with `contains` rather than equality because the screens show a
 * shortened reference, and the eight characters off an invoice have to find their order.
 * `mode: 'insensitive'` is on the name fields only; it would be pointless on a lower-case uuid.
 */
export function buildOrderWhere(filters: OrderFilters): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {};

  if (filters.status) where.status = filters.status;
  if (filters.paymentStatus) where.paymentStatus = filters.paymentStatus;
  if (filters.type) where.type = filters.type;

  const search = filters.search?.trim();
  if (search) {
    where.OR = [
      { id: { contains: search } },
      { guestName: { contains: search, mode: 'insensitive' } },
      { guestEmail: { contains: search, mode: 'insensitive' } },
      { guestPhone: { contains: search } },
      { trackingId: { contains: search, mode: 'insensitive' } },
      { Profile: { fullName: { contains: search, mode: 'insensitive' } } },
      { Profile: { email: { contains: search, mode: 'insensitive' } } },
    ];
  }

  return where;
}

export interface Paging {
  page: number;
  perPage: number;
  skip: number;
  take: number;
}

/**
 * Page numbers off a URL are whatever someone typed: `0`, `-3`, `abc`, `1e9`. Clamped here
 * once so no caller has to, and capped at 100 so a bookmarked `?perPage=100000` cannot ask the
 * database for the whole table.
 */
export function resolvePaging(filters: OrderFilters): Paging {
  const page = Math.max(1, Math.floor(Number(filters.page) || 1));
  const asked = Math.floor(Number(filters.perPage) || DEFAULT_PER_PAGE);
  const perPage = Math.min(MAX_PER_PAGE, Math.max(1, asked));
  return { page, perPage, skip: (page - 1) * perPage, take: perPage };
}

/* ------------------------------------------------------------------------------------------ */
/* Stock                                                                                       */
/* ------------------------------------------------------------------------------------------ */

/**
 * What each variant is asked for across the whole order.
 *
 * Summed per variant rather than per line, because the form lets the same product and size be
 * added twice (two of the same blouse, different measurements) and two lines of five against a
 * stock of eight must be refused. Checking line by line would pass both.
 */
export function demandByVariant(
  lines: readonly { productVariantId: string; quantity: number }[]
): Record<string, number> {
  const demand: Record<string, number> = {};
  for (const line of lines) {
    demand[line.productVariantId] = (demand[line.productVariantId] ?? 0) + line.quantity;
  }
  return demand;
}

/** Every variant the order would take below zero, with what it wanted and what it had. */
export function findShortfalls(
  demand: Record<string, number>,
  available: Record<string, { label: string; stock: number }>
): StockShortfall[] {
  const shortfalls: StockShortfall[] = [];
  for (const [productVariantId, want] of Object.entries(demand)) {
    const variant = available[productVariantId];
    const have = variant?.stock ?? 0;
    if (want > have) {
      shortfalls.push({ productVariantId, label: variant?.label ?? productVariantId, want, have });
    }
  }
  return shortfalls;
}

/* ------------------------------------------------------------------------------------------ */
/* The shapes the screens read                                                                 */
/* ------------------------------------------------------------------------------------------ */

/**
 * Dates are ISO strings and money is `number`, not `Decimal`, in everything this module hands
 * out. A `Decimal` serialises through `JSON.stringify` as a string, so leaving it in means the
 * list screen does arithmetic on `"6000"` — and `"6000" + 0` is `"60000"`. Converted once,
 * here, at the only boundary where the Decimal is still a Decimal.
 */
export interface OrderListRow {
  id: string;
  createdAt: string;
  /** The account holder's name, else the guest's, else null when neither was recorded. */
  customerName: string | null;
  isGuest: boolean;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  type: OrderType;
  totalAmount: number;
  /** Garments, i.e. the sum of the quantities — what a shop means by "how many items". */
  itemCount: number;
  /** Distinct lines, which is a different number and the one the detail screen lists. */
  lineCount: number;
}

export interface OrderListResult {
  orders: OrderListRow[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface OrderDetailItem {
  id: string;
  productId: string;
  /** Null only if the product row has gone, which the required FK should prevent. */
  productName: string | null;
  photo: string | null;
  productVariantId: string;
  size: string | null;
  color: string | null;
  quantity: number;
  price: number;
  lineTotal: number;
  /** Whatever the checkout recorded. Rendered as a labelled list, never as markup. */
  customMeasurements: Record<string, unknown> | null;
}

export interface OrderDetailPayment {
  id: string;
  provider: string;
  providerOrderId: string;
  providerPaymentId: string | null;
  /** Paise, as stored — see `rupeesFromPaise` before printing it. */
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

export interface OrderDetail {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  type: OrderType;
  totalAmount: number;
  isGuest: boolean;
  customer: {
    name: string | null;
    email: string | null;
    phone: string | null;
    /** Which columns the three fields above came out of. */
    source: 'account' | 'guest' | 'unrecorded';
  };
  shippingAddress: AddressEntry[];
  /** True when the column held something, even if nothing readable came out of it. */
  shippingAddressRecorded: boolean;
  items: OrderDetailItem[];
  payments: OrderDetailPayment[];
  totals: InvoiceTotals;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  trackingId: string | null;
  trackingUrl: string | null;
}

/* ------------------------------------------------------------------------------------------ */
/* Reads                                                                                       */
/* ------------------------------------------------------------------------------------------ */

/**
 * One page of orders, newest first.
 *
 * The secondary sort on `id` is not decoration: every one of the eight live orders carries the
 * same `createdAt` date, and Postgres gives no stable order among ties. Without a tiebreak,
 * page two can repeat a row page one already showed and drop one nobody ever sees.
 */
export async function listOrders(filters: OrderFilters = {}): Promise<OrderListResult> {
  const where = buildOrderWhere(filters);
  const { page, perPage, skip, take } = resolvePaging(filters);

  const [total, rows] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip,
      take,
      include: {
        Profile: { select: { fullName: true } },
        // Quantities only: the list shows a count, and pulling prices and measurements for
        // every row to add up two integers is a page of JSON nobody reads.
        OrderItem: { select: { quantity: true } },
      },
    }),
  ]);

  return {
    orders: rows.map(row => ({
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      customerName: row.Profile?.fullName ?? row.guestName ?? null,
      isGuest: row.isGuest === true,
      status: row.status,
      paymentStatus: row.paymentStatus,
      type: row.type,
      totalAmount: Number(row.totalAmount),
      itemCount: row.OrderItem.reduce((sum, item) => sum + item.quantity, 0),
      lineCount: row.OrderItem.length,
    })),
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

/** One order with everything the detail screen and the invoice need. Throws if there is none. */
export async function getOrder(id: string): Promise<OrderDetail> {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      Profile: { select: { fullName: true, email: true, phone: true } },
      OrderItem: {
        orderBy: { id: 'asc' },
        include: {
          Product: { select: { name: true, photos: true } },
          ProductVariant: { select: { size: true, color: true } },
        },
      },
      Payment: { orderBy: { created_at: 'asc' } },
    },
  });

  if (!order) throw new OrderNotFoundError(id);

  const items: OrderDetailItem[] = order.OrderItem.map(item => {
    const price = Number(item.price);
    const measurements =
      item.customMeasurements &&
      typeof item.customMeasurements === 'object' &&
      !Array.isArray(item.customMeasurements)
        ? (item.customMeasurements as Record<string, unknown>)
        : null;

    return {
      id: item.id,
      productId: item.productId,
      productName: item.Product?.name ?? null,
      photo: item.Product?.photos?.[0] ?? null,
      productVariantId: item.productVariantId,
      size: item.ProductVariant?.size ?? null,
      color: item.ProductVariant?.color ?? null,
      quantity: item.quantity,
      price,
      lineTotal: lineTotal({ quantity: item.quantity, price }),
      customMeasurements: measurements,
    };
  });

  // An order has a profile or it has guest columns; it is also allowed to have neither, and
  // saying "not recorded" is more use to the reader than an empty block with no explanation.
  const profile = order.Profile;
  const source: OrderDetail['customer']['source'] = profile
    ? 'account'
    : order.guestName || order.guestEmail || order.guestPhone
      ? 'guest'
      : 'unrecorded';

  return {
    id: order.id,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    status: order.status,
    paymentStatus: order.paymentStatus,
    type: order.type,
    totalAmount: Number(order.totalAmount),
    isGuest: order.isGuest === true,
    customer: {
      name: profile?.fullName ?? order.guestName ?? null,
      email: profile?.email ?? order.guestEmail ?? null,
      phone: profile?.phone ?? order.guestPhone ?? null,
      source,
    },
    shippingAddress: addressEntries(order.shippingAddress),
    shippingAddressRecorded: order.shippingAddress !== null && order.shippingAddress !== undefined,
    items,
    payments: order.Payment.map(payment => ({
      id: payment.id,
      provider: payment.provider,
      providerOrderId: payment.provider_order_id,
      providerPaymentId: payment.provider_payment_id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      createdAt: payment.created_at.toISOString(),
    })),
    totals: invoiceTotals(items, Number(order.totalAmount)),
    razorpayOrderId: order.razorpayOrderId,
    razorpayPaymentId: order.razorpayPaymentId,
    trackingId: order.trackingId,
    trackingUrl: order.trackingUrl,
  };
}

export interface SellableVariant {
  id: string;
  size: string;
  color: string | null;
  stock: number;
}

export interface SellableProduct {
  id: string;
  name: string;
  photo: string | null;
  price: number;
  variants: SellableVariant[];
}

export interface SellableCatalogue {
  /** Products with at least one `ProductVariant`: the only ones an offline line can name. */
  products: SellableProduct[];
  /**
   * Products with none, by name.
   *
   * These are listed, not hidden. Thirteen of the fifteen products are in here today, so a
   * picker that offered two items and said nothing would read as a broken query. The form
   * names them and says a size has to exist first; it does not offer to create one, because a
   * variant carries stock and inventing stock is inventing a fact about the shelf.
   */
  withoutVariants: { id: string; name: string }[];
}

/** The catalogue split by whether a product can be sold through the offline form at all. */
export async function listSellableProducts(): Promise<SellableCatalogue> {
  const rows = await prisma.product.findMany({
    where: { isArchived: false },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      photos: true,
      price: true,
      ProductVariant: {
        orderBy: [{ size: 'asc' }, { color: 'asc' }],
        select: { id: true, size: true, color: true, stock: true },
      },
    },
  });

  const products: SellableProduct[] = [];
  const withoutVariants: { id: string; name: string }[] = [];

  for (const row of rows) {
    if (row.ProductVariant.length === 0) {
      withoutVariants.push({ id: row.id, name: row.name });
      continue;
    }
    products.push({
      id: row.id,
      name: row.name,
      photo: row.photos?.[0] ?? null,
      price: Number(row.price),
      variants: row.ProductVariant.map(variant => ({
        id: variant.id,
        size: variant.size,
        color: variant.color,
        stock: variant.stock,
      })),
    });
  }

  return { products, withoutVariants };
}

/* ------------------------------------------------------------------------------------------ */
/* Writes                                                                                      */
/* ------------------------------------------------------------------------------------------ */

export interface OrderPatch {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  /** An empty string clears the column; `undefined` leaves it alone. */
  trackingId?: string | null;
  trackingUrl?: string | null;
}

/**
 * What a patch may legitimately change, checked before it reaches the database.
 *
 * Pure so it can be tested, and shared by the route and the repository so the rule is stated
 * once. The tracking URL is the only field with a shape: it ends up as an `href` on the detail
 * screen, and `javascript:` in an admin's own browser is the one link in this module worth
 * refusing outright.
 */
export function validateOrderPatch(input: unknown): OrderPatch {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new OrderValidationError('body', 'Expected an object');
  }
  const body = input as Record<string, unknown>;
  const patch: OrderPatch = {};

  if (body.status !== undefined) {
    const status = String(body.status).toUpperCase();
    if (!(ORDER_STATUSES as readonly string[]).includes(status)) {
      throw new OrderValidationError(
        'status',
        `status must be one of ${ORDER_STATUSES.join(', ')}`
      );
    }
    patch.status = status as OrderStatus;
  }

  if (body.paymentStatus !== undefined) {
    const paymentStatus = String(body.paymentStatus).toUpperCase();
    if (!(PAYMENT_STATUSES as readonly string[]).includes(paymentStatus)) {
      throw new OrderValidationError(
        'paymentStatus',
        `paymentStatus must be one of ${PAYMENT_STATUSES.join(', ')}`
      );
    }
    patch.paymentStatus = paymentStatus as PaymentStatus;
  }

  if (body.trackingId !== undefined) {
    if (body.trackingId !== null && typeof body.trackingId !== 'string') {
      throw new OrderValidationError('trackingId', 'trackingId must be text');
    }
    const trackingId = typeof body.trackingId === 'string' ? body.trackingId.trim() : '';
    patch.trackingId = trackingId || null;
  }

  if (body.trackingUrl !== undefined) {
    if (body.trackingUrl !== null && typeof body.trackingUrl !== 'string') {
      throw new OrderValidationError('trackingUrl', 'trackingUrl must be text');
    }
    const trackingUrl = typeof body.trackingUrl === 'string' ? body.trackingUrl.trim() : '';
    if (trackingUrl && !/^https?:\/\/\S+$/i.test(trackingUrl)) {
      throw new OrderValidationError(
        'trackingUrl',
        'The tracking link must start with http:// or https://'
      );
    }
    patch.trackingUrl = trackingUrl || null;
  }

  if (Object.keys(patch).length === 0) {
    throw new OrderValidationError(
      'body',
      'Nothing to change: expected status, paymentStatus, trackingId or trackingUrl'
    );
  }

  return patch;
}

/**
 * Apply a patch and read the order back.
 *
 * `updatedAt` is set here because the column is not `@updatedAt` (see the header). Marking an
 * order PAID does NOT write a `Payment` row: `Payment.provider_order_id` is unique and belongs
 * to whatever actually took the money, and fabricating one for a status an admin flipped by
 * hand would put a receipt in the ledger for a payment nobody can point at. The offline form,
 * which does know how the money arrived, is the only thing in this module that writes a
 * payment.
 */
export async function updateOrder(id: string, patch: OrderPatch): Promise<OrderDetail> {
  const existing = await prisma.order.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new OrderNotFoundError(id);

  await prisma.order.update({ where: { id }, data: { ...patch, updatedAt: new Date() } });

  return getOrder(id);
}

export interface OfflineLineInput {
  productId: string;
  productVariantId: string;
  quantity: number;
  /** Rupees per garment. Editable in the form on purpose: a counter negotiates. */
  price: number;
  customMeasurements?: Record<string, unknown> | null;
}

export interface OfflineOrderInput {
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  address?: unknown;
  items: OfflineLineInput[];
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
}

export interface NormalizedOfflineOrder {
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  address: ShippingAddress | null;
  items: Required<OfflineLineInput>[];
  status: OrderStatus;
  paymentStatus: PaymentStatus;
}

/**
 * Everything that can be decided about a walk-in sale without asking the database.
 *
 * Pure, exported and tested: it is where a bad quantity or a missing size is caught, and the
 * messages it throws are the ones the person at the counter reads. What it cannot know is
 * whether the ids exist, whether the variant belongs to the product, or whether there is stock
 * — all three need rows, and all three are checked inside the transaction below.
 *
 * The customer's name is the one required field. Phone and email are not, because a walk-in
 * may give neither, and an order that cannot be recorded without an email address is an order
 * that gets recorded on paper instead.
 */
export function normalizeOfflineOrder(input: unknown): NormalizedOfflineOrder {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new OrderValidationError('body', 'Expected an object');
  }
  const body = input as Record<string, unknown>;

  const customerName = typeof body.customerName === 'string' ? body.customerName.trim() : '';
  if (!customerName) {
    throw new OrderValidationError('customerName', 'The customer’s name is needed');
  }

  const optionalText = (value: unknown): string | null => {
    const written = typeof value === 'string' ? value.trim() : '';
    return written || null;
  };

  const rawItems = Array.isArray(body.items) ? body.items : [];
  if (rawItems.length === 0) {
    throw new OrderValidationError('items', 'An order needs at least one line');
  }

  const items = rawItems.map((raw, index) => {
    const position = index + 1;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new OrderValidationError(`items.${index}`, `Line ${position} is not a line`);
    }
    const line = raw as Record<string, unknown>;

    const productId = typeof line.productId === 'string' ? line.productId.trim() : '';
    if (!productId) {
      throw new OrderValidationError(`items.${index}.productId`, `Line ${position} has no product`);
    }

    const productVariantId =
      typeof line.productVariantId === 'string' ? line.productVariantId.trim() : '';
    if (!productVariantId) {
      // The honest wording: the column is required, so this is not a blank we can fill in.
      throw new OrderValidationError(
        `items.${index}.productVariantId`,
        `Line ${position} has no size. Every line must name a size that exists for that product.`
      );
    }

    const quantity = Number(line.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new OrderValidationError(
        `items.${index}.quantity`,
        `Line ${position} needs a whole quantity of 1 or more`
      );
    }

    const price = Number(line.price);
    if (!Number.isFinite(price) || price < 0) {
      throw new OrderValidationError(
        `items.${index}.price`,
        `Line ${position} needs a price of 0 or more`
      );
    }

    const measurements =
      line.customMeasurements &&
      typeof line.customMeasurements === 'object' &&
      !Array.isArray(line.customMeasurements)
        ? (line.customMeasurements as Record<string, unknown>)
        : null;

    return {
      productId,
      productVariantId,
      quantity,
      price: money(price),
      customMeasurements:
        measurements && Object.keys(measurements).length > 0 ? measurements : null,
    };
  });

  const status = body.status === undefined ? 'PENDING' : String(body.status).toUpperCase();
  if (!(ORDER_STATUSES as readonly string[]).includes(status)) {
    throw new OrderValidationError('status', `status must be one of ${ORDER_STATUSES.join(', ')}`);
  }

  const paymentStatus =
    body.paymentStatus === undefined ? 'PENDING' : String(body.paymentStatus).toUpperCase();
  if (!(PAYMENT_STATUSES as readonly string[]).includes(paymentStatus)) {
    throw new OrderValidationError(
      'paymentStatus',
      `paymentStatus must be one of ${PAYMENT_STATUSES.join(', ')}`
    );
  }

  return {
    customerName,
    customerPhone: optionalText(body.customerPhone),
    customerEmail: optionalText(body.customerEmail),
    address: normalizeShippingAddress(body.address),
    items,
    status: status as OrderStatus,
    paymentStatus: paymentStatus as PaymentStatus,
  };
}

/**
 * Record a walk-in sale: one order, its lines, the stock that left the shelf, and — when the
 * money is already in — the payment.
 *
 * ALL OF IT IN ONE TRANSACTION, because three of those four writes are only true together. An
 * order whose stock was not decremented overstates the shelf; a decrement whose order was not
 * written understates it; a payment against a missing order is a receipt for nothing.
 *
 * THE STOCK IS CHECKED TWICE, DELIBERATELY. The read up front is what produces a sentence
 * worth showing a human ("Chanderi saree · M: wanted 3, have 1"), naming every short line at
 * once. The decrement then runs as `updateMany` with `stock: { gte: want }` in its own `where`,
 * and a count of 0 rows means the number moved between the read and the write — the storefront
 * sold the last one while the form was open. That cannot produce as good a message, because by
 * then the rest of the order is already written, so it throws and the transaction unwinds. The
 * first check is for the reader; the second is for correctness.
 */
export async function createOfflineOrder(input: OfflineOrderInput | unknown): Promise<OrderDetail> {
  const order = normalizeOfflineOrder(input);

  // The only total there is: a counter sale has no shipping line and no gateway fee, so the
  // lines ARE the order. `totalAmount` is set from this, which is also why a freshly recorded
  // offline order never shows an "Adjustment" row on its invoice.
  const subtotal = subtotalOf(order.items);

  const orderId = await prisma.$transaction(async tx => {
    const variantIds = [...new Set(order.items.map(item => item.productVariantId))];
    const variants = await tx.productVariant.findMany({
      where: { id: { in: variantIds } },
      select: {
        id: true,
        productId: true,
        size: true,
        stock: true,
        Product: { select: { name: true } },
      },
    });
    const byId = new Map(variants.map(variant => [variant.id, variant]));

    // Existence and ownership before stock: "that size is not on that product" is a different
    // mistake from "there are none left", and conflating them sends someone hunting for stock
    // that was never the problem.
    for (const [index, item] of order.items.entries()) {
      const variant = byId.get(item.productVariantId);
      if (!variant) {
        throw new OrderValidationError(
          `items.${index}.productVariantId`,
          `Line ${index + 1} names a size that no longer exists. Reload the form and pick again.`
        );
      }
      if (variant.productId !== item.productId) {
        throw new OrderValidationError(
          `items.${index}.productVariantId`,
          `Line ${index + 1} pairs a size with another product’s item. Reload the form and pick again.`
        );
      }
    }

    const available: Record<string, { label: string; stock: number }> = {};
    for (const variant of variants) {
      available[variant.id] = {
        label: `${variant.Product?.name ?? 'Product'} · ${variant.size}`,
        stock: variant.stock,
      };
    }

    const demand = demandByVariant(order.items);
    const shortfalls = findShortfalls(demand, available);
    if (shortfalls.length > 0) throw new InsufficientStockError(shortfalls);

    const id = crypto.randomUUID();
    const now = new Date();

    await tx.order.create({
      data: {
        // No `@default` on this column, and none on `updatedAt` either: see the header.
        id,
        updatedAt: now,
        status: order.status,
        paymentStatus: order.paymentStatus,
        // STANDARD, not RFQ: a counter sale has a price and a quantity, which is exactly what
        // an RFQ is the absence of.
        type: 'STANDARD',
        totalAmount: subtotal,
        // A walk-in has no account, so the guest columns are the only place the name, phone
        // and email can live, and `isGuest` is what tells a later reader that this is why
        // `profileId` is null.
        isGuest: true,
        guestName: order.customerName,
        guestPhone: order.customerPhone,
        guestEmail: order.customerEmail,
        shippingAddress: (order.address ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });

    await tx.orderItem.createMany({
      data: order.items.map(item => ({
        id: crypto.randomUUID(),
        orderId: id,
        productId: item.productId,
        productVariantId: item.productVariantId,
        quantity: item.quantity,
        price: item.price,
        customMeasurements: (item.customMeasurements ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
      })),
    });

    for (const [productVariantId, want] of Object.entries(demand)) {
      const moved = await tx.productVariant.updateMany({
        where: { id: productVariantId, stock: { gte: want } },
        data: { stock: { decrement: want }, updatedAt: now },
      });
      if (moved.count === 0) {
        const variant = available[productVariantId];
        throw new InsufficientStockError([
          {
            productVariantId,
            label: variant?.label ?? productVariantId,
            want,
            // The figure read a moment ago, not a fresh one: re-reading inside the same
            // transaction would report the same number at the cost of another round trip, and
            // what matters here is only that nothing was written.
            have: variant?.stock ?? 0,
          },
        ]);
      }
    }

    if (order.paymentStatus === 'PAID') {
      await tx.payment.create({
        data: {
          id: crypto.randomUUID(),
          orderId: id,
          // Not "razorpay", which is the column's default and would be a lie about a sale that
          // happened at a counter.
          provider: 'offline',
          // `provider_order_id` is UNIQUE across the table, and an offline sale has no gateway
          // reference to put in it. The order id is already unique, so prefixing it is both
          // collision-free and legible in a query: "offline-" says where the money came from.
          provider_order_id: `offline-${id}`,
          amount: paiseForPayment(subtotal),
          currency: 'INR',
          // The gateway rows use lower-case words in this free-text column; "captured" is the
          // one that means the money is in.
          status: 'captured',
          updated_at: now,
          // The breakdown the admin typed, kept because nothing else in the schema records how
          // an offline total was arrived at. `lines` mirrors the OrderItems, and `subtotal` is
          // the same figure in rupees that the Int `amount` above holds in paise.
          metadata: {
            source: 'admin.offline-order',
            recordedAt: now.toISOString(),
            subtotal,
            amountConvention: 'paise',
            lines: order.items.map(item => ({
              productId: item.productId,
              productVariantId: item.productVariantId,
              quantity: item.quantity,
              price: item.price,
              lineTotal: lineTotal(item),
            })),
          } as Prisma.InputJsonValue,
        },
      });
    }

    return id;
  });

  return getOrder(orderId);
}
