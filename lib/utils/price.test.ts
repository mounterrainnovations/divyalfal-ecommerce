import { describe, expect, it } from 'vitest';
import { formatPrice, resolvePrice } from './price';
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

  it('treats a salePrice of zero as a real price, not a missing one', () => {
    // 0 != null, and 0 < price, so the rule says the sale is active.
    expect(resolvePrice({ ...base, sale: true, salePrice: 0 })).toMatchObject({
      display: '₹0',
      onSale: true,
    });
  });
});
