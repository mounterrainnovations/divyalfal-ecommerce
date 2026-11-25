import { describe, expect, it } from 'vitest';
import {
  DEFAULT_COUPONS,
  couponStatus,
  describeCoupon,
  normalizeCouponCode,
  parseCoupons,
  validateCoupon,
  type Coupon,
} from './coupons';

/**
 * These functions stand between a JSON column and money. A parser that lets a malformed row
 * through produces a redeemable code nobody authorised; a `validateCoupon` that is wrong by one
 * day, one rupee or one use honours a code the shop has withdrawn. So the cases below are
 * deliberately the unkind ones: the boundaries, the absent fields, the numbers out of range,
 * and the discount that is larger than the order it is applied to.
 *
 * Every date here is written as the Indian calendar day the owner would have typed, and the
 * instants are chosen on either side of IST midnight — which is where a UTC-parsed bound would
 * be wrong, and wrong invisibly.
 */

/** A well-formed coupon to vary one field of at a time. */
function coupon(overrides: Partial<Coupon> = {}): Coupon {
  return {
    id: 'c1',
    code: 'DIWALI',
    kind: 'PERCENT',
    value: 20,
    usedCount: 0,
    active: true,
    note: '',
    ...overrides,
  };
}

/** An instant written in IST, which is how the shop thinks about its own dates. */
function ist(text: string): Date {
  return new Date(`${text}+05:30`);
}

describe('normalizeCouponCode', () => {
  it('upper-cases and strips every space, so a code can be read out over the phone', () => {
    expect(normalizeCouponCode('  diwali 20 ')).toBe('DIWALI20');
    expect(normalizeCouponCode('new\tyear')).toBe('NEWYEAR');
    expect(normalizeCouponCode(42)).toBe('');
    expect(normalizeCouponCode(undefined)).toBe('');
  });
});

describe('DEFAULT_COUPONS', () => {
  it('is empty, because an invented code would be a real one on a live shop', () => {
    expect(DEFAULT_COUPONS).toEqual([]);
  });
});

describe('parseCoupons', () => {
  it('refuses anything that is not an array, so the caller falls back to no coupons', () => {
    expect(parseCoupons(null)).toBeNull();
    expect(parseCoupons(undefined)).toBeNull();
    expect(parseCoupons('[]')).toBeNull();
    expect(parseCoupons({ 0: { code: 'X' } })).toBeNull();
  });

  it('keeps a well-formed entry exactly as written', () => {
    const stored = [
      {
        id: 'a',
        code: 'DIWALI',
        kind: 'PERCENT',
        value: 20,
        minSubtotal: 5000,
        startsAt: '2026-12-01',
        endsAt: '2026-12-31',
        maxUses: 50,
        usedCount: 3,
        active: true,
        note: 'Diwali mailer',
      },
    ];
    expect(parseCoupons(stored)).toEqual(stored);
  });

  it('drops an entry with no code, which no customer could ever type', () => {
    const parsed = parseCoupons([{ code: '   ' }, { value: 10 }, { code: 'REAL' }, 'nope', null]);
    expect(parsed?.map(item => item.code)).toEqual(['REAL']);
  });

  it('upper-cases and de-spaces the code, and keeps the first of a duplicate pair', () => {
    const parsed = parseCoupons([
      { code: ' diwali 20', value: 10, kind: 'PERCENT', active: true },
      { code: 'DIWALI20', value: 90, kind: 'PERCENT', active: true },
    ]);
    expect(parsed).toHaveLength(1);
    expect(parsed?.[0]).toMatchObject({ code: 'DIWALI20', value: 10 });
  });

  it('clamps a percentage into 0–100 rather than discarding the owner’s other coupons', () => {
    const parsed = parseCoupons([
      { code: 'A', kind: 'PERCENT', value: 150 },
      { code: 'B', kind: 'PERCENT', value: -5 },
      { code: 'C', kind: 'PERCENT', value: 'half' },
      { code: 'D', kind: 'PERCENT', value: 12.5 },
    ]);
    expect(parsed?.map(item => item.value)).toEqual([100, 0, 0, 12.5]);
  });

  it('rounds a rupee amount to paise and never lets it go negative', () => {
    const parsed = parseCoupons([
      { code: 'A', kind: 'AMOUNT', value: 250.456 },
      { code: 'B', kind: 'AMOUNT', value: -300 },
      { code: 'C', kind: 'AMOUNT', value: '500' },
    ]);
    expect(parsed?.map(item => item.value)).toEqual([250.46, 0, 500]);
  });

  it('switches off a coupon whose kind is unreadable instead of guessing the discount', () => {
    const parsed = parseCoupons([
      { code: 'A', value: 20, active: true },
      { code: 'B', kind: 'FLAT', value: 20, active: true },
      { code: 'C', kind: 'PERCENT', value: 20, active: true },
    ]);
    expect(parsed?.map(item => item.active)).toEqual([false, false, true]);
  });

  it('treats a missing active flag as off, because an absent field must not publish a code', () => {
    const parsed = parseCoupons([
      { code: 'A', kind: 'PERCENT', value: 5 },
      { code: 'B', kind: 'PERCENT', value: 5, active: 'yes' },
      { code: 'C', kind: 'PERCENT', value: 5, active: true },
    ]);
    expect(parsed?.map(item => item.active)).toEqual([false, false, true]);
  });

  it('drops a threshold or a use limit that means nothing, leaving the field absent', () => {
    const parsed = parseCoupons([
      { code: 'A', kind: 'PERCENT', value: 5, minSubtotal: 0, maxUses: 'lots' },
      { code: 'B', kind: 'PERCENT', value: 5, minSubtotal: -40, maxUses: -1 },
      { code: 'C', kind: 'PERCENT', value: 5, minSubtotal: 5000.4, maxUses: 10.8 },
    ]);
    expect(parsed?.[0].minSubtotal).toBeUndefined();
    expect(parsed?.[0].maxUses).toBeUndefined();
    expect(parsed?.[1].minSubtotal).toBeUndefined();
    expect(parsed?.[1].maxUses).toBeUndefined();
    expect(parsed?.[2].minSubtotal).toBe(5000.4);
    expect(parsed?.[2].maxUses).toBe(10);
  });

  it('never reports a negative use count, and defaults it to none', () => {
    const parsed = parseCoupons([
      { code: 'A', kind: 'PERCENT', value: 5 },
      { code: 'B', kind: 'PERCENT', value: 5, usedCount: -9 },
      { code: 'C', kind: 'PERCENT', value: 5, usedCount: 7 },
    ]);
    expect(parsed?.map(item => item.usedCount)).toEqual([0, 0, 7]);
  });

  it('leaves a use count that has run past its limit alone, so the owner can see it', () => {
    const parsed = parseCoupons([
      { code: 'A', kind: 'PERCENT', value: 5, maxUses: 10, usedCount: 14 },
    ]);
    expect(parsed?.[0]).toMatchObject({ maxUses: 10, usedCount: 14 });
  });

  it('drops a date nothing can read, rather than storing a coupon that is never valid', () => {
    const parsed = parseCoupons([
      { code: 'A', kind: 'PERCENT', value: 5, startsAt: 'next Tuesday', endsAt: '2026-13-01' },
    ]);
    expect(parsed?.[0].startsAt).toBeUndefined();
    expect(parsed?.[0].endsAt).toBeUndefined();
  });

  it('gives an entry an id when the stored one is missing, so React keys stay stable', () => {
    const parsed = parseCoupons([{ code: 'A' }, { code: 'B' }]);
    expect(parsed?.map(item => item.id)).toEqual(['c0', 'c1']);
  });

  it('is idempotent: parsing its own output changes nothing', () => {
    const once = parseCoupons([
      { code: ' spring ', kind: 'AMOUNT', value: 250.456, maxUses: 3.7, active: true },
      { code: 'ODD', kind: 'FLAT', value: 20, active: true },
    ]);
    expect(parseCoupons(once)).toEqual(once);
  });
});

describe('describeCoupon', () => {
  it('writes a percentage with its threshold and its last day', () => {
    expect(
      describeCoupon(coupon({ value: 20, minSubtotal: 5000, endsAt: '2026-12-31' }))
    ).toBe('20% off orders of ₹5,000 or more, until 31 Dec');
  });

  it('writes a rupee amount through the one price formatter', () => {
    expect(describeCoupon(coupon({ kind: 'AMOUNT', value: 500 }))).toBe('₹500 off');
  });

  it('names both ends of a window, and only the end when there is no start', () => {
    expect(describeCoupon(coupon({ startsAt: '2026-12-01', endsAt: '2026-12-31' }))).toBe(
      '20% off, 1 Dec to 31 Dec'
    );
    expect(describeCoupon(coupon({ startsAt: '2026-12-01' }))).toBe('20% off, from 1 Dec');
  });

  it('says nothing about a window a coupon does not have', () => {
    expect(describeCoupon(coupon())).toBe('20% off');
  });

  it('writes a fractional percentage as a number, not as money', () => {
    expect(describeCoupon(coupon({ value: 12.5 }))).toBe('12.5% off');
  });
});

describe('couponStatus', () => {
  const now = ist('2026-12-15T12:00:00');

  it('calls an expired coupon expired even though its active flag is still set', () => {
    // The whole reason the column is computed: this coupon is `active: true` for ever.
    expect(couponStatus(coupon({ endsAt: '2026-11-30' }), now)).toBe('EXPIRED');
  });

  it('puts the owner’s switch above the calendar', () => {
    expect(couponStatus(coupon({ active: false, endsAt: '2026-11-30' }), now)).toBe('OFF');
    expect(couponStatus(coupon({ active: false, startsAt: '2027-01-01' }), now)).toBe('OFF');
  });

  it('distinguishes a coupon that has not started from one that is running', () => {
    expect(couponStatus(coupon({ startsAt: '2026-12-20' }), now)).toBe('SCHEDULED');
    expect(couponStatus(coupon({ startsAt: '2026-12-01', endsAt: '2026-12-31' }), now)).toBe(
      'ACTIVE'
    );
  });

  it('reports a coupon that has been redeemed its maximum number of times', () => {
    expect(couponStatus(coupon({ maxUses: 5, usedCount: 5 }), now)).toBe('USED_UP');
    expect(couponStatus(coupon({ maxUses: 5, usedCount: 4 }), now)).toBe('ACTIVE');
    // A limit of none is unlimited, however many times it has been used.
    expect(couponStatus(coupon({ usedCount: 900 }), now)).toBe('ACTIVE');
  });
});

describe('validateCoupon', () => {
  const now = ist('2026-12-15T12:00:00');

  it('takes the percentage off the subtotal', () => {
    expect(validateCoupon(coupon({ value: 20 }), { subtotal: 5000, now })).toEqual({
      applies: true,
      discount: 1000,
    });
  });

  it('takes a flat amount off', () => {
    expect(
      validateCoupon(coupon({ kind: 'AMOUNT', value: 500 }), { subtotal: 5000, now })
    ).toEqual({ applies: true, discount: 500 });
  });

  it('rounds to paise, so no bill ever carries a float’s tail', () => {
    const check = validateCoupon(coupon({ value: 15 }), { subtotal: 1234.57, now });
    expect(check).toEqual({ applies: true, discount: 185.19 });
  });

  it('never discounts more than the order is worth', () => {
    expect(
      validateCoupon(coupon({ kind: 'AMOUNT', value: 2000 }), { subtotal: 900, now })
    ).toEqual({ applies: true, discount: 900 });
  });

  it('clamps a percentage above 100 instead of paying the customer to shop', () => {
    // A hand-built object can hold 150; `parseCoupons` would already have clamped it.
    expect(validateCoupon(coupon({ value: 150 }), { subtotal: 800, now })).toEqual({
      applies: true,
      discount: 800,
    });
  });

  it('treats an unusable subtotal as an empty basket rather than a NaN discount', () => {
    expect(validateCoupon(coupon(), { subtotal: Number.NaN, now })).toEqual({
      applies: true,
      discount: 0,
    });
    expect(validateCoupon(coupon(), { subtotal: -500, now })).toEqual({
      applies: true,
      discount: 0,
    });
  });

  it('refuses a coupon the owner has switched off', () => {
    const check = validateCoupon(coupon({ active: false }), { subtotal: 5000, now });
    expect(check).toMatchObject({ applies: false, reason: 'inactive' });
  });

  it('refuses a coupon whose window has not opened, and names the day', () => {
    const check = validateCoupon(coupon({ startsAt: '2026-12-20' }), { subtotal: 5000, now });
    expect(check).toMatchObject({ applies: false, reason: 'not-started' });
    expect(check).toHaveProperty('message', 'This code starts on 20 Dec.');
  });

  it('refuses a coupon whose window has closed, and names the day', () => {
    const check = validateCoupon(coupon({ endsAt: '2026-11-30' }), { subtotal: 5000, now });
    expect(check).toMatchObject({ applies: false, reason: 'expired' });
    expect(check).toHaveProperty('message', 'This code expired on 30 Nov.');
  });

  it('refuses a coupon that has been fully redeemed', () => {
    const check = validateCoupon(coupon({ maxUses: 3, usedCount: 3 }), { subtotal: 5000, now });
    expect(check).toMatchObject({ applies: false, reason: 'used-up' });
  });

  it('refuses a basket under the threshold, and says what the threshold is', () => {
    const check = validateCoupon(coupon({ minSubtotal: 5000 }), { subtotal: 4999.99, now });
    expect(check).toMatchObject({ applies: false, reason: 'below-minimum' });
    expect(check).toHaveProperty('message', 'This code needs an order of ₹5,000 or more.');
  });

  it('honours a basket exactly on the threshold, which is a minimum and not a margin', () => {
    expect(validateCoupon(coupon({ minSubtotal: 5000 }), { subtotal: 5000, now })).toEqual({
      applies: true,
      discount: 1000,
    });
  });

  it('blames the coupon before it blames the basket', () => {
    // Expired AND under its threshold: the customer is told the code is dead, not told to
    // spend another ₹4,000 on a code that would still have been refused.
    const dead = coupon({ endsAt: '2026-11-30', minSubtotal: 5000 });
    expect(validateCoupon(dead, { subtotal: 100, now })).toMatchObject({ reason: 'expired' });

    // Off outranks everything, including a window that has not opened.
    const off = coupon({ active: false, startsAt: '2027-01-01' });
    expect(validateCoupon(off, { subtotal: 100, now })).toMatchObject({ reason: 'inactive' });

    // And a spent coupon is spent before the basket is weighed.
    const spent = coupon({ maxUses: 1, usedCount: 1, minSubtotal: 5000 });
    expect(validateCoupon(spent, { subtotal: 100, now })).toMatchObject({ reason: 'used-up' });
  });

  describe('the boundaries of a day, read in Indian time', () => {
    const live = coupon({ startsAt: '2026-12-01', endsAt: '2026-12-31' });

    it('is live from the first instant of the start day in IST', () => {
      expect(
        validateCoupon(live, { subtotal: 1000, now: ist('2026-12-01T00:00:00.000') })
      ).toMatchObject({ applies: true });
      expect(
        validateCoupon(live, { subtotal: 1000, now: ist('2026-11-30T23:59:59.999') })
      ).toMatchObject({ applies: false, reason: 'not-started' });
    });

    it('is live to the last instant of the end day in IST', () => {
      // The case a UTC-parsed bound gets wrong: 10am IST on the last day is already past
      // UTC midnight of that date, and the shop would refuse a code it had advertised.
      expect(
        validateCoupon(live, { subtotal: 1000, now: ist('2026-12-31T10:00:00.000') })
      ).toMatchObject({ applies: true });
      expect(
        validateCoupon(live, { subtotal: 1000, now: ist('2026-12-31T23:59:59.999') })
      ).toMatchObject({ applies: true });
      expect(
        validateCoupon(live, { subtotal: 1000, now: ist('2027-01-01T00:00:00.000') })
      ).toMatchObject({ applies: false, reason: 'expired' });
    });

    it('honours a full timestamp exactly as it was written', () => {
      const timed = coupon({ endsAt: '2026-12-15T18:00:00+05:30' });
      expect(
        validateCoupon(timed, { subtotal: 1000, now: ist('2026-12-15T17:59:59') })
      ).toMatchObject({ applies: true });
      expect(
        validateCoupon(timed, { subtotal: 1000, now: ist('2026-12-15T18:00:01') })
      ).toMatchObject({ applies: false, reason: 'expired' });
    });

    it('refuses an unreadable bound rather than treating it as no bound at all', () => {
      // Only reachable with a hand-built object: `parseCoupons` drops these.
      expect(
        validateCoupon(coupon({ endsAt: 'whenever' }), { subtotal: 1000, now })
      ).toMatchObject({ applies: false, reason: 'expired' });
      expect(
        validateCoupon(coupon({ startsAt: 'whenever' }), { subtotal: 1000, now })
      ).toMatchObject({ applies: false, reason: 'not-started' });
    });
  });
});
