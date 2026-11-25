/**
 * Shop by Style, which now prints prices.
 *
 * The decision worth pinning is not the formatting — `lib/utils/price` owns that and has its
 * own tests — it is *which* garments get a price line at all. The section's fallback tier is
 * four placeholders carrying `price: 0`, and the whole bug class here is printing "₹0" under
 * one of them.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import ShopByStyle, { styleCardPrice } from './shop-by-style';

describe('styleCardPrice', () => {
  it('formats a real garment with the shared formatter', () => {
    expect(styleCardPrice({ price: 19500 })).toEqual({
      display: '₹19,500',
      compareAt: null,
      onSale: false,
    });
  });

  it('shows the sale price with the original to strike through', () => {
    expect(styleCardPrice({ price: 10000, sale: true, salePrice: 6000 })).toEqual({
      display: '₹6,000',
      compareAt: '₹10,000',
      onSale: true,
    });
  });

  // The admin form accepts "0" as a sale price, and a free lehenga is not what it meant.
  it('ignores a flagged sale with no usable sale price', () => {
    expect(styleCardPrice({ price: 10000, sale: true, salePrice: 0 })).toMatchObject({
      display: '₹10,000',
      onSale: false,
    });
    expect(styleCardPrice({ price: 10000, sale: true, salePrice: 12000 })).toMatchObject({
      display: '₹10,000',
      onSale: false,
    });
  });

  it('gives a placeholder no price at all rather than inventing one', () => {
    expect(styleCardPrice({ price: 0, isMock: true })).toBeNull();
    // Even a placeholder that somehow carried a number stays priceless: it is not a garment.
    expect(styleCardPrice({ price: 9999, isMock: true })).toBeNull();
  });

  it('gives a real garment with an unusable price no price line either', () => {
    expect(styleCardPrice({ price: 0 })).toBeNull();
    expect(styleCardPrice({ price: Number.NaN })).toBeNull();
    expect(styleCardPrice({ price: -1 })).toBeNull();
  });
});

const TWO_GARMENTS = {
  shopByStyle: [
    {
      id: 'p1',
      name: 'Ochre Indo-Western Pleated Set',
      price: 19500,
      sale: false,
      image: '/shop-by-style/f1.png',
      photos: ['/shop-by-style/f1.png', '/shop-by-style/b1.png'],
    },
    {
      id: 'p2',
      name: 'Banarasi Red Silk Saree',
      price: 10000,
      sale: true,
      salePrice: 6000,
      image: '/shop-by-style/f2.png',
      photos: ['/shop-by-style/f2.png'],
    },
  ],
};

function answer(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => answer(TWO_GARMENTS)));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ShopByStyle', () => {
  it('prints a price under every real garment', async () => {
    render(<ShopByStyle />);
    expect(await screen.findByText('₹19,500')).toBeInTheDocument();
    expect(screen.getByText('₹6,000')).toBeInTheDocument();
  });

  it('strikes through the original beside the sale price, and says so out loud', async () => {
    render(<ShopByStyle />);
    const original = await screen.findByLabelText('Was ₹10,000');
    expect(original).toHaveTextContent('₹10,000');
    expect(original).toHaveClass('line-through');
    // The garment that is not on sale has no struck-through second number.
    expect(screen.queryByLabelText('Was ₹19,500')).not.toBeInTheDocument();
  });

  it('leaves the placeholder tier priceless rather than printing ₹0', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => answer({ shopByStyle: [] })));
    render(<ShopByStyle />);
    // The four placeholders arrive, named, and not one of them carries a number.
    expect(await screen.findByText('Banarasi Anarkali Suit')).toBeInTheDocument();
    expect(screen.queryByText('₹0')).not.toBeInTheDocument();
    expect(screen.queryByText(/₹/)).not.toBeInTheDocument();
  });

  /**
   * The cards sit in a stretched row, so each one must fill the height it is handed instead of
   * sizing itself to its own content — otherwise the row's bottom edge goes ragged as soon as
   * one garment is on sale and one is not. This asserts the mechanism, because the symptom is
   * a layout difference no assertion in jsdom can see.
   */
  it('lets every card fill the row height so a sale line cannot make the row ragged', async () => {
    render(<ShopByStyle />);
    const card = (await screen.findByText('₹19,500')).closest('a');
    expect(card).toHaveClass('flex', 'h-full', 'flex-col');
    expect(card?.querySelector('.flex-1')).toBeTruthy();
  });

  it('falls back to the placeholder tier when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => answer({ error: 'nope' }, 500)));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ShopByStyle />);
    await waitFor(() => expect(screen.getByText('Banarasi Anarkali Suit')).toBeInTheDocument());
    expect(screen.queryByText(/₹/)).not.toBeInTheDocument();
  });
});
