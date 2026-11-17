import { describe, expect, it } from 'vitest';
import { amountPayable, discountPercent, formatPrice, resolvePrice } from './price';
import { formatPrice as legacyFormatPrice } from '@/lib/common/product-interfaces';
import type { Product } from '@/types';

const base: Product = {
  id: 'p1',
  name: 'Red Velvet Saree',
  price: 8000,
  image: '/a.jpg',
  photos: ['/a.jpg'],
  category: 'Sarees',
};

describe('formatPrice', () => {
  it('formats rupees with Indian grouping and no decimals', () => {
    expect(formatPrice(10999)).toBe('₹10,999');
    expect(formatPrice(1250000)).toBe('₹12,50,000');
  });

  it('is the single implementation behind the legacy lib/common export', () => {
    expect(legacyFormatPrice).toBe(formatPrice);
    expect(legacyFormatPrice(10999)).toBe('₹10,999');
    expect(legacyFormatPrice(1250000)).toBe('₹12,50,000');
  });

  it('keeps accepting numeric strings, as the legacy export did', () => {
    expect(formatPrice('10999')).toBe('₹10,999');
  });

  /**
   * No caller can reach this today -- every storefront price arrives as a finite number from
   * `transformDbProductToProduct` or `readSections`, both of which coerce. But the signature
   * says `number | string`, and `Intl.NumberFormat` renders an unparseable string as "₹NaN":
   * a price on a couture storefront that reads "₹NaN" is worse than one that reads oddly.
   * The raw value goes back out unchanged, so whatever the caller had is what shows.
   */
  it('returns the raw value rather than "₹NaN" for anything it cannot parse', () => {
    expect(formatPrice('on request')).toBe('on request');
    expect(formatPrice('')).toBe('');
    expect(formatPrice(Number.NaN)).toBe('NaN');
    expect(formatPrice(Number.POSITIVE_INFINITY)).toBe('Infinity');
    // A numeric string with trailing noise still parses, exactly as it did before.
    expect(formatPrice('10999abc')).toBe('₹10,999');
  });
});

describe('resolvePrice', () => {
  it('uses the regular price when the product is not on sale', () => {
    expect(resolvePrice(base)).toEqual({ display: '₹8,000', compareAt: null, onSale: false });
  });

  it('falls back to the regular price when sale is true but salePrice is null', () => {
    // null is the raw database shape.
    const r = resolvePrice({ ...base, sale: true, salePrice: null as unknown as undefined });
    expect(r.display).toBe('₹8,000');
    expect(r.compareAt).toBeNull();
    expect(r.onSale).toBe(false);
  });

  it('falls back to the regular price when sale is true but salePrice is undefined', () => {
    // undefined is the shape transformDbProductToProduct produces.
    const r = resolvePrice({ ...base, sale: true, salePrice: undefined });
    expect(r.display).toBe('₹8,000');
    expect(r.compareAt).toBeNull();
    expect(r.onSale).toBe(false);
  });

  it('shows the sale price with the original struck through when both are present', () => {
    const r = resolvePrice({ ...base, sale: true, salePrice: 6000 });
    expect(r).toMatchObject({ display: '₹6,000', compareAt: '₹8,000', onSale: true });
  });

  it('ignores a salePrice when sale is not true', () => {
    expect(resolvePrice({ ...base, sale: false, salePrice: 6000 }).onSale).toBe(false);
    expect(resolvePrice({ ...base, salePrice: 6000 }).onSale).toBe(false);
  });

  it('ignores a salePrice that is not below the regular price', () => {
    expect(resolvePrice({ ...base, sale: true, salePrice: 8000 }).onSale).toBe(false);
    expect(resolvePrice({ ...base, sale: true, salePrice: 9000 }).display).toBe('₹8,000');
  });

  it('does not treat a salePrice of zero as a sale', () => {
    // The admin form can store 0 with sale: true; a free garment must never render.
    expect(resolvePrice({ ...base, sale: true, salePrice: 0 })).toEqual({
      display: '₹8,000',
      compareAt: null,
      onSale: false,
    });
  });

  it('does not treat a negative salePrice as a sale', () => {
    expect(resolvePrice({ ...base, sale: true, salePrice: -100 }).onSale).toBe(false);
  });
});

describe('discountPercent and amountPayable', () => {
  it('rounds the cut to a whole percentage when a sale is genuinely active', () => {
    expect(discountPercent({ ...base, sale: true, salePrice: 6000 })).toBe(25);
    expect(discountPercent({ ...base, price: 10000, sale: true, salePrice: 6667 })).toBe(33);
    expect(amountPayable({ ...base, sale: true, salePrice: 6000 })).toBe(6000);
  });

  it('agrees with resolvePrice about what is a sale: anything else is no discount', () => {
    for (const salePrice of [0, -5, 8000, 9000, undefined]) {
      const product = { ...base, sale: true, salePrice };
      expect(resolvePrice(product).onSale).toBe(false);
      expect(discountPercent(product)).toBe(0);
      expect(amountPayable(product)).toBe(8000);
    }
    expect(discountPercent({ ...base, sale: false, salePrice: 4000 })).toBe(0);
    expect(amountPayable({ ...base, sale: false, salePrice: 4000 })).toBe(8000);
  });
});
