import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
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

function respondWith(products: Product[]) {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({ products, total: products.length, page: 1, limit: 50, totalPages: 1 }),
  }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const requested = (fetchMock: ReturnType<typeof respondWith>) =>
  fetchMock.mock.calls.map(call => (call as unknown[])[0] as string);
const lastRequest = (fetchMock: ReturnType<typeof respondWith>) => requested(fetchMock).at(-1);

beforeEach(() => {
  currentSearch = '';
  document.body.style.overflow = '';
});

afterEach(() => {
  cleanup();
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

  it('shows an honest labelled frame for the product with no photos', async () => {
    respondWith([saree, noPhotos]);
    const { container } = render(<ProductsPage />);
    await screen.findByText(/image coming soon/i);
    expect(container.innerHTML).not.toContain('mock_mostRecommended_common');
  });

  it('has exactly one h1, the page title, with the product names as h2s beneath it', async () => {
    respondWith([saree, noPhotos]);
    render(<ProductsPage />);
    const h1 = screen.getAllByRole('heading', { level: 1 });
    expect(h1).toHaveLength(1);
    expect(h1[0]).toHaveTextContent('All Products');
    expect(h1[0].textContent).toBe(siteCopy.nav.items.find(i => i.href === '/products')!.label);

    const names = await screen.findAllByRole('heading', { level: 2 });
    expect(names.map(h => h.textContent)).toEqual([saree.name, noPhotos.name]);
    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0);
  });

  it('renders an editorial empty state when no products match', async () => {
    respondWith([]);
    render(<ProductsPage />);

    const heading = await screen.findByRole('heading', { level: 2, name: 'No products found' });
    expect(heading).toBeInTheDocument();
    // Not a bare "no results": the collection copy and the six collections as ways forward.
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
  });

  it('offers a way out of a filtered empty state, and takes it', async () => {
    currentSearch = 'categories=Sarees';
    const fetchMock = respondWith([]);
    const user = userEvent.setup();
    render(<ProductsPage />);

    await screen.findByRole('heading', { level: 2, name: 'No products found' });
    expect(screen.getByText(/nothing matches/i)).toBeInTheDocument();
    expect(lastRequest(fetchMock)).toBe('/api/products?categories=Sarees&limit=50');

    await user.click(screen.getByRole('button', { name: 'Show all products' }));
    await waitFor(() => expect(lastRequest(fetchMock)).toBe('/api/products?limit=50'));
  });

  it('shows an error state with a retry, not a blank page', async () => {
    const failing = vi.fn(async () => ({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({}),
    }));
    vi.stubGlobal('fetch', failing);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    render(<ProductsPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(failing).toHaveBeenCalledTimes(2));
  });

  it('is loading, not empty, until the first response arrives', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    render(<ProductsPage />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading products');
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
    await screen.findAllByRole('heading', { level: 2 });
    expect(filled.container.innerHTML).not.toMatch(BANNED_SHAPES);
    filled.unmount();

    respondWith([]);
    const empty = render(<ProductsPage />);
    await screen.findByText('No products found');
    expect(empty.container.innerHTML).not.toMatch(BANNED_SHAPES);
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
    expect(screen.getByRole('checkbox', { name: 'Indo-Western', hidden: true })).toBeChecked();
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
    expect(
      new URL(requested(fetchMock)[0], 'http://x').searchParams.get('categories')
    ).toBe('Kurta Pant');
    expect(screen.getByRole('checkbox', { name: 'Kurta Pant', hidden: true })).toBeChecked();
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
    ).toBe('search=silk&categories=Sarees%2CKurta+Pant&minPrice=0&maxPrice=25000&sortBy=price-low&limit=50');
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
      expect(lastRequest(fetchMock)).toBe('/api/products?categories=Sarees&sortBy=price-low&limit=50')
    );

    await user.click(screen.getByRole('radio', { name: 'Under ₹25,000', hidden: true }));
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
    await waitFor(() => expect(lastRequest(fetchMock)).toBe('/api/products?categories=Lehengas&limit=50'));
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
    render(
      <FilterRail value={{ categories: ['Sarees'], range: null }} onChange={onChange} />
    );
    const checkboxes = screen.getAllByRole('checkbox', { hidden: true });
    expect(checkboxes.map(box => box.closest('label')!.textContent)).toEqual(
      CATEGORY_CONFIG.map(c => c.name)
    );
    expect(screen.getByRole('checkbox', { name: 'Sarees', hidden: true })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'All Prices', hidden: true })).toBeChecked();
    expect(screen.getAllByRole('radio', { hidden: true })).toHaveLength(6);
  });

  it('reports the whole next value on every change', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<FilterRail value={{ categories: ['Sarees'], range: null }} onChange={onChange} />);

    await user.click(screen.getByRole('checkbox', { name: 'Kurta Pant', hidden: true }));
    expect(onChange).toHaveBeenLastCalledWith({ categories: ['Sarees', 'Kurta Pant'], range: null });

    await user.click(screen.getByRole('checkbox', { name: 'Sarees', hidden: true }));
    expect(onChange).toHaveBeenLastCalledWith({ categories: [], range: null });

    await user.click(screen.getByRole('radio', { name: 'Above ₹1,00,000', hidden: true }));
    expect(onChange).toHaveBeenLastCalledWith({
      categories: ['Sarees'],
      range: { label: 'Above ₹1,00,000', min: 100000, max: 200000 },
    });

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(onChange).toHaveBeenLastCalledWith({ categories: [], range: null });
  });

  it('offers no clear control when nothing is selected', () => {
    render(<FilterRail value={{ categories: [], range: null }} onChange={() => {}} />);
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull();
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
    expect(screen.getByRole('button', { name: 'Filters' })).toHaveAttribute('aria-expanded', 'true');
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

  it('closes from the close button and from "Show results", each returning focus', async () => {
    respondWith([saree]);
    const user = userEvent.setup();
    render(<ProductsPage />);
    const toggle = screen.getByRole('button', { name: 'Filters' });

    await user.click(toggle);
    await user.click(screen.getByRole('button', { name: 'Close filters' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(toggle).toHaveFocus();

    await user.click(toggle);
    await user.click(screen.getByRole('button', { name: 'Show results' }));
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
    const done = within(dialog).getByRole('button', { name: 'Show results' });
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
    await user.click(within(dialog).getByRole('checkbox', { name: 'Lehengas', hidden: true }));
    await waitFor(() => expect(lastRequest(fetchMock)).toBe('/api/products?categories=Lehengas&limit=50'));

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
    expect(await screen.findByRole('heading', { level: 2, name: 'Ivory Anarkali Suit' })).toBeInTheDocument();
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
    await user.click(screen.getByRole('radio', { name: '25-50% OFF', hidden: true }));
    expect(requested(fetchMock)).toHaveLength(1);
  });

  it('sorts by discount, deepest first, and narrows by discount band', async () => {
    const small: Product = { ...onSale, id: 'a', name: 'Small Cut', price: 10000, salePrice: 9000 };
    const deep: Product = { ...onSale, id: 'b', name: 'Deep Cut', price: 10000, salePrice: 5000 };
    respondWith([small, deep]);
    const user = userEvent.setup();
    render(<SalePage />);
    await screen.findByRole('link', { name: /Small Cut/ });
    const order = () => screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent);

    expect(order()).toEqual(['Deep Cut', 'Small Cut']);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'discount-low');
    expect(order()).toEqual(['Small Cut', 'Deep Cut']);

    await user.click(screen.getByRole('radio', { name: '10-25% OFF', hidden: true }));
    expect(order()).toEqual(['Small Cut']);
  });

  it('renders an editorial empty state with a way back to the full collection', async () => {
    respondWith([saree]);
    render(<SalePage />);
    expect(
      await screen.findByRole('heading', { level: 2, name: 'No sale products found' })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: siteCopy.home.explore.cta })).toHaveAttribute(
      'href',
      '/products'
    );
    expect(screen.getByText(siteCopy.home.explore.body)).toBeInTheDocument();
  });
});
