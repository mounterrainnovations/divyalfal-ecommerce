import type { Product } from '@/types';

const rupees = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * The one price formatter: Indian digit grouping, no decimals — 1250000 -> "₹12,50,000".
 * Numeric strings are accepted because `lib/common/product-interfaces` re-exports this
 * under its old name and its callers were typed `number | string`.
 *
 * Anything that will not parse goes back out as it came in rather than through
 * `Intl.NumberFormat`, which renders it as "₹NaN". No caller can reach that today — every
 * storefront price is coerced to a finite number upstream — so this is a floor, not a
 * feature: a garment priced "on request" shows those words, never a broken number.
 */
export function formatPrice(value: number | string): string {
  const numeric = typeof value === 'string' ? parseFloat(value) : value;
  if (!Number.isFinite(numeric)) return String(value);
  return rupees.format(numeric);
}

export interface ResolvedPrice {
  /** What to show as the price. */
  display: string;
  /** The original price to strike through; null unless a sale is genuinely active. */
  compareAt: string | null;
  onSale: boolean;
}

/**
 * A sale is active only when `sale === true`, a sale price exists, is above zero, and is
 * below the regular price. (The admin form accepts "0" as a sale price; it must never render
 * as a free garment.) `salePrice` is `null` in the raw database shape and `undefined` after
 * `transformDbProductToProduct`; `!= null` treats both as absent. A flagged sale with no
 * usable price falls back to the regular price rather than showing "₹NaN" or a markup.
 */
export function resolvePrice(
  product: Pick<Product, 'price' | 'sale'> & { salePrice?: number | null },
): ResolvedPrice {
  const { price, sale, salePrice } = product;
  if (sale === true && salePrice != null && salePrice > 0 && salePrice < price) {
    return { display: formatPrice(salePrice), compareAt: formatPrice(price), onSale: true };
  }
  return { display: formatPrice(price), compareAt: null, onSale: false };
}

/**
 * The amount actually charged, as a number: the sale price when `resolvePrice` says a sale
 * is active, the regular price otherwise. For sorting; display always goes through
 * `resolvePrice`.
 */
export function amountPayable(
  product: Pick<Product, 'price' | 'sale'> & { salePrice?: number | null },
): number {
  return resolvePrice(product).onSale ? (product.salePrice as number) : product.price;
}

/** Whole-number percentage off; 0 unless `resolvePrice` says a sale is genuinely active. */
export function discountPercent(
  product: Pick<Product, 'price' | 'sale'> & { salePrice?: number | null },
): number {
  if (!resolvePrice(product).onSale) return 0;
  return Math.round(((product.price - (product.salePrice as number)) / product.price) * 100);
}
