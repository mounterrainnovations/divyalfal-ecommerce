import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

/**
 * The stock screen, with the database answering.
 *
 * `stock.test.ts` covers the arithmetic. This covers the three things that would be invisible
 * until a human hit them:
 *
 *  1. that a garment with no sizes recorded is shown as **stock unknown** and never as out of
 *     stock — the one claim this screen must not make, since thirteen of the fifteen products
 *     are in that state,
 *  2. that a corrected stock figure is visibly unsaved until it is saved, and
 *  3. that a size an order references refuses to be removed **in words about the shop**, not
 *     as a foreign-key error.
 */

import InventoryPage from './page';

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

const BANARASI = {
  id: 'banarasi',
  name: 'Banarasi Red Silk Saree',
  photo: null,
  category: 'SAREE',
  isArchived: false,
};
const UNCOVERED = {
  id: 'midnight',
  name: 'Midnight Silk Saree',
  photo: null,
  category: 'SAREE',
  isArchived: false,
};

const VARIANTS = [
  {
    id: 'v1',
    productId: 'banarasi',
    size: 'L',
    color: null,
    stock: 10,
    updatedAt: '2026-11-01T00:00:00.000Z',
    product: BANARASI,
  },
  {
    id: 'v2',
    productId: 'banarasi',
    size: 'XS',
    color: 'Crimson',
    stock: 1,
    updatedAt: '2026-11-01T00:00:00.000Z',
    product: BANARASI,
  },
];

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

/** Two sizes on one garment, and one garment with none. */
function stubStock(write: (call: Call) => Response = () => answer({ ok: true })) {
  stub(call =>
    call.method === 'GET'
      ? answer({ variants: VARIANTS, products: [BANARASI, UNCOVERED] })
      : write(call)
  );
}

beforeEach(() => {
  calls = [];
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('the stock screen', () => {
  it('counts the sizes it tracks and the products it cannot speak for', async () => {
    stubStock();
    render(<InventoryPage />);

    expect(
      await screen.findByText('2 sizes tracked across 1 of 2 products · 1 with no sizes set up')
    ).toBeInTheDocument();
    // Nothing is at zero, and the gap is stated rather than folded into the shortage.
    expect(
      screen.getByText('1 more have no sizes set up — stock unknown, not zero')
    ).toBeInTheDocument();
  });

  it('shows a garment with no sizes as unknown, never as out of stock', async () => {
    stubStock();
    render(<InventoryPage />);

    const row = await screen.findByRole('listitem');
    expect(within(row).getByText('Midnight Silk Saree')).toBeInTheDocument();
    expect(within(row).getByText('Stock unknown')).toBeInTheDocument();
    expect(within(row).getByText(/no sizes set up yet/)).toBeInTheDocument();
    expect(within(row).queryByText('Out of stock')).not.toBeInTheDocument();
    // And the way out of that state is on the row itself.
    expect(within(row).getByRole('button', { name: 'Add the first size' })).toBeInTheDocument();
  });

  it('marks a corrected figure unsaved until it is saved, then sends it', async () => {
    stubStock();
    render(<InventoryPage />);
    const field = await screen.findByLabelText('Units of Banarasi Red Silk Saree in size L');

    fireEvent.change(field, { target: { value: '12' } });
    expect(await screen.findByText('Unsaved')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      const patch = calls.find(call => call.method === 'PATCH');
      expect(patch?.body).toEqual({ id: 'v1', stock: 12 });
    });
  });

  it('does not mark a figure retyped unchanged as unsaved', async () => {
    stubStock();
    render(<InventoryPage />);
    const field = await screen.findByLabelText('Units of Banarasi Red Silk Saree in size L');

    fireEvent.change(field, { target: { value: '10' } });
    expect(screen.queryByText('Unsaved')).not.toBeInTheDocument();
  });

  it('explains a size that cannot be removed in words about the shop', async () => {
    // The real refusal is a foreign key on `OrderItem.productVariantId`. What the admin must
    // read is how many orders it is on and what to do instead.
    const refusal =
      'This size appears on 2 orders and cannot be removed. Set its stock to 0 instead, which takes it out of stock without rewriting what was sold.';
    stubStock(() => answer({ error: refusal, orders: 2 }, 409));
    render(<InventoryPage />);
    // Two rows, because the garment has two sizes: wait for the rows, not for its name.
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Remove' })).toHaveLength(2));

    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]);
    fireEvent.click(await screen.findByRole('button', { name: 'Remove size' }));

    expect(await screen.findByText(refusal)).toBeInTheDocument();
    // …and the sheet stays open with the refusal in it, rather than closing over a toast.
    expect(screen.getByText('Not removed')).toBeInTheDocument();
  });

  it('says plainly when the stock table is missing rather than showing an empty shop', async () => {
    stub(() => answer({ error: 'The CMS tables are not in this database yet.', setup: 'pending' }, 503));
    render(<InventoryPage />);

    expect(await screen.findByText('Not set up yet')).toBeInTheDocument();
  });
});
