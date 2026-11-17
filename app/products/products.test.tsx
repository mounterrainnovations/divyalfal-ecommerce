import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Product } from '@/types';
import { siteCopy } from '@/lib/content/site-copy';
import { CATEGORY_CONFIG } from '@/lib/common/product-interfaces';
import { buildProductsQuery, parseCategoriesParam } from '@/lib/hooks/useProductListing';
import { FilterRail } from '@/components/features/products/filter-rail';

/**
 * The pages read `?categories=` through `useSearchParams`; each test sets the query string the
 * address bar would hold, exactly as the homepage's category links spell it.
 */
let currentSearch = '';
// Next hands out a stable object between renders; a fresh one per call would re-fire effects.
const searchParamsCache = new Map<string, URLSearchParams>();
const stableSearchParams = (query: string) => {
  if (!searchParamsCache.has(query)) searchParamsCache.set(query, new URLSearchParams(query));
  return searchParamsCache.get(query)!;
};
vi.mock('next/navigation', () => ({
  useSearchParams: () => stableSearchParams(currentSearch),
  usePathname: () => '/products',
}));

import ProductsPage from './page';
import SalePage from '../sale/page';

// Banned vocabulary, assembled from fragments so this file's own source never spells one.
const BANNED_SHAPES = new RegExp(
  [
    ['rounded', 'full'].join('-'),
    ['rounded', '3xl'].join('-'),
    ['bg', 'gradient'].join('-'),
    ['gray', '\\d'].join('-'),
    ['shadow', '(?:sm|md|lg|xl)'].join('-'),
  ].join('|')
);

const saree: Product = {
  id: 'saree-1',
  name: 'Emerald Banarasi Saree',
  price: 45000,
  image: '/mocks/mock_mostRecommended_common.jpg',
  photos: ['/a.jpg', '/b.jpg'],
  category: 'Sarees',
};

// The live catalogue's second product has no photos; the transform still hands it a stock
// mock in `image`, which the tile must ignore.
const noPhotos: Product = {
  id: 'lehenga-1',
  name: 'Rose Lehenga Set',
  price: 85000,
  image: '/mocks/mock_mostRecommended_common.jpg',
  photos: [],
  category: 'Lehengas',
};

const onSale: Product = {
  id: 'suit-1',
  name: 'Ivory Anarkali Suit',
  price: 20000,
  sale: true,
  salePrice: 15000,
  image: '/s.jpg',
  photos: ['/s.jpg'],
  category: 'Suits',
};

const okResponse = (products: Product[]) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: async () => ({ products, total: products.length, page: 1, limit: 50, totalPages: 1 }),
});

const failResponse = (status: number, statusText: string) => ({
  ok: false,
  status,
  statusText,
  json: async () => ({}),
});

function respondWith(products: Product[]) {
  const fetchMock = vi.fn<(url: string, init?: unknown) => Promise<unknown>>(async () =>
    okResponse(products)
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

type FetchMock = ReturnType<typeof respondWith>;
const requested = (fetchMock: FetchMock) =>
  fetchMock.mock.calls.map(call => (call as unknown[])[0] as string);
const lastRequest = (fetchMock: FetchMock) => requested(fetchMock).at(-1);

/** A fetch whose every call stays pending until the test settles it, so ordering is explicit. */
function controlledFetch() {
  const calls: { url: string; signal: AbortSignal; settle: (products: Product[]) => void }[] = [];
  const fetchMock = vi.fn(
    (url: string, init?: { signal?: AbortSignal }) =>
      new Promise(resolve => {
        calls.push({
          url,
          signal: init!.signal!,
          settle: products => resolve(okResponse(products)),
        });
      })
  );
  vi.stubGlobal('fetch', fetchMock);
  return { calls, fetchMock };
}

beforeEach(() => {
  currentSearch = '';
  document.body.style.overflow = '';
});

afterEach(() => {
  cleanup();
  // Restores every spy, so a silenced console.error cannot leak into later tests.
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.style.overflow = '';
});

describe('/products', () => {
  it('renders a tile per product returned by the API', async () => {
    respondWith([saree, noPhotos]);
    render(<ProductsPage />);

    const tiles = await screen.findAllByRole('link', { name: /Saree|Lehenga/ });
    expect(tiles).toHaveLength(2);
    expect(tiles[0]).toHaveAttribute('href', '/product/saree-1');
    expect(tiles[1]).toHaveAttribute('href', '/product/lehenga-1');
    expect(screen.getByRole('status')).toHaveTextContent('2 products found');
  });

  it('shows an honest labelled frame, and no <img> at all, for the product with no photos', async () => {
    respondWith([saree, noPhotos]);
    const { container } = render(<ProductsPage />);
    const tile = await screen.findByRole('link', { name: /Rose Lehenga Set/ });
    expect(within(tile).getByText(/image coming soon/i)).toBeInTheDocument();
    expect(tile.querySelector('img')).toBeNull();
    expect(container.innerHTML).not.toContain('mock_mostRecommended_common.jpg" alt="Rose');
    // The product that does have photos still shows its picture.
    const withPhotos = screen.getByRole('link', { name: /Emerald Banarasi Saree/ });
    expect(withPhotos.querySelector('img')).not.toBeNull();
  });

  /**
   * The `sizes` hint has to describe this grid, not a generic one. Measured at both edges of
   * every band: 719px at 767 (one-up, the full content width), 456px at 1023 (two-up), 350px
   * at 1439 (two-up, narrower from lg because the filter rail takes a share of the row), and
   * a fixed 350px from 1440 up where the editorial grid stops growing. The shared default this
   * replaced asked for 195px at 390 and 253px at 768.
   */
  it('hints each photograph at the width this grid actually renders it', async () => {
    respondWith([saree, noPhotos]);
    render(<ProductsPage />);
    const tile = await screen.findByRole('link', { name: /Emerald Banarasi Saree/ });
    const sizes = tile.querySelector('img')?.getAttribute('sizes') ?? '';
    expect(sizes).toBe(
      '(min-width: 1440px) 350px, (min-width: 1024px) 25vw, (min-width: 768px) 45vw, calc(100vw - 48px)'
    );
    // Never ProductTile's bare fallback: this surface measures its own.
    expect(sizes).not.toBe('calc(100vw - 48px)');
  });

  it('has exactly one h1, the page title, with the product names as h2s beneath it', async () => {
    respondWith([saree, noPhotos]);
    render(<ProductsPage />);
    const h1 = screen.getAllByRole('heading', { level: 1 });
    expect(h1).toHaveLength(1);
    expect(h1[0]).toHaveTextContent('All Products');
    expect(h1[0].textContent).toBe(siteCopy.nav.items.find(i => i.href === '/products')!.label);

    await screen.findAllByRole('link', { name: /Saree|Lehenga/ });
    const names = screen.getAllByRole('heading', { level: 2 });
    expect(names.map(h => h.textContent)).toEqual([saree.name, noPhotos.name]);
    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0);
  });

  it('lays tiles out as a two-track grid in product order, with the even cells offset', async () => {
    respondWith([saree, noPhotos, onSale]);
    render(<ProductsPage />);
    await screen.findAllByRole('link', { name: /Saree|Lehenga|Suit/ });
    const list = screen.getAllByRole('list').find(ul => ul.querySelector('a[href^="/product/"]'))!;
    // Not CSS columns (which fill column-first and misread a ranked sort): a grid whose DOM
    // order is its reading order, with a fixed offset on the even cells.
    expect(list.className).toMatch(/\bgrid\b/);
    expect(list.className).toMatch(/md:grid-cols-2/);
    expect(list.className).toMatch(/nth-child\(even\)/);
    expect(list.className).not.toMatch(/columns-/);
    expect(
      Array.from(list.querySelectorAll('a[href^="/product/"]')).map(a => a.getAttribute('href'))
    ).toEqual(['/product/saree-1', '/product/lehenga-1', '/product/suit-1']);
  });

  it('renders an editorial empty state when no products match', async () => {
    respondWith([]);
    render(<ProductsPage />);

    const heading = await screen.findByRole('heading', { level: 2, name: 'No products found' });
    expect(heading).toBeInTheDocument();
    // Not a bare "no results": the original line, the collection copy and the six collections.
    expect(screen.getByText(siteCopy.products.empty.body)).toBeInTheDocument();
    expect(siteCopy.products.empty.body).toBe('Stay Tuned! What you want might be on its way!');
    expect(screen.getByText(siteCopy.home.explore.body)).toBeInTheDocument();
    for (const { name } of CATEGORY_CONFIG) {
      expect(screen.getByRole('link', { name })).toHaveAttribute(
        'href',
        `/products?categories=${encodeURIComponent(name)}`
      );
    }
    // Still one h1, and the page still has its controls.
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('searchbox', { name: 'Search products' })).toBeInTheDocument();
    // Nothing on this page that the copy module does not hold.
    expect(screen.queryByText(/nothing matches/i)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Clear Filters' })).toBeNull();
  });

  it('offers a way out of a filtered empty state, and takes it', async () => {
    currentSearch = 'categories=Sarees';
    const fetchMock = respondWith([]);
    const user = userEvent.setup();
    render(<ProductsPage />);

    await screen.findByRole('heading', { level: 2, name: 'No products found' });
    expect(lastRequest(fetchMock)).toBe('/api/products?categories=Sarees&limit=50');

    await user.click(screen.getByRole('button', { name: 'Clear Filters' }));
    await waitFor(() => expect(lastRequest(fetchMock)).toBe('/api/products?limit=50'));
  });

  it('clearing from the empty state sends one request, not one with the stale search first', async () => {
    currentSearch = 'categories=Sarees';
    const fetchMock = respondWith([]);
    const user = userEvent.setup();
    render(<ProductsPage />);
    await screen.findByRole('heading', { level: 2, name: 'No products found' });

    await user.type(screen.getByRole('searchbox', { name: 'Search products' }), 'silk');
    await waitFor(() =>
      expect(lastRequest(fetchMock)).toBe('/api/products?search=silk&categories=Sarees&limit=50')
    );
    const before = requested(fetchMock).length;

    await user.click(screen.getByRole('button', { name: 'Clear Filters' }));
    // Wait out the debounce: a lagging search value would fire a second request here.
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 450));
    });
    expect(requested(fetchMock).slice(before)).toEqual(['/api/products?limit=50']);
  });

  it('shows an error state with a retry, and restores the console it silenced', async () => {
    const failing = vi.fn(async () => failResponse(404, 'Not Found'));
    vi.stubGlobal('fetch', failing);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    render(<ProductsPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong');
    // A 404 is final: no automatic retry, only the one the visitor asks for.
    expect(failing).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Try Again' }));
    await waitFor(() => expect(failing).toHaveBeenCalledTimes(2));
    expect(consoleError).toHaveBeenCalled();
  });

  it('is loading, not empty, until the first response arrives', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    render(<ProductsPage />);
    expect(screen.getByRole('status')).toHaveTextContent(siteCopy.products.loading.heading);
    expect(screen.getByRole('heading', { level: 2, name: 'Loading Products...' })).toBeInTheDocument();
    expect(screen.getByText('Please wait while we fetch the latest collection.')).toBeInTheDocument();
    expect(screen.queryByText('No products found')).toBeNull();
  });

  it('shows the sale price in the sale token with the original struck through', async () => {
    respondWith([onSale, saree]);
    render(<ProductsPage />);
    const tile = await screen.findByRole('link', { name: /Ivory Anarkali Suit/ });
    expect(within(tile).getByText('₹15,000')).toHaveClass('text-sale');
    expect(within(tile).getByText('₹20,000').closest('s')).not.toBeNull();
    const regular = screen.getByRole('link', { name: /Emerald Banarasi Saree/ });
    expect(within(regular).getByText('₹45,000')).not.toHaveClass('text-sale');
  });

  it('uses no banned visual vocabulary, filled or empty', async () => {
    respondWith([saree, noPhotos]);
    const filled = render(<ProductsPage />);
    await screen.findAllByRole('link', { name: /Saree|Lehenga/ });
    expect(filled.container.innerHTML).not.toMatch(BANNED_SHAPES);
    filled.unmount();

    respondWith([]);
    const empty = render(<ProductsPage />);
    await screen.findByText('No products found');
    expect(empty.container.innerHTML).not.toMatch(BANNED_SHAPES);
  });
});

describe('what the page does while a new query is loading', () => {
  it('keeps the previous results on screen, so the page does not collapse and jump', async () => {
    const { calls } = controlledFetch();
    const user = userEvent.setup();
    render(<ProductsPage />);

    await waitFor(() => expect(calls).toHaveLength(1));
    await act(async () => calls[0].settle([saree, noPhotos]));
    await screen.findByRole('link', { name: /Emerald Banarasi Saree/ });

    await user.click(screen.getByRole('checkbox', { name: 'Sarees' }));
    await waitFor(() => expect(calls).toHaveLength(2));

    // The list is still there, marked busy, and the status says what is happening.
    const list = screen.getAllByRole('list').find(ul => ul.querySelector('a[href^="/product/"]'))!;
    expect(list).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('link', { name: /Emerald Banarasi Saree/ })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Loading Products...');
    // No text sits inside an opacity utility while it waits.
    expect(list.className).not.toMatch(/opacity/);

    await act(async () => calls[1].settle([saree]));
    await waitFor(() => expect(screen.queryByRole('link', { name: /Rose Lehenga/ })).toBeNull());
    expect(list).not.toHaveAttribute('aria-busy', 'true');
  });

  it('aborts a superseded request, and a late stale answer cannot overwrite the newer one', async () => {
    const { calls } = controlledFetch();
    const user = userEvent.setup();
    render(<ProductsPage />);
    await waitFor(() => expect(calls).toHaveLength(1));

    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'price-low');
    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[0].signal.aborted).toBe(true);
    expect(calls[1].signal.aborted).toBe(false);

    // The first answer arrives late (a mock that ignores the abort): it must not paint.
    await act(async () => calls[0].settle([noPhotos]));
    expect(screen.queryByRole('link', { name: /Rose Lehenga/ })).toBeNull();

    await act(async () => calls[1].settle([saree]));
    expect(await screen.findByRole('link', { name: /Emerald Banarasi Saree/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Rose Lehenga/ })).toBeNull();
  });

  it('aborts the in-flight request when the page unmounts', async () => {
    const { calls } = controlledFetch();
    const { unmount } = render(<ProductsPage />);
    await waitFor(() => expect(calls).toHaveLength(1));
    unmount();
    expect(calls[0].signal.aborted).toBe(true);
  });
});

describe('retrying a failed request', () => {
  it('retries a 500 and recovers when the retry succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(failResponse(500, 'Internal Server Error'))
      .mockResolvedValue(okResponse([saree]));
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ProductsPage />);

    expect(await screen.findByRole('link', { name: /Saree/ }, { timeout: 3000 })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe(fetchMock.mock.calls[0][0]);
  });

  it('retries a dropped connection (fetch rejects with a TypeError) and recovers', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValue(okResponse([saree]));
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ProductsPage />);

    expect(await screen.findByRole('link', { name: /Saree/ }, { timeout: 3000 })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('gives up after two retries, three requests in all, and says so', { timeout: 8000 }, async () => {
    const fetchMock = vi.fn(async () => failResponse(500, 'Internal Server Error'));
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ProductsPage />);

    expect(await screen.findByRole('alert', {}, { timeout: 5000 })).toHaveTextContent(
      'Something went wrong'
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe('the request /products sends (a contract with the homepage links)', () => {
  it('sends only `limit` when nothing is selected', async () => {
    const fetchMock = respondWith([saree]);
    render(<ProductsPage />);
    await screen.findByRole('link', { name: /Saree/ });
    expect(requested(fetchMock)).toEqual(['/api/products?limit=50']);
  });

  it('reads the plural `categories` parameter the homepage links carry', async () => {
    currentSearch = `categories=${encodeURIComponent('Indo-Western')}`;
    const fetchMock = respondWith([saree]);
    render(<ProductsPage />);
    await screen.findByRole('link', { name: /Saree/ });
    expect(requested(fetchMock)).toEqual(['/api/products?categories=Indo-Western&limit=50']);
    expect(screen.getByRole('checkbox', { name: 'Indo-Western' })).toBeChecked();
  });

  it('round-trips `Kurta%20Pant` from the homepage link to the API request', async () => {
    const homepageHref = `/products?categories=${encodeURIComponent('Kurta Pant')}`;
    expect(homepageHref).toBe('/products?categories=Kurta%20Pant');
    // What the address bar holds after following that link.
    currentSearch = homepageHref.split('?')[1];

    const fetchMock = respondWith([saree]);
    render(<ProductsPage />);
    await screen.findByRole('link', { name: /Saree/ });
    // URLSearchParams spells the space `+`; the route's own searchParams decodes it back.
    expect(requested(fetchMock)).toEqual(['/api/products?categories=Kurta+Pant&limit=50']);
    expect(new URL(requested(fetchMock)[0], 'http://x').searchParams.get('categories')).toBe(
      'Kurta Pant'
    );
    expect(screen.getByRole('checkbox', { name: 'Kurta Pant' })).toBeChecked();
  });

  it('parses every homepage category link back to its display name', () => {
    for (const { name } of CATEGORY_CONFIG) {
      const query = new URLSearchParams(`categories=${encodeURIComponent(name)}`);
      expect(parseCategoriesParam(query.get('categories'))).toEqual([name]);
    }
    expect(parseCategoriesParam('Sarees,Kurta Pant')).toEqual(['Sarees', 'Kurta Pant']);
    expect(parseCategoriesParam(null)).toEqual([]);
    expect(parseCategoriesParam('')).toEqual([]);
    // A stray "%" in a hand-typed URL must not throw.
    expect(() => parseCategoriesParam('100%')).not.toThrow();
  });

  it('keeps the parameter names, their order and the comma join', () => {
    expect(
      buildProductsQuery({
        search: 'silk',
        categories: ['Sarees', 'Kurta Pant'],
        priceRange: { min: 0, max: 25000 },
        sortBy: 'price-low',
      })
    ).toBe(
      'search=silk&categories=Sarees%2CKurta+Pant&minPrice=0&maxPrice=25000&sortBy=price-low&limit=50'
    );
    expect(buildProductsQuery({ sortBy: 'default' })).toBe('limit=50');
    expect(buildProductsQuery({})).toBe('limit=50');
    // Never the singular `category` or a bare `sort`.
    expect(buildProductsQuery({ categories: ['Sarees'], sortBy: 'newest' })).not.toMatch(
      /(?:^|&)(?:category|sort)=/
    );
  });

  it('sends the sort the select picks as `sortBy`, and the price band as minPrice/maxPrice', async () => {
    currentSearch = 'categories=Sarees';
    const fetchMock = respondWith([saree]);
    const user = userEvent.setup();
    render(<ProductsPage />);
    await screen.findByRole('link', { name: /Saree/ });

    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'price-low');
    await waitFor(() =>
      expect(lastRequest(fetchMock)).toBe(
        '/api/products?categories=Sarees&sortBy=price-low&limit=50'
      )
    );

    await user.click(screen.getByRole('radio', { name: 'Under ₹25,000' }));
    await waitFor(() =>
      expect(lastRequest(fetchMock)).toBe(
        '/api/products?categories=Sarees&minPrice=0&maxPrice=25000&sortBy=price-low&limit=50'
      )
    );
  });

  it('sends the search as `search`, after a pause rather than per keystroke', async () => {
    const fetchMock = respondWith([saree]);
    const user = userEvent.setup();
    render(<ProductsPage />);
    await screen.findByRole('link', { name: /Saree/ });

    await user.type(screen.getByRole('searchbox', { name: 'Search products' }), 'silk');
    await waitFor(() => expect(lastRequest(fetchMock)).toBe('/api/products?search=silk&limit=50'));
    expect(requested(fetchMock).filter(url => url.includes('search='))).toEqual([
      '/api/products?search=silk&limit=50',
    ]);
  });

  it('follows a new ?categories= while already on the page', async () => {
    const fetchMock = respondWith([saree]);
    const { rerender } = render(<ProductsPage />);
    await screen.findByRole('link', { name: /Saree/ });

    currentSearch = 'categories=Lehengas';
    rerender(<ProductsPage />);
    await waitFor(() =>
      expect(lastRequest(fetchMock)).toBe('/api/products?categories=Lehengas&limit=50')
    );
  });
});

describe('the filter rail and the sort control', () => {
  it('sorts with a native select named by a visible label', async () => {
    respondWith([saree]);
    render(<ProductsPage />);
    const select = screen.getByRole('combobox', { name: 'Sort by' });
    expect(select.tagName).toBe('SELECT');
    expect(within(select).getAllByRole('option').map(o => o.textContent)).toEqual([
      'Default',
      'Price: Low to High',
      'Price: High to Low',
      'Newest First',
    ]);
  });

  it('is a quiet list of native inputs: checkboxes for categories, radios for price', () => {
    const onChange = vi.fn();
    render(<FilterRail value={{ categories: ['Sarees'], range: null }} onChange={onChange} />);
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.map(box => box.closest('label')!.textContent)).toEqual(
      CATEGORY_CONFIG.map(c => c.name)
    );
    expect(screen.getByRole('checkbox', { name: 'Sarees' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'All Prices' })).toBeChecked();
    expect(screen.getAllByRole('radio')).toHaveLength(6);
    expect(screen.getByText('Price Range')).toBeInTheDocument();
  });

  it('reports the whole next value on every change', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<FilterRail value={{ categories: ['Sarees'], range: null }} onChange={onChange} />);

    await user.click(screen.getByRole('checkbox', { name: 'Kurta Pant' }));
    expect(onChange).toHaveBeenLastCalledWith({ categories: ['Sarees', 'Kurta Pant'], range: null });

    await user.click(screen.getByRole('checkbox', { name: 'Sarees' }));
    expect(onChange).toHaveBeenLastCalledWith({ categories: [], range: null });

    await user.click(screen.getByRole('radio', { name: 'Above ₹1,00,000' }));
    expect(onChange).toHaveBeenLastCalledWith({
      categories: ['Sarees'],
      range: { label: 'Above ₹1,00,000', min: 100000, max: 200000 },
    });

    await user.click(screen.getByRole('button', { name: 'Clear all filters (1)' }));
    expect(onChange).toHaveBeenLastCalledWith({ categories: [], range: null });
  });

  it('offers no clear control when nothing is selected', () => {
    render(<FilterRail value={{ categories: [], range: null }} onChange={() => {}} />);
    expect(screen.queryByRole('button', { name: /clear/i })).toBeNull();
  });

  it('keeps two copies of the rail from sharing a radio group', () => {
    const { container } = render(
      <>
        <FilterRail value={{ categories: [], range: null }} onChange={() => {}} />
        <FilterRail value={{ categories: [], range: null }} onChange={() => {}} />
      </>
    );
    const names = new Set(
      Array.from(container.querySelectorAll<HTMLInputElement>('input[type=radio]')).map(i => i.name)
    );
    expect(names.size).toBe(2);
  });
});

describe('the mobile filter drawer', () => {
  it('is not in the DOM until opened', () => {
    respondWith([saree]);
    render(<ProductsPage />);
    expect(screen.queryByRole('dialog')).toBeNull();
    const toggle = screen.getByRole('button', { name: 'Filters' });
    expect(toggle).toHaveAttribute('aria-haspopup', 'dialog');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens as a modal dialog, locks the body and moves focus in', async () => {
    respondWith([saree]);
    const user = userEvent.setup();
    render(<ProductsPage />);
    await user.click(screen.getByRole('button', { name: 'Filters' }));

    const dialog = screen.getByRole('dialog', { name: 'Filters' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(document.body.style.overflow).toBe('hidden');
    expect(within(dialog).getByRole('button', { name: 'Close filters' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Filters' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  it('closes on Escape, restoring scroll and returning focus to the opener', async () => {
    respondWith([saree]);
    document.body.style.overflow = 'scroll';
    const user = userEvent.setup();
    render(<ProductsPage />);
    const toggle = screen.getByRole('button', { name: 'Filters' });
    await user.click(toggle);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.body.style.overflow).toBe('scroll');
    expect(toggle).toHaveFocus();
  });

  it('restores body scroll when the page unmounts while the drawer is open', async () => {
    respondWith([saree]);
    document.body.style.overflow = 'scroll';
    const user = userEvent.setup();
    const { unmount } = render(<ProductsPage />);
    await user.click(screen.getByRole('button', { name: 'Filters' }));
    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).toBe('scroll');
  });

  it('closes from the close button and from "Apply Filters", each returning focus', async () => {
    respondWith([saree]);
    const user = userEvent.setup();
    render(<ProductsPage />);
    const toggle = screen.getByRole('button', { name: 'Filters' });

    await user.click(toggle);
    await user.click(screen.getByRole('button', { name: 'Close filters' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(toggle).toHaveFocus();

    await user.click(toggle);
    await user.click(screen.getByRole('button', { name: 'Apply Filters' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(toggle).toHaveFocus();
  });

  it('keeps Tab and Shift+Tab inside the dialog', async () => {
    respondWith([saree]);
    const user = userEvent.setup();
    render(<ProductsPage />);
    await user.click(screen.getByRole('button', { name: 'Filters' }));
    const dialog = screen.getByRole('dialog');

    const close = within(dialog).getByRole('button', { name: 'Close filters' });
    const done = within(dialog).getByRole('button', { name: 'Apply Filters' });
    expect(close).toHaveFocus();

    await user.tab({ shift: true });
    expect(done).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
  });

  it('filters from inside the drawer and shows the count on the opener', async () => {
    const fetchMock = respondWith([saree]);
    const user = userEvent.setup();
    render(<ProductsPage />);
    await user.click(screen.getByRole('button', { name: 'Filters' }));

    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('checkbox', { name: 'Lehengas' }));
    await waitFor(() =>
      expect(lastRequest(fetchMock)).toBe('/api/products?categories=Lehengas&limit=50')
    );

    await user.click(within(dialog).getByRole('button', { name: 'Close filters' }));
    expect(screen.getByRole('button', { name: 'Filters (1)' })).toBeInTheDocument();
  });
});

describe('/sale', () => {
  it('has one h1 and tiles as h2s', async () => {
    respondWith([onSale]);
    render(<SalePage />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sale');
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Ivory Anarkali Suit' })
    ).toBeInTheDocument();
  });

  it('keeps its subtitle under the title, from the copy module', () => {
    respondWith([onSale]);
    render(<SalePage />);
    expect(screen.getByText(siteCopy.sale.hero.subheading)).toBeInTheDocument();
    expect(siteCopy.sale.hero.subheading).toBe('Exclusive deals and discounts on premium products');
  });

  it('shows sale prices in the sale token', async () => {
    respondWith([onSale]);
    render(<SalePage />);
    const tile = await screen.findByRole('link', { name: /Ivory Anarkali Suit/ });
    expect(within(tile).getByText('₹15,000')).toHaveClass('text-sale');
    expect(within(tile).getByText('₹20,000').closest('s')).not.toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('1 product on sale');
  });

  it('lists only products whose sale is genuinely active', async () => {
    const flaggedFree: Product = { ...onSale, id: 'x', name: 'Free Flagged', salePrice: 0 };
    const flaggedHigher: Product = { ...onSale, id: 'y', name: 'Higher Flagged', salePrice: 30000 };
    respondWith([saree, flaggedFree, flaggedHigher, onSale]);
    render(<SalePage />);
    await screen.findByRole('link', { name: /Ivory Anarkali Suit/ });
    expect(screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent)).toEqual([
      'Ivory Anarkali Suit',
    ]);
  });

  it('sends the same request shape as /products, with no sortBy and no price', async () => {
    currentSearch = `categories=${encodeURIComponent('Kurta Pant')}`;
    const fetchMock = respondWith([onSale]);
    const user = userEvent.setup();
    render(<SalePage />);
    await screen.findByRole('link', { name: /Ivory Anarkali Suit/ });
    expect(requested(fetchMock)).toEqual(['/api/products?categories=Kurta+Pant&limit=50']);

    // Sorting and the discount band are applied in the browser: no new request.
    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'price-high');
    await user.click(screen.getByRole('radio', { name: '25-50% OFF' }));
    expect(requested(fetchMock)).toHaveLength(1);
  });

  it('starts on Default, the API order, and still offers every discount sort', async () => {
    const small: Product = { ...onSale, id: 'a', name: 'Small Cut', price: 10000, salePrice: 9000 };
    const deep: Product = { ...onSale, id: 'b', name: 'Deep Cut', price: 10000, salePrice: 5000 };
    respondWith([small, deep]);
    const user = userEvent.setup();
    render(<SalePage />);
    await screen.findByRole('link', { name: /Small Cut/ });
    const select = screen.getByRole('combobox', { name: 'Sort by' }) as HTMLSelectElement;
    const order = () => screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent);

    expect(select.value).toBe('default');
    expect(within(select).getAllByRole('option').map(o => o.textContent)).toEqual([
      'Default',
      'Highest Discount',
      'Lowest Discount',
      'Price: Low to High',
      'Price: High to Low',
      'Newest First',
    ]);
    // Default is the order the API gave, not a discount ranking.
    expect(order()).toEqual(['Small Cut', 'Deep Cut']);

    await user.selectOptions(select, 'discount-high');
    expect(order()).toEqual(['Deep Cut', 'Small Cut']);
    await user.selectOptions(select, 'discount-low');
    expect(order()).toEqual(['Small Cut', 'Deep Cut']);
    await user.selectOptions(select, 'price-low');
    expect(order()).toEqual(['Deep Cut', 'Small Cut']);

    await user.click(screen.getByRole('radio', { name: '10-25% OFF' }));
    expect(order()).toEqual(['Small Cut']);
  });

  it('renders an editorial empty state with the original line and a way back', async () => {
    respondWith([saree]);
    render(<SalePage />);
    expect(
      await screen.findByRole('heading', { level: 2, name: 'No sale products found' })
    ).toBeInTheDocument();
    expect(screen.getByText(siteCopy.sale.empty.body)).toBeInTheDocument();
    expect(siteCopy.sale.empty.body).toBe('Check back soon for amazing deals and discounts!');
    expect(screen.getByRole('link', { name: siteCopy.home.explore.cta })).toHaveAttribute(
      'href',
      '/products'
    );
    expect(screen.getByText(siteCopy.home.explore.body)).toBeInTheDocument();
  });

  it('says what it is loading, in its own words', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    render(<SalePage />);
    expect(screen.getByRole('heading', { level: 2, name: 'Loading Sale Products...' })).toBeInTheDocument();
    expect(screen.getByText('Finding the best deals for you!')).toBeInTheDocument();
  });
});
