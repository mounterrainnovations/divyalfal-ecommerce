import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import {
  COUPONS_KEY,
  DEFAULT_COUPONS,
  parseCoupons,
  type Coupon,
  type CouponKind,
} from '@/lib/content/coupons';

/**
 * The database half of the coupon list: one `SiteSetting` row under `shop.coupons`.
 *
 * WHY THE SPLIT. The type, the defaults and the parser are pure and are imported by the admin
 * screen, which is a client component; they live in `lib/content/coupons.ts`, a module with no
 * `@prisma/client` import. Everything that touches the database lives here. This is the same
 * split as `lib/repositories/showcase.ts`, and for the same reason: without it, importing the
 * `Coupon` type into a `'use client'` file would drag the Prisma client into the browser.
 *
 * WHY THE ROW IS NOT IN `EDITABLE_SETTING_KEYS`. `shop.coupons` holds a list of objects, not a
 * string an admin types into a settings field, and the Settings screen renders its keys as text
 * inputs. Putting it on that allowlist would offer the whole coupon list as a textarea, where a
 * mistyped brace silently empties it. It is written only through this repository, which
 * re-parses before storing, and read only through `/api/admin/coupons`.
 */

export type { Coupon, CouponKind };
export { COUPONS_KEY, DEFAULT_COUPONS, parseCoupons };

/**
 * Every coupon the shop has. An absent, malformed or non-list row reads as no coupons.
 *
 * Note which direction the fallback points. The showcase lists fall back to what the homepage
 * already shows, because showing the live content is the safe failure there. Here the safe
 * failure is an empty list: a shop with no coupons honours no codes, which is recoverable, and
 * the alternative — inventing a code because a row would not parse — is not.
 */
export async function readCoupons(): Promise<Coupon[]> {
  const row = await prisma.siteSetting.findUnique({ where: { key: COUPONS_KEY } });
  return parseCoupons(row ? row.value : null) ?? DEFAULT_COUPONS;
}

/**
 * Replace the whole coupon list.
 *
 * Wholesale rather than per-coupon because the list is short, de-duplicated on code, and the
 * screen sends what the owner is looking at — there is no merge to get wrong and no way to
 * leave half a list written. The value is re-parsed here before it is stored, so the coercions
 * in `parseCoupons` (an upper-cased code, a clamped percentage, an unknown `kind` switched off)
 * hold even for a caller that skipped validation, and the column can never hold a coupon shape
 * the reader would have to be defensive about twice.
 */
export async function saveCoupons(value: unknown): Promise<Coupon[]> {
  const coupons = parseCoupons(value);
  if (!coupons) throw new TypeError('Expected an array of coupons');

  await prisma.siteSetting.upsert({
    where: { key: COUPONS_KEY },
    create: { key: COUPONS_KEY, value: coupons as unknown as Prisma.InputJsonValue },
    update: { value: coupons as unknown as Prisma.InputJsonValue },
  });
  return coupons;
}
