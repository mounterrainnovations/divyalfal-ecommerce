import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

/**
 * The Products screen, with the catalogue answering.
 *
 * `catalogue.test.ts` covers the query, the header sentence and the remembered view in
 * isolation. This covers the four things about the screen that would be invisible until a
 * human hit them:
 *
 *  1. that the list it draws is the live half of the catalogue and says how much it is hiding,
 *  2. that the top bar's `?q=` still lands here — on arrival *and* on a second search, which
 *     is the behaviour that used to be an effect copying the URL into state and is now
 *     derived (see the note in `page.tsx`),
 *  3. that an archived product is visibly marked as such and offers Restore rather than only
 *     a delete, and
 *  4. that the grid is the same rows, with the same actions, under a toggle that is remembered.
 *
 * `next/navigation` is stubbed because this is a route component: `useSearchParams` comes from
 * a router that does not exist in jsdom. `handed` is read on every render, so changing it and
 * re-rendering is exactly what the top bar pushing a second search does.
 */

let handed = '';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(handed ? `q=${handed}` : ''),
}));

import ProductsPage from './page';

interface Call {
  url: string;
  method: string;
  body: unknown;
}

let calls: Call[] = [];

function answer(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const LIVE = {
  id: 'p1',
  name: 'Banarasi Red Silk Saree',
  price: 12000,
  photos: ['https://example.test/storage/v1/object/public/product-images/saree.webp'],
  image: 'https://example.test/storage/v1/object/public/product-images/saree.webp',
  category: 'Sarees',
  specifications: '<p>Pure silk</p>',
  isArchived: false,
};

const ARCHIVED = {
  id: 'p2',
  name: 'Retired Lehenga',
  price: 9000,
  photos: [],
  image: '/collection/1.png',
  category: 'Lehengas',
  specifications: '',
  isArchived: true,
};

/** The list response, with the archive split the header reads. */
function list(products: unknown[], counts: { live: number; archived: number }) {
  return answer({
    products,
    total: products.length,
    page: 1,
    limit: 20,
    totalPages: 1,
    counts,
  });
}

function stub(reply: (call: Call) => Response) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const call: Call = {
        url: String(url),
        method: init?.method ?? 'GET',
        body: init?.body && typeof init.body === 'string' ? JSON.parse(init.body) : undefined,
      };
      calls.push(call);
      return reply(call);
    })
  );
}

/** One live product and one archived one, with every write accepted. */
function stubCatalogue(products: unknown[] = [LIVE], counts = { live: 1, archived: 1 }) {
  stub(call => {
    if (call.method !== 'GET') return answer({ ok: true });
    return list(products, counts);
  });
}

const lastList = () => [...calls].reverse().find(call => call.method === 'GET');

beforeEach(() => {
  calls = [];
  handed = '';
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('the products screen', () => {
  it('asks for the live half of the catalogue, and for the archive split', async () => {
    stubCatalogue();
    render(<ProductsPage />);

    await waitFor(() => expect(lastList()).toBeDefined());
    const url = new URL(lastList()!.url, 'http://portal.test');
    expect(url.searchParams.get('archived')).toBe('live');
    expect(url.searchParams.get('counts')).toBe('1');
    expect(url.searchParams.get('page')).toBe('1');
    expect(url.searchParams.has('search')).toBe(false);
    expect(url.searchParams.has('category')).toBe(false);
  });

  it('says in the header how many archived products it is holding back', async () => {
    // The screen used to list archived products silently among the live ones. Hiding them is
    // only an improvement if it admits how many — otherwise an admin counts the rows and
    // concludes the shop has lost six garments.
    stubCatalogue();
    render(<ProductsPage />);

    expect(await screen.findByText('1 of 2 products · 1 archived not shown')).toBeInTheDocument();
  });

  it('sends the category the filter displays', async () => {
    stubCatalogue();
    render(<ProductsPage />);
    await waitFor(() => expect(lastList()).toBeDefined());

    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'SAREE' } });

    await waitFor(() =>
      expect(new URL(lastList()!.url, 'http://portal.test').searchParams.get('category')).toBe(
        'SAREE'
      )
    );
  });

  it('lists the archive when asked, badges it, and restores from it', async () => {
    stubCatalogue([ARCHIVED], { live: 1, archived: 1 });
    render(<ProductsPage />);
    await screen.findByText('Retired Lehenga');

    fireEvent.change(screen.getByLabelText('Showing'), { target: { value: 'archived' } });
    await waitFor(() =>
      expect(new URL(lastList()!.url, 'http://portal.test').searchParams.get('archived')).toBe(
        'archived'
      )
    );

    // The badge is the point: with the archive on screen, this is the one fact that changes
    // how every other cell should be read.
    expect(await screen.findByText('Archived')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
    await waitFor(() => {
      const patch = calls.find(call => call.method === 'PATCH');
      expect(patch?.url).toBe('/api/products/p2');
      expect(patch?.body).toEqual({ isArchived: false });
    });
  });

  it('archives a live product with one patch, instead of deleting it', async () => {
    // Thirteen of the fifteen products are referenced by real orders, so a hard delete can
    // fail outright where archiving always works and is reversible.
    stubCatalogue();
    render(<ProductsPage />);
    await screen.findByText('Banarasi Red Silk Saree');

    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    await waitFor(() => {
      const patch = calls.find(call => call.method === 'PATCH');
      expect(patch?.url).toBe('/api/products/p1');
      expect(patch?.body).toEqual({ isArchived: true });
    });
  });

  it('honours the term the top bar hands over, on arrival and on a second search', async () => {
    // This is the behaviour that used to be an effect copying `?q=` into state. The header
    // re-pushes the same route with a new query while this component is already mounted, so a
    // screen that only read the term once would ignore every search after the first.
    handed = 'silk';
    stubCatalogue();
    const view = render(<ProductsPage />);

    await waitFor(() =>
      expect(new URL(lastList()!.url, 'http://portal.test').searchParams.get('search')).toBe('silk')
    );
    expect(screen.getByLabelText('Search products')).toHaveValue('silk');

    handed = 'lehenga';
    view.rerender(<ProductsPage />);

    await waitFor(() =>
      expect(new URL(lastList()!.url, 'http://portal.test').searchParams.get('search')).toBe(
        'lehenga'
      )
    );
    expect(screen.getByLabelText('Search products')).toHaveValue('lehenga');
  });

  it('searches on what is typed into its own box', async () => {
    stubCatalogue();
    render(<ProductsPage />);
    await waitFor(() => expect(lastList()).toBeDefined());

    fireEvent.change(screen.getByLabelText('Search products'), { target: { value: '  banarasi ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() =>
      expect(new URL(lastList()!.url, 'http://portal.test').searchParams.get('search')).toBe(
        'banarasi'
      )
    );
  });

  it('switches to the grid, keeps the row actions, and remembers the choice', async () => {
    stubCatalogue();
    render(<ProductsPage />);
    await screen.findByText('Banarasi Red Silk Saree');

    fireEvent.click(screen.getByRole('button', { name: 'Grid' }));

    // The same product, the same actions — a view, not a different screen.
    expect(await screen.findByText('Live')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Archive' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(localStorage.getItem('divyafal.admin.products.view')).toBe('grid');
  });

  it('says plainly when the catalogue could not be loaded', async () => {
    stub(() => answer({ error: 'Failed to fetch products' }, 500));
    render(<ProductsPage />);

    expect(await screen.findByText('Failed to fetch products')).toBeInTheDocument();
  });
});
