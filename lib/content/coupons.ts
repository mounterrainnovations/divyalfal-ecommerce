import { formatPrice } from '@/lib/utils/price';

/**
 * Discount codes: the type, the parser, and the two pure functions that decide what a code
 * says and whether it may be honoured.
 *
 * WHY `SiteSetting` AND NOT A `Coupon` TABLE. There is no coupon table in this database and
 * adding one means a migration against the client's live production Postgres. A coupon list is
 * a handful of short records that nothing joins to, and `SiteSetting` is already a key/value
 * JSON store holding exactly this shape of thing (see `lib/content/showcase.ts`, which does
 * the same for the homepage lists). So the whole list is one row under `shop.coupons`.
 *
 * WHY THIS FILE HAS NO PRISMA IMPORT. The admin screen is a client component and imports the
 * type, the parser and `describeCoupon` from here. A `@prisma/client` import anywhere in this
 * module's graph would pull the Prisma client into the browser bundle. The database half lives
 * in `lib/repositories/coupons.ts` and re-exports these names, which is the split the showcase
 * modules already use.
 *
 * NOTHING HERE TOUCHES MONEY YET, AND THE WORDING SAYS SO. There is no checkout on this
 * storefront — no cart, no `/checkout` route — and the `Order` table has no coupon column. So
 * a code stored here is a published promise the shop honours by hand; `usedCount` is a number
 * the owner (or a future checkout) moves, not one this code can claim is live. `validateCoupon`
 * exists so that when a checkout is wired, the arithmetic it needs is already written, tested
 * and in one place rather than invented at the till.
 *
 * EVERY DOUBT RESOLVES AGAINST GIVING MONEY AWAY. A missing `active` flag reads as off; an
 * unreadable start date reads as not yet started; an unreadable end date reads as expired; an
 * unrecognised `kind` switches the coupon off rather than guessing which discount was meant.
 * A coupon that is wrongly refused is a conversation with the shop. A coupon that is wrongly
 * honoured is cash out of the till, repeatedly, silently.
 */

export const COUPONS_KEY = 'shop.coupons';

/** What the `value` means: a percentage of the subtotal, or a flat number of rupees. */
export type CouponKind = 'PERCENT' | 'AMOUNT';

export interface Coupon {
  /** Stable identity for the editor and for React keys. The code is the business identity. */
  id: string;
  /** Upper-case, no whitespace — what a customer types. Unique within the list. */
  code: string;
  kind: CouponKind;
  /** A percentage (0–100) when `kind` is PERCENT, rupees when it is AMOUNT. */
  value: number;
  /** The order subtotal at or above which the code applies. Absent means any order. */
  minSubtotal?: number;
  /** ISO date (`YYYY-MM-DD`) or full timestamp. Absent means it is already running. */
  startsAt?: string;
  /** ISO date or timestamp. Absent means it never expires. */
  endsAt?: string;
  /** How many times it may be redeemed in total. Absent means unlimited. */
  maxUses?: number;
  /** How many times it has been redeemed. Nothing in this shop increments it yet. */
  usedCount: number;
  /** The owner's switch. False is the resting state, not an error. */
  active: boolean;
  /** A line for the owner's own benefit — which campaign this was, who asked for it. */
  note: string;
}

/**
 * No coupons, and this list must stay empty.
 *
 * Every other default in this codebase is "what the site already shows", because falling back
 * to the live content is the safe failure. A discount code has no such safe default: a
 * plausible-looking `WELCOME10` seeded here would be a real, redeemable code the moment the row
 * is missing or malformed — on a live shop, published by accident, taking money out of the
 * owner's pocket with nobody having decided to offer it. So an absent or unreadable row means
 * the shop has no coupons, which is both the truth and the only harmless answer.
 */
export const DEFAULT_COUPONS: Coupon[] = [];

/* ------------------------------------------------------------------------------------------ */
/* Dates                                                                                       */
/* ------------------------------------------------------------------------------------------ */

/**
 * A bare `YYYY-MM-DD` is read as an Indian calendar day, not as UTC.
 *
 * The admin's date inputs produce `YYYY-MM-DD`, the shop is in Bhopal, and the owner typing
 * "ends 31 Dec" means the end of the 31st as lived in India. Parsed as UTC midnight, that
 * date would expire the code at 05:30 on the 31st, IST — the shop refusing a code on a day it
 * advertised. So a date-only bound is resolved in IST: a start is 00:00 that day, an end is
 * the last millisecond of it. A full timestamp carries its own offset and is used as given.
 */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function instantOf(iso: string, edge: 'start' | 'end'): number | null {
  if (DATE_ONLY.test(iso)) {
    // `Date.parse` is the only ISO reader available, and it is lenient: it rejects month 13 and
    // day 32 but rolls 2026-02-30 forward to 2 March. The admin screen's date input can only
    // produce a real calendar day, so the rollover is reachable only by hand-editing the JSON
    // column, and a day's drift there is visible on the screen afterwards.
    const utcMidnight = Date.parse(`${iso}T00:00:00.000Z`);
    if (!Number.isFinite(utcMidnight)) return null;
    const dayStart = utcMidnight - IST_OFFSET_MS;
    return edge === 'start' ? dayStart : dayStart + DAY_MS - 1;
  }
  const parsed = Date.parse(iso);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * The day a bound falls on, in Indian time: "31 Dec".
 *
 * The year is deliberately absent — this is the phrase inside a one-line description, where the
 * campaign is current by definition. The admin table shows each bound in full in its own
 * column, so the unambiguous form is a glance away.
 */
const DAY = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  timeZone: 'Asia/Kolkata',
});

function dayOf(iso: string | undefined): string | null {
  if (!iso) return null;
  // The start edge on purpose, for both bounds: an end date's last millisecond is still that
  // same calendar day in IST, which is the day the owner typed and the customer was told.
  const at = instantOf(iso, 'start');
  return at === null ? null : DAY.format(at);
}

/**
 * A bound written in full — "31 Dec 2026" — for the admin table's own window column.
 *
 * It lives here rather than in the screen so that one module reads these strings. A screen
 * formatting them with its own `new Date(iso)` would be a second, slightly different reader of
 * the same field, and the difference would be exactly the IST day boundary this file exists to
 * get right. An unreadable value comes back as the empty string: the screen has nothing honest
 * to draw for it, and `parseCoupons` has already dropped it from anything stored.
 */
const FULL_DAY = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Kolkata',
});

export function formatCouponDate(iso: string | undefined): string {
  if (!iso) return '';
  const at = instantOf(iso, 'start');
  return at === null ? '' : FULL_DAY.format(at);
}

/* ------------------------------------------------------------------------------------------ */
/* Parsing                                                                                     */
/* ------------------------------------------------------------------------------------------ */

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/** Upper-case, and no whitespace anywhere: a code a customer can read out over the phone. */
export function normalizeCouponCode(value: unknown): string {
  return text(value).replace(/\s+/g, '').toUpperCase();
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

/** A percentage that can only ever be between 0 and 100. */
function clampPercent(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(100, Math.max(0, numeric));
}

/** Rupees: never negative (a negative discount would add to the bill), rounded to paise. */
function money(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return round2(Math.max(0, numeric));
}

/** An optional positive rupee threshold, or absent. Zero and below mean "no threshold". */
function optionalMoney(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return undefined;
  return round2(numeric);
}

/** A whole, non-negative count, or absent. */
function optionalCount(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return undefined;
  return Math.floor(numeric);
}

function optionalDate(value: unknown): string | undefined {
  const iso = text(value);
  if (!iso) return undefined;
  // A date nothing can parse is dropped rather than stored: kept, it would reach
  // `validateCoupon`, which refuses an unreadable bound outright, and the owner would see a
  // coupon that is mysteriously never valid. Dropped, the screen shows an empty date field,
  // which is both the truth and obvious to fix.
  return instantOf(iso, 'start') === null ? undefined : iso;
}

/**
 * A stored coupon list, or null when the stored value is not a list at all.
 *
 * Defensive in the manner of `parseTestimonials`: an entry with no code is dropped, because a
 * code is the only thing a customer can type and a nameless coupon is unreachable. Everything
 * else is coerced rather than refused, so one bad number cannot discard the owner's other six
 * coupons. Duplicates on code are dropped keeping the first — two rows for `DIWALI` would make
 * "which one applies" a matter of iteration order, and that is not a question a till may ask.
 *
 * Two coercions switch a coupon off instead of guessing, and they are the point of this
 * function: an entry whose `kind` is not one of the two known values, and an entry with no
 * `active` field at all. Both would otherwise be a redeemable code produced by a typo.
 */
export function parseCoupons(value: unknown): Coupon[] | null {
  if (!Array.isArray(value)) return null;

  const seen = new Set<string>();
  const list: Coupon[] = [];

  for (const [index, raw] of value.entries()) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Record<string, unknown>;

    const code = normalizeCouponCode(item.code);
    if (!code || seen.has(code)) continue;
    seen.add(code);

    const known = item.kind === 'PERCENT' || item.kind === 'AMOUNT';
    const kind: CouponKind = item.kind === 'AMOUNT' ? 'AMOUNT' : 'PERCENT';

    list.push({
      id: text(item.id) || `c${index}`,
      code,
      kind,
      value: kind === 'PERCENT' ? clampPercent(item.value) : money(item.value),
      minSubtotal: optionalMoney(item.minSubtotal),
      startsAt: optionalDate(item.startsAt),
      endsAt: optionalDate(item.endsAt),
      maxUses: optionalCount(item.maxUses),
      // Never clamped to `maxUses`. If a count has run past its limit the owner needs to see
      // that, not a tidied number that hides it.
      usedCount: optionalCount(item.usedCount) ?? 0,
      // An unreadable `kind` means nobody knows what this coupon takes off, so it cannot be
      // allowed to take anything off. It stays in the list, switched off, for the owner to fix.
      active: known && item.active === true,
      note: text(item.note),
    });
  }

  return list;
}

/* ------------------------------------------------------------------------------------------ */
/* What a coupon says                                                                          */
/* ------------------------------------------------------------------------------------------ */

/** 20 -> "20", 12.5 -> "12.5". A percentage reads as a number, not as "12.50". */
function percentText(value: number): string {
  return String(Number(clampPercent(value).toFixed(2)));
}

/**
 * The one-line sentence the admin table shows: "20% off orders of ₹5,000 or more, until 31 Dec".
 *
 * "of X or more" rather than "over X" because `minSubtotal` is inclusive — `validateCoupon`
 * honours a code on an order of exactly the threshold — and a sentence that implied otherwise
 * would be the screen disagreeing with the till about a boundary.
 *
 * Pure, and says nothing about whether the coupon is usable: that is `couponStatus`, which the
 * table shows beside this in its own column. A description that read "expired" would have to be
 * recomputed as the clock moved, and a stale one is worse than none.
 */
export function describeCoupon(coupon: Coupon): string {
  const what =
    coupon.kind === 'PERCENT'
      ? `${percentText(coupon.value)}% off`
      : `${formatPrice(coupon.value)} off`;

  const scope =
    coupon.minSubtotal !== undefined
      ? ` orders of ${formatPrice(coupon.minSubtotal)} or more`
      : '';

  const from = dayOf(coupon.startsAt);
  const until = dayOf(coupon.endsAt);
  const when = from && until ? `, ${from} to ${until}` : until ? `, until ${until}` : from ? `, from ${from}` : '';

  return `${what}${scope}${when}`;
}

/* ------------------------------------------------------------------------------------------ */
/* Whether a coupon may be honoured                                                            */
/* ------------------------------------------------------------------------------------------ */

/**
 * Where a coupon sits in its own date window at a given instant.
 *
 * An unreadable bound is not "no bound": a start nobody can read has not been shown to have
 * arrived, and an end nobody can read has not been shown to be in the future. Both resolve to
 * refusing. `parseCoupons` drops unreadable dates before they get here, so this is the floor
 * under a hand-built object, not the normal path.
 */
function windowState(coupon: Coupon, nowMs: number): 'early' | 'open' | 'late' {
  if (coupon.startsAt !== undefined) {
    const from = instantOf(coupon.startsAt, 'start');
    if (from === null || nowMs < from) return 'early';
  }
  if (coupon.endsAt !== undefined) {
    const until = instantOf(coupon.endsAt, 'end');
    if (until === null || nowMs > until) return 'late';
  }
  return 'open';
}

export type CouponStatus = 'OFF' | 'SCHEDULED' | 'EXPIRED' | 'USED_UP' | 'ACTIVE';

/**
 * The status to show, computed from the coupon and the clock — never stored.
 *
 * This is the whole reason the admin table does not simply print `active`. A coupon the owner
 * switched on in October with `endsAt` in November is `active: true` for ever, and a table that
 * read the flag would call it "Active" in January. It is expired, and saying so is the only
 * useful thing the column can do.
 *
 * `OFF` comes first: the owner's switch outranks the calendar, and "Off" is the honest word for
 * a coupon nobody has turned on regardless of what its dates say.
 */
export function couponStatus(coupon: Coupon, now: Date): CouponStatus {
  if (!coupon.active) return 'OFF';

  const state = windowState(coupon, now.getTime());
  if (state === 'early') return 'SCHEDULED';
  if (state === 'late') return 'EXPIRED';

  if (coupon.maxUses !== undefined && coupon.usedCount >= coupon.maxUses) return 'USED_UP';
  return 'ACTIVE';
}

/** Why a code was not honoured. One of these, or a discount — never both, never neither. */
export type CouponRefusal = 'inactive' | 'not-started' | 'expired' | 'used-up' | 'below-minimum';

export type CouponCheck =
  | { applies: true; discount: number }
  | { applies: false; reason: CouponRefusal; message: string };

/**
 * Whether this coupon applies to this subtotal at this instant, and if so what it takes off.
 *
 * The order of the refusals is deliberate. The first four are facts about the coupon — off,
 * early, expired, spent — and hold whatever is in the basket. Only when the code could
 * otherwise have worked is the basket itself blamed, so "add ₹500 more" is never said about a
 * code that expired last month.
 *
 * TWO INVARIANTS THE CALLER MAY RELY ON. The discount is rounded to paise, because a bill is
 * settled in paise and a float like 1234.5600000000002 would appear on one. And it never
 * exceeds the subtotal: a ₹2,000 code on a ₹900 order takes ₹900 off, not ₹2,000, because the
 * alternative is a negative total — which, wherever it is finally added up, is the shop paying
 * the customer to shop.
 *
 * `now` is a parameter rather than `Date.now()` so that this is a pure function of its inputs:
 * boundary days are exactly where a discount engine is got wrong, and an untestable clock is
 * how it stays wrong.
 */
export function validateCoupon(
  coupon: Coupon,
  { subtotal, now }: { subtotal: number; now: Date }
): CouponCheck {
  if (!coupon.active) {
    return { applies: false, reason: 'inactive', message: 'This code is not active.' };
  }

  const state = windowState(coupon, now.getTime());
  if (state === 'early') {
    const from = dayOf(coupon.startsAt);
    return {
      applies: false,
      reason: 'not-started',
      message: from ? `This code starts on ${from}.` : 'This code has not started yet.',
    };
  }
  if (state === 'late') {
    const until = dayOf(coupon.endsAt);
    return {
      applies: false,
      reason: 'expired',
      message: until ? `This code expired on ${until}.` : 'This code has expired.',
    };
  }

  if (coupon.maxUses !== undefined && coupon.usedCount >= coupon.maxUses) {
    return {
      applies: false,
      reason: 'used-up',
      message: 'This code has already been used the maximum number of times.',
    };
  }

  // A subtotal that is not a usable number is treated as an empty basket rather than trusted
  // into the arithmetic, where NaN would quietly become a NaN discount on a real bill.
  const basket = Number.isFinite(subtotal) && subtotal > 0 ? subtotal : 0;

  if (coupon.minSubtotal !== undefined && basket < coupon.minSubtotal) {
    return {
      applies: false,
      reason: 'below-minimum',
      message: `This code needs an order of ${formatPrice(coupon.minSubtotal)} or more.`,
    };
  }

  const raw =
    coupon.kind === 'PERCENT'
      ? (basket * clampPercent(coupon.value)) / 100
      : Math.max(0, Number.isFinite(coupon.value) ? coupon.value : 0);

  return { applies: true, discount: Math.min(basket, round2(raw)) };
}
