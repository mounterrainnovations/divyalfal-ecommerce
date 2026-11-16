import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Collection from './collection';
import ShopByStyle from './shop-by-style';

/** Collection's spotlight band asks `useMedia` how many clips to render; answer "desktop". */
const useMedia = vi.hoisted(() => vi.fn<(query: string) => boolean>());
vi.mock('@/lib/hooks/useMedia', () => ({ useMedia }));
import { siteCopy } from '@/lib/content/site-copy';
import { formatPrice } from '@/lib/utils/price';
import type { Product } from '@/types';

/** `/api/homepage-sections` returns at most one product per category for this section. */
const products: Product[] = [
  {
    id: '002dc5ac',
    name: 'Midnight Silk Saree',
    price: 3500,
    sale: false,
    image: '/mocks/mock_mostRecommended_common.jpg',
    photos: [],
    category: 'Sarees',
  },
  {
    id: '713011fb',
    name: 'Test - Silk Saree 1',
    price: 10000,
    sale: false,
    image: '/a.jpg',
    photos: ['/a.jpg', '/b.jpg'],
    category: 'Western',
  },
];

function mockFetch(body: unknown, ok = true, status = 200) {
  const spy = vi.fn().mockResolvedValue({ ok, status, json: async () => body });
  vi.stubGlobal('fetch', spy);
  return spy;
}

const fallbackTiles = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('[data-tier="fallback"]'));

describe('ShopByStyle', () => {
  beforeEach(() => {
    useMedia.mockReset();
    useMedia.mockImplementation(query => query === '(min-width: 768px)');
    // The data hook logs the failure mode before falling back; keep the output readable.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders the heading verbatim from siteCopy', async () => {
    mockFetch({ freshArrivals: [], shopByStyle: products });
    render(<ShopByStyle />);

    expect(
      screen.getByRole('heading', { level: 2, name: siteCopy.home.style.heading })
    ).toBeInTheDocument();
    expect(siteCopy.home.style.heading).toBe('Shop By Style');
    // One section heading, and the request is allowed to settle inside act.
    await screen.findByRole('heading', { level: 3, name: products[0].name });
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1);
  });

  it('renders one real tile per category when the API returns them', async () => {
    mockFetch({ freshArrivals: [], shopByStyle: products });
    const { container } = render(<ShopByStyle />);

    await screen.findByRole('heading', { level: 3, name: products[0].name });
    for (const product of products) {
      expect(screen.getByRole('heading', { level: 3, name: product.name })).toBeInTheDocument();
    }
    expect(container.querySelectorAll('a[href^="/product/"]')).toHaveLength(products.length);
    expect(screen.getByText(formatPrice(3500))).toBeInTheDocument();
    expect(fallbackTiles(container)).toHaveLength(0);
    for (const item of siteCopy.home.style.items) {
      expect(screen.queryByText(item.name)).toBeNull();
    }
  });

  it('gives the widest slot to a photographed garment', async () => {
    mockFetch({ freshArrivals: [], shopByStyle: products });
    render(<ShopByStyle />);

    await screen.findByRole('heading', { level: 3, name: products[0].name });
    expect(screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent)).toEqual([
      'Test - Silk Saree 1',
      'Midnight Silk Saree',
    ]);
  });

  it('places the tiles at varied spans rather than in one even row', async () => {
    mockFetch({ freshArrivals: [], shopByStyle: products });
    const { container } = render(<ShopByStyle />);

    await screen.findByRole('heading', { level: 3, name: products[0].name });
    const placed = Array.from(container.querySelectorAll('[class*="md:col-span-"]'));
    const spans = new Set(placed.map(el => el.className.match(/md:col-span-\d+/)?.[0]));
    const starts = new Set(placed.map(el => el.className.match(/md:col-start-\d+/)?.[0]));
    expect(spans.size).toBeGreaterThanOrEqual(2);
    expect(starts.size).toBeGreaterThanOrEqual(2);
    expect(container.querySelectorAll('.grid-editorial').length).toBeGreaterThan(0);
  });

  it('falls back to the placeholder tier, dimmed and non-clickable, when the API returns empty arrays', async () => {
    mockFetch({ freshArrivals: [], shopByStyle: [] });
    const { container } = render(<ShopByStyle />);

    await screen.findByRole('heading', { level: 3, name: siteCopy.home.style.items[0].name });
    const tiles = fallbackTiles(container);
    expect(tiles).toHaveLength(siteCopy.home.style.items.length);

    for (const item of siteCopy.home.style.items) {
      expect(screen.getByRole('heading', { level: 3, name: item.name })).toBeInTheDocument();
    }
    for (const tile of tiles) {
      // The dim is on the plate, never on the name — `opacity` applies to the whole subtree
      // and axe measures the result, so a dimmed ancestor would cost the name its contrast.
      expect(tile.querySelector('.opacity-70 img')).not.toBeNull();
      expect(tile.className).not.toMatch(/\bopacity-\d+\b/);
      const name: Element | null = tile.querySelector('h3');
      for (let el: Element | null = name; el && el !== tile; el = el.parentElement) {
        expect(el.className).not.toMatch(/\bopacity-\d+\b/);
      }
      expect(tile.querySelectorAll('a')).toHaveLength(0);
      expect(tile.textContent ?? '').not.toMatch(/₹|Rs\./);
      // Decorative: the name below carries the label, so the alt must not repeat it.
      expect(tile.querySelector('img')).toHaveAttribute('alt', '');
    }
    expect(container.querySelector('a[href^="/product/"]')).toBeNull();
    expect(screen.queryAllByRole('img')).toHaveLength(0);
  });

  it.each([
    ['an empty object', {}, true, 200],
    ['an error payload with a 500', { error: 'Failed to fetch homepage sections' }, false, 500],
    ['an error payload with a 200', { error: 'Database configuration error' }, true, 200],
    ['a 500 with no body at all', null, false, 500],
    ['sections that are not arrays', { freshArrivals: null, shopByStyle: 'nope' }, true, 200],
  ])('falls back when the API returns %s, and never throws', async (_label, body, ok, status) => {
    mockFetch(body, ok as boolean, status as number);

    let container!: HTMLElement;
    expect(() => {
      container = render(<ShopByStyle />).container;
    }).not.toThrow();

    await screen.findByRole('heading', { level: 3, name: siteCopy.home.style.items[0].name });
    expect(fallbackTiles(container)).toHaveLength(siteCopy.home.style.items.length);
  });

  it('falls back when the fetch promise rejects, and never throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    let container!: HTMLElement;
    expect(() => {
      container = render(<ShopByStyle />).container;
    }).not.toThrow();

    await screen.findByRole('heading', { level: 3, name: siteCopy.home.style.items[0].name });
    expect(fallbackTiles(container)).toHaveLength(siteCopy.home.style.items.length);
  });

  it('takes its data from the shared hook, not from a sibling section', async () => {
    // The two movements import `lib/hooks/useHomepageSections` independently; neither
    // reaches into the other. This renders both only to pin the integration claim — that a
    // page carrying both movements still makes exactly one request.
    const spy = mockFetch({ freshArrivals: products, shopByStyle: products });
    render(
      <>
        <Collection />
        <ShopByStyle />
      </>
    );

    await waitFor(() =>
      expect(screen.getAllByRole('heading', { level: 3, name: products[0].name })).toHaveLength(2)
    );
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toBe('/api/homepage-sections');
  });

  it('uses no banned utility and no scroller apparatus', async () => {
    mockFetch({ freshArrivals: [], shopByStyle: products });
    const { container } = render(<ShopByStyle />);

    await screen.findByRole('heading', { level: 3, name: products[0].name });
    expect(container.querySelector('section')?.className).toMatch(/section-rhythm/);
    expect(container.innerHTML).not.toMatch(
      /rounded-full|rounded-3xl|gradient|shadow|(?:text|bg)-gray-/
    );
    // The pre-revamp section was a snap scroller with two floating chevron buttons.
    expect(container.querySelector('button')).toBeNull();
    expect(container.innerHTML).not.toMatch(/snap-x|scrollbar-hide|overflow-x-auto/);
  });
});
