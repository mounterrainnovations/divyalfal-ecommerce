import { PAYMENT_LABEL, STATUS_LABEL } from '@/app/dashboard/orders/shared';
import { CATEGORY_MAPPING_REVERSE } from '@/lib/utils/product-utils';
import type { ProductType } from '@/types';

/**
 * The words this screen puts on raw column values, in one place so the screen and the CSV it
 * exports cannot disagree about what a row is called.
 *
 * TWO OF THE FOUR MAPS ARE NOT WRITTEN HERE, DELIBERATELY. The Orders screens already own the
 * portal's wording for `OrderStatus` and `PaymentStatus` (`app/dashboard/orders/shared.ts`,
 * which is the browser-safe copy and is kept in step with the repository's by its own test).
 * Restating them would mean one screen saying "Unpaid" and this one saying "Awaiting payment"
 * about the same five orders — a report whose words do not match the list it was counted from
 * is a report nobody can check.
 *
 * `CATEGORY_MAPPING_REVERSE` is the catalogue's existing map for the same reason: the product
 * sheet already writes "Kurta Pant" from it, and a second copy of those seven labels is a
 * second thing to forget.
 */

export const ORDER_STATUS_LABEL: Record<string, string> = STATUS_LABEL;

export const PAYMENT_STATUS_LABEL: Record<string, string> = PAYMENT_LABEL;

export const ENQUIRY_STATUS_LABEL: Record<string, string> = {
  UNREAD: 'Unread',
  READ: 'Read',
  ARCHIVED: 'Archived',
};

export const ENQUIRY_SOURCE_LABEL: Record<string, string> = {
  contact: 'Contact form',
  academy: 'Academy form',
  // An enquiry saved before the column existed. A real state, so it has a real label.
  '': 'Not recorded',
};

/**
 * An unmapped key is shown as it is stored rather than as "Unknown": a status this portal has
 * not been taught is still a fact about the shop, and printing the raw value is how whoever
 * reads the report finds out what it is.
 */
export function labelled(map: Record<string, string>, key: string): string {
  return map[key] ?? key;
}

export function categoryLabel(key: string): string {
  return CATEGORY_MAPPING_REVERSE[key as ProductType] ?? key;
}
