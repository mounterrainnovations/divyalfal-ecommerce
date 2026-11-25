import type { OrderStatus, OrderType, PaymentStatus } from '@prisma/client';
import type { BadgeTone } from '@/components/admin/styles';
import type { OrderDetail, OrderListResult } from '@/lib/repositories/orders';

/**
 * What the four Orders screens all need to say the same way: the words for each enum member,
 * the pill each one wears, a short order reference, and money.
 *
 * WHY THE OPTION LISTS ARE REPEATED HERE. `lib/repositories/orders.ts` already exports
 * `ORDER_STATUSES` and friends, but it imports `@/lib/db` — importing it from a client
 * component would pull Prisma into the browser bundle. Types are erased, so
 * `import type { OrderDetail }` below costs nothing; a value import would not be free. So the
 * repository owns the server's copy and this file owns the browser's, and the two are kept in
 * step by `orders.test.ts`, which asserts the lists match member for member. That test is the
 * reason this duplication is safe rather than a trap.
 */

/* ------------------------------------------------------------------------------------------ */
/* The shapes the screens receive                                                              */
/* ------------------------------------------------------------------------------------------ */

export type OrderRow = OrderListResult['orders'][number];
export type { OrderDetail, OrderListResult };

/* ------------------------------------------------------------------------------------------ */
/* Words                                                                                       */
/* ------------------------------------------------------------------------------------------ */

/**
 * Statuses in the order they actually happen, which is the order a select should offer them
 * in. `QUOTE_REQUESTED` sits second because that is where an RFQ enters the sequence: a quote
 * is asked for, then it becomes an order or it does not.
 */
export const ORDER_STATUS_OPTIONS = [
  'PENDING',
  'QUOTE_REQUESTED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
] as const satisfies readonly OrderStatus[];

export const PAYMENT_STATUS_OPTIONS = [
  'PENDING',
  'PAID',
  'FAILED',
  'REFUNDED',
] as const satisfies readonly PaymentStatus[];

export const ORDER_TYPE_OPTIONS = ['STANDARD', 'RFQ'] as const satisfies readonly OrderType[];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  QUOTE_REQUESTED: 'Quote requested',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  RETURNED: 'Returned',
};

export const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  PENDING: 'Unpaid',
  PAID: 'Paid',
  FAILED: 'Failed',
  REFUNDED: 'Refunded',
};

/**
 * `OrderType` in words, for the channel filter.
 *
 * The three channels an owner thinks in are the website, the counter, and a quote request, but
 * the column holds only two values: a counter sale is written as STANDARD with `isGuest` set.
 * So the filter says "Order" for STANDARD rather than claiming it means "website" — the honest
 * reading of the two columns together is `channelOf` below, and that is what the rows show.
 */
export const TYPE_LABEL: Record<OrderType, string> = {
  STANDARD: 'Order',
  RFQ: 'Quote request',
};

/**
 * The pill each state wears.
 *
 * Colour never carries the fact — every badge also prints its word — so these are
 * reinforcement: the accent for the two states that mean "do something" (a pending order, an
 * unpaid one), success for the two that mean "done", danger for a real failure, and neutral
 * for the ends of the road.
 */
export const STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  PENDING: 'accent',
  QUOTE_REQUESTED: 'accent',
  SHIPPED: 'info',
  DELIVERED: 'success',
  CANCELLED: 'neutral',
  RETURNED: 'warn',
};

export const PAYMENT_TONE: Record<PaymentStatus, BadgeTone> = {
  PENDING: 'warn',
  PAID: 'success',
  FAILED: 'danger',
  REFUNDED: 'neutral',
};

/**
 * How the order reached the shop, read from the two columns that actually know.
 *
 * An RFQ is an RFQ. Everything else is a website order unless it was written by the offline
 * form, which is the only thing that sets `isGuest` on a STANDARD order — the storefront
 * checkout records a guest purchase the same way, so this is a reading of the data and not a
 * fact the schema guarantees. The wording is hedged accordingly: "Counter or guest".
 */
export function channelOf(order: { type: OrderType; isGuest: boolean }): string {
  if (order.type === 'RFQ') return 'Quote request';
  return order.isGuest ? 'Counter or guest' : 'Website account';
}

/* ------------------------------------------------------------------------------------------ */
/* References, dates and money                                                                 */
/* ------------------------------------------------------------------------------------------ */

/**
 * The first eight characters of the uuid, which is what every screen and the invoice call an
 * order.
 *
 * There is NO invoice-number column in this schema, and this module does not add one: a
 * sequence that resets whenever the code is redeployed is worse than no sequence at all. So
 * the order id is the reference, shortened for a human to read back over a phone, and the
 * invoice says in words that this is what it is. The list screen's search matches on
 * `contains`, so the shortened form finds its order.
 */
export function shortRef(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

/** 10 May 2026 — an order's date is read as a date, not as a worklist timestamp. */
export function orderDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** 10 May 2026, 14:05 — for the detail screen, where the time of day matters. */
export function orderDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return `${orderDate(iso)}, ${date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })}`;
}

const RUPEES = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/**
 * ₹12,000 and ₹1,234.50.
 *
 * Paise are shown only when there are paise. `lib/utils/price.ts` is the storefront's
 * formatter and drops the decimals unconditionally, which is right for a price tag and wrong
 * for an invoice line that has to add up in front of a customer.
 */
export function rupees(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return `₹${RUPEES.format(value)}`;
}

/**
 * The running total the offline form shows while it is being filled in.
 *
 * The same arithmetic as `money`/`subtotalOf` in the repository, for the same reason the enum
 * lists are repeated above: this runs in the browser and the repository imports Prisma. The
 * rounding is not cosmetic — `3 × 19.99` is 59.97000000000001 — and a form that previews a
 * figure the server will not agree with is worse than one that previews nothing, so
 * `orders.test.ts` asserts these two implementations agree.
 */
export function money(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Paise back to rupees, for printing a stored `Payment.amount`.
 *
 * `Payment.amount` is an `Int` and it holds PAISE: every row in the live table is exactly
 * 100× its order's `totalAmount`. This is the browser's copy of `rupeesFromPaise` in
 * `lib/repositories/orders.ts` — that module imports Prisma and cannot be in this bundle —
 * and the test block at the end of `lib/repositories/orders.test.ts` asserts the two agree,
 * so nobody can "tidy away" one half and leave a screen printing hundredfold figures.
 */
export function rupeesFromPaise(paise: number): number {
  return money(paise / 100);
}

export function subtotalOf(lines: readonly { quantity: number; price: number }[]): number {
  return money(lines.reduce((sum, line) => sum + money(line.quantity * line.price), 0));
}

/* ------------------------------------------------------------------------------------------ */
/* Custom measurements                                                                         */
/* ------------------------------------------------------------------------------------------ */

export interface MeasurementEntry {
  label: string;
  value: string;
}

/**
 * `OrderItem.customMeasurements` as a labelled list.
 *
 * It is a free JSON column written by the storefront, so nothing is known about its keys. They
 * are therefore printed as they came, only tidied: `chestInches` reads as "Chest inches". A
 * nested object or an array is stringified rather than dropped — a tailor's note in an
 * unexpected shape is still the only record of what the customer asked for, and this screen is
 * where someone goes looking for it.
 */
export function measurementEntries(value: Record<string, unknown> | null): MeasurementEntry[] {
  if (!value) return [];

  return Object.entries(value)
    .map(([key, raw]) => {
      const written =
        raw === null || raw === undefined
          ? ''
          : typeof raw === 'string'
            ? raw.trim()
            : typeof raw === 'number' || typeof raw === 'boolean'
              ? String(raw)
              : JSON.stringify(raw);
      return { label: humanizeKey(key), value: written };
    })
    .filter(entry => entry.value !== '');
}

/** `postalCode` -> "Postal code"; `chest_inches` -> "Chest inches"; `Chest` -> "Chest". */
export function humanizeKey(key: string): string {
  const spaced = key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim();
  if (!spaced) return key;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}
