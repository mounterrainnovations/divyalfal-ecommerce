import { CATEGORY_MAPPING } from '@/lib/utils/product-utils';
import type { ProductCategory, ProductType } from '@/types';

/**
 * The two query parameters `GET /api/products` grew for the admin, parsed away from the route
 * handler so they can be tested without a database.
 *
 * WHY THIS IS A SEPARATE FILE. `/api/products` is a *public* endpoint — the storefront's
 * listing page is its biggest caller — and it is also now the admin catalogue's only query.
 * Two readers with different defaults is exactly the situation where a wrong default ships
 * unnoticed, so the defaults live here as functions with tests beside them rather than as
 * `?? false` buried in a 120-line handler. A route file cannot export anything but its
 * handlers, which is the other reason this is not inlined there.
 */

/** Which half of the catalogue a caller is asking for. */
export const ARCHIVED_MODES = ['live', 'archived', 'all'] as const;
export type ArchivedMode = (typeof ARCHIVED_MODES)[number];

/**
 * Read `?archived=`, defaulting to **live only**.
 *
 * THE DEFAULT IS THE WHOLE POINT. `Product.isArchived` has been a real column all along and
 * this endpoint ignored it, so an archived garment was served to the shop exactly like a live
 * one. No one noticed because nothing in the portal could archive anything — zero rows are
 * archived today — but this change gives the admin an Archive button, and the moment it is
 * pressed the storefront would keep selling the garment. So absent-parameter means live only:
 * identical output to today's behaviour on today's data, and the only answer that stays
 * correct once archiving is actually used.
 *
 * Unknown values fall back to `live` rather than throwing. A typo in a hand-written URL should
 * show the shop's live catalogue, not a 400 on the storefront's listing page.
 *
 * `false`/`true` are accepted as aliases because `?archived=true` is what anyone reaching for
 * this by hand will type.
 */
export function archivedMode(param: string | null | undefined): ArchivedMode {
  switch ((param ?? '').trim().toLowerCase()) {
    case 'archived':
    case 'true':
      return 'archived';
    case 'all':
      return 'all';
    default:
      return 'live';
  }
}

/**
 * The same thing as a Prisma `where` fragment: `{}` for `all`, so the clause can be spread
 * into the filter unconditionally and "everything" genuinely means no constraint.
 */
export function archivedWhere(param: string | null | undefined): { isArchived?: boolean } {
  const mode = archivedMode(param);
  if (mode === 'all') return {};
  return { isArchived: mode === 'archived' };
}

/** The seven enum members, in the order the shop lists its categories. */
export const PRODUCT_TYPES = Object.values(CATEGORY_MAPPING) as ProductType[];

/**
 * Read `?category=`, which takes either the database enum (`SAREE`) or the shop's label
 * (`Sarees`), and returns null for anything else — including the empty string, which is what
 * a select set to "Every category" sends.
 *
 * Both spellings are accepted because the two sides of this codebase disagree about which a
 * category *is*: `Product.category` is `SAREE` in the database and `'Sarees'` by the time the
 * admin table renders it, and a filter that only understood one of them would be a mapping
 * call away from silently matching nothing. The existing plural `?categories=` parameter is
 * untouched — the storefront's filter sends it and understands only labels.
 */
export function productTypeFromParam(param: string | null | undefined): ProductType | null {
  const raw = (param ?? '').trim();
  if (!raw) return null;

  const asEnum = raw.toUpperCase() as ProductType;
  if (PRODUCT_TYPES.includes(asEnum)) return asEnum;

  const mapped = CATEGORY_MAPPING[raw as ProductCategory];
  return mapped ?? null;
}
