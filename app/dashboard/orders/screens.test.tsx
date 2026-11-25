import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

/**
 * The two Orders screens that talk to the API, with the database answering.
 *
 * WHAT THIS IS FOR. `lib/repositories/orders.test.ts` covers the arithmetic and the refusals;
 * this covers the three things about these screens that would be invisible until a human hit
 * them: that the list sends the filters it displays (a filter that looks applied and is not is
 * worse than no filter), that the offline form explains the products it cannot sell instead of
 * quietly showing a short list, and that it sends `address: null` for a carry-out rather than
 * storing a delivery address for a sale nobody is delivering.
 *
 * `next/navigation` is stubbed because these are route components: `useRouter` and `useParams`
 * come from a router that does not exist in jsdom.
 */

const pushed: string[] = [];

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: (href: string) => pushed.push(href) }),
  useParams: () => ({ id: 'order-1' }),
  useSearchParams: () => new URLSearchParams(),
}));

import OrdersPage from './page';
import NewOrderPage from './new/page';
import OrderDetailPage from './[id]/page';

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

/** Route by the start of the URL; the first match wins, so put the specific ones first. */
function stub(routes: [string, (call: Call) => Response][]) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const call: Call = {
        url: String(url),
        method: init?.method ?? 'GET',
        body: init?.body && typeof init.body === 'string' ? JSON.parse(init.body) : undefined,
      };
      calls.push(call);
      for (const [prefix, reply] of routes) {
        if (call.url.startsWith(prefix)) return reply(call);
      }
      return answer({ error: `unexpected ${call.method} ${call.url}` }, 404);
    })
  );
}

const NOT_SET_UP = () =>
  answer({ error: 'The orders tables are not in this database yet.', setup: 'pending' }, 503);

/** Shaped like the live rows: one guest order, paid, and one RFQ awaiting a quote. */
const ORDERS = [
  {
    id: '3f2a1b0c-1111-2222-3333-444455556666',
    createdAt: '2026-05-10T09:00:00.000Z',
    customerName: 'Asha Verma',
    isGuest: true,
    status: 'SHIPPED',
    paymentStatus: 'PAID',
    type: 'STANDARD',
    totalAmount: 12000,
    itemCount: 2,
    lineCount: 1,
  },
  {
    id: '9c8b7a65-1111-2222-3333-444455556666',
    createdAt: '2026-05-10T08:00:00.000Z',
    customerName: null,
    isGuest: false,
    status: 'QUOTE_REQUESTED',
    paymentStatus: 'PENDING',
    type: 'RFQ',
    totalAmount: 6000,
    itemCount: 1,
    lineCount: 1,
  },
];

const LIST = {
  orders: ORDERS,
  total: 2,
  page: 1,
  perPage: 20,
  totalPages: 1,
};

const CATALOGUE = {
  products: [
    {
      id: 'p1',
      name: 'Chanderi saree',
      photo: null,
      price: 6000,
      variants: [{ id: 'v1', size: 'M', color: null, stock: 3 }],
    },
  ],
  withoutVariants: [{ id: 'p2', name: 'Banarasi lehenga' }],
};

beforeEach(() => {
  calls = [];
  pushed.length = 0;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('the orders list', () => {
  it('shows the reference, the customer and both states, and says when a name is missing', async () => {
    stub([['/api/admin/orders', () => answer(LIST)]]);
    render(<OrdersPage />);

    // Read per row rather than per word: the filter selects above the table offer the same
    // words as options, so a bare `getByText('Shipped')` matches two different things.
    const shipped = (await screen.findByText('3F2A1B0C')).closest('tr');
    expect(shipped).toHaveTextContent('Asha Verma');
    expect(shipped).toHaveTextContent('Shipped');
    expect(shipped).toHaveTextContent('Paid');
    expect(shipped).toHaveTextContent('₹12,000');
    // The channel is read from `type` and `isGuest` together, not from either alone.
    expect(shipped).toHaveTextContent('Counter or guest');

    const quote = screen.getByText('9C8B7A65').closest('tr');
    expect(quote).toHaveTextContent('Quote requested');
    // An order with no customer name says so rather than showing a placeholder name.
    expect(quote).toHaveTextContent('Not recorded');
    expect(quote).toHaveTextContent('Quote request');
  });

  it('sends every filter it displays, and resets to page one when one changes', async () => {
    stub([['/api/admin/orders', () => answer(LIST)]]);
    render(<OrdersPage />);
    await screen.findByText('3F2A1B0C');

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'SHIPPED' } });
    fireEvent.change(screen.getByLabelText('Payment'), { target: { value: 'PAID' } });
    fireEvent.change(screen.getByLabelText('Channel'), { target: { value: 'RFQ' } });
    fireEvent.change(screen.getByLabelText('Search orders'), { target: { value: 'Asha' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      const last = calls[calls.length - 1].url;
      expect(last).toContain('status=SHIPPED');
      expect(last).toContain('paymentStatus=PAID');
      expect(last).toContain('type=RFQ');
      expect(last).toContain('search=Asha');
      expect(last).toContain('page=1');
    });
  });

  it('says plainly when the tables are missing', async () => {
    stub([['/api/admin/orders', NOT_SET_UP]]);
    render(<OrdersPage />);
    expect(await screen.findByText('Not set up yet')).toBeInTheDocument();
  });
});

describe('the offline order form', () => {
  it('names the products it cannot sell, and why, rather than showing a short list', async () => {
    stub([['/api/admin/orders/products', () => answer(CATALOGUE)]]);
    render(<NewOrderPage />);

    expect(await screen.findByText('Some products cannot be sold from here')).toBeInTheDocument();
    // The product is named, so nothing is silently skipped.
    expect(screen.getByText(/Banarasi lehenga/)).toBeInTheDocument();
    expect(screen.getByText(/every line must name a size that exists/)).toBeInTheDocument();
  });

  it('will not submit a line without a size, because the column is required', async () => {
    stub([['/api/admin/orders/products', () => answer(CATALOGUE)]]);
    render(<NewOrderPage />);
    await screen.findByLabelText(/^Product/);

    const record = screen.getByRole('button', { name: 'Record the order' });
    expect(record).toBeDisabled();

    // Choosing the product pre-fills the price and, with one size on it, the size as well.
    fireEvent.change(screen.getByLabelText(/^Product/), { target: { value: 'p1' } });
    await waitFor(() => expect(screen.getByLabelText(/^Unit price/)).toHaveValue(6000));
    expect(screen.getByLabelText(/^Size/)).toHaveValue('v1');
    expect(screen.getByRole('button', { name: 'Record the order' })).toBeEnabled();

    // Clearing the size disables it again rather than sending a line the server must refuse.
    fireEvent.change(screen.getByLabelText(/^Size/), { target: { value: '' } });
    expect(screen.getByRole('button', { name: 'Record the order' })).toBeDisabled();
  });

  it('refuses a quantity above the stock in hand before it is sent', async () => {
    stub([['/api/admin/orders/products', () => answer(CATALOGUE)]]);
    render(<NewOrderPage />);
    await screen.findByLabelText(/^Product/);

    fireEvent.change(screen.getByLabelText(/^Product/), { target: { value: 'p1' } });
    fireEvent.change(screen.getByLabelText(/^Qty/), { target: { value: '4' } });

    expect(await screen.findByText('Only 3 in stock')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Record the order' })).toBeDisabled();
  });

  it('sends no address for a carry-out sale, and goes to the order it just created', async () => {
    stub([
      ['/api/admin/orders/products', () => answer(CATALOGUE)],
      ['/api/admin/orders', () => answer({ id: 'new-order-1' }, 201)],
    ]);
    render(<NewOrderPage />);
    await screen.findByLabelText(/^Product/);

    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'Asha Verma' } });
    fireEvent.change(screen.getByLabelText(/^Product/), { target: { value: 'p1' } });
    fireEvent.change(screen.getByLabelText(/^Qty/), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Record the order' }));

    await waitFor(() => expect(pushed).toEqual(['/dashboard/orders/new-order-1']));

    const post = calls.find(call => call.method === 'POST');
    expect(post?.body).toMatchObject({
      customerName: 'Asha Verma',
      // Null, not a half-filled address: nothing is being delivered.
      address: null,
      items: [{ productId: 'p1', productVariantId: 'v1', quantity: 2, price: 6000 }],
    });
  });

  it('sends the delivery address, with the customer in it, when one was filled in', async () => {
    stub([
      ['/api/admin/orders/products', () => answer(CATALOGUE)],
      ['/api/admin/orders', () => answer({ id: 'new-order-2' }, 201)],
    ]);
    render(<NewOrderPage />);
    await screen.findByLabelText(/^Product/);

    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'Asha Verma' } });
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '9000000000' } });
    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Bhopal' } });
    fireEvent.change(screen.getByLabelText(/^Product/), { target: { value: 'p1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Record the order' }));

    await waitFor(() => expect(pushed).toEqual(['/dashboard/orders/new-order-2']));

    const post = calls.find(call => call.method === 'POST');
    expect(post?.body).toMatchObject({
      address: { city: 'Bhopal', fullName: 'Asha Verma', phone: '9000000000' },
    });
  });

  it('shows every short line when the server refuses the order for stock', async () => {
    stub([
      ['/api/admin/orders/products', () => answer(CATALOGUE)],
      [
        '/api/admin/orders',
        () =>
          answer(
            {
              error: 'Not enough stock for 1 line(s)',
              shortfalls: [
                { productVariantId: 'v1', label: 'Chanderi saree · M', want: 3, have: 1 },
              ],
            },
            409
          ),
      ],
    ]);
    render(<NewOrderPage />);
    await screen.findByLabelText(/^Product/);

    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'Asha Verma' } });
    fireEvent.change(screen.getByLabelText(/^Product/), { target: { value: 'p1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Record the order' }));

    // The whole order was refused, and the screen says so rather than reporting a failure.
    expect(await screen.findByText('Not enough stock, so nothing was saved')).toBeInTheDocument();
    expect(screen.getByText(/Chanderi saree · M — wanted 3, in stock 1/)).toBeInTheDocument();
    expect(pushed).toEqual([]);
  });
});

/** A detail payload with a deliberate gap between the lines and the recorded total. */
const DETAIL = {
  id: 'order-1',
  createdAt: '2026-05-10T09:00:00.000Z',
  updatedAt: '2026-05-10T09:30:00.000Z',
  status: 'PENDING',
  paymentStatus: 'PAID',
  type: 'STANDARD',
  totalAmount: 11500,
  isGuest: true,
  customer: { name: 'Asha Verma', email: null, phone: '9000000000', source: 'guest' },
  shippingAddress: [
    { key: 'city', label: 'City', value: 'Bhopal', known: true },
    { key: 'landmark', label: 'landmark', value: 'Near the temple', known: false },
  ],
  shippingAddressRecorded: true,
  items: [
    {
      id: 'i1',
      productId: 'p1',
      productName: 'Chanderi saree',
      photo: null,
      productVariantId: 'v1',
      size: 'M',
      color: null,
      quantity: 2,
      price: 6000,
      lineTotal: 12000,
      customMeasurements: { blouseSize: '38', sleeveLength: '18 in' },
    },
  ],
  payments: [
    {
      id: 'pay-1',
      provider: 'offline',
      providerOrderId: 'offline-order-1',
      providerPaymentId: null,
      // PAISE. `Payment.amount` is an Int holding paise — every row in the live table is
      // exactly 100x its order's total — so the ₹11,500 this payment represents is 1150000
      // here. The screen divides by 100 to print it.
      amount: 1150000,
      currency: 'INR',
      status: 'captured',
      createdAt: '2026-05-10T09:30:00.000Z',
    },
  ],
  totals: { subtotal: 12000, total: 11500, adjustment: -500 },
  razorpayOrderId: null,
  razorpayPaymentId: null,
  trackingId: null,
  trackingUrl: null,
};

describe('the order detail screen', () => {
  it('shows the lines, the measurements and an address key it has never seen', async () => {
    stub([['/api/admin/orders/order-1', () => answer(DETAIL)]]);
    render(<OrderDetailPage />);

    expect(await screen.findByText('Chanderi saree')).toBeInTheDocument();
    expect(screen.getByText('Size M')).toBeInTheDocument();
    // The free JSON column is printed as a labelled list, with its keys tidied, not as markup.
    expect(screen.getByText('Blouse size')).toBeInTheDocument();
    expect(screen.getByText('18 in')).toBeInTheDocument();
    // An unknown address key is shown and marked rather than dropped.
    expect(screen.getByText('Near the temple')).toBeInTheDocument();
    expect(screen.getByText(/recorded as “landmark”/)).toBeInTheDocument();
    // `Payment.amount` is an Int holding RUPEES, so the row reads ₹11,500 — not ₹115. Scoped
    // to the payment itself, since the order total is the same figure.
    const payment = screen.getByText('offline-order-1').closest('li');
    expect(payment).toHaveTextContent('₹11,500');
    expect(payment).toHaveTextContent('offline');
  });

  it('says what the adjustment is instead of calling it a discount', async () => {
    stub([['/api/admin/orders/order-1', () => answer(DETAIL)]]);
    render(<OrderDetailPage />);

    expect(await screen.findByText('Adjustment')).toBeInTheDocument();
    expect(
      screen.getByText(/database stores only the total, not what the difference was for/)
    ).toBeInTheDocument();
    // And no invented line of any kind.
    expect(screen.queryByText('Discount')).not.toBeInTheDocument();
    expect(screen.queryByText('Shipping')).not.toBeInTheDocument();
  });

  it('saves only after a change, and sends the four fields the portal may set', async () => {
    stub([
      [
        '/api/admin/orders/order-1',
        call =>
          call.method === 'PATCH'
            ? answer({ ...DETAIL, status: 'SHIPPED', trackingId: 'AWB123' })
            : answer(DETAIL),
      ],
    ]);
    render(<OrderDetailPage />);
    await screen.findByText('Chanderi saree');

    // Nothing has changed, so there is nothing to save.
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Order status'), { target: { value: 'SHIPPED' } });
    fireEvent.change(screen.getByLabelText('Tracking number'), { target: { value: 'AWB123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      const patch = calls.find(call => call.method === 'PATCH');
      expect(patch?.body).toEqual({
        status: 'SHIPPED',
        paymentStatus: 'PAID',
        trackingId: 'AWB123',
        trackingUrl: '',
      });
    });

    // The screen then shows the server's answer, not the draft it sent.
    expect(await screen.findByText('Order ORDER-1 was updated.')).toBeInTheDocument();
  });

  it('refuses a tracking link that is not http before sending anything', async () => {
    stub([['/api/admin/orders/order-1', () => answer(DETAIL)]]);
    render(<OrderDetailPage />);
    await screen.findByText('Chanderi saree');

    fireEvent.change(screen.getByLabelText('Tracking link'), {
      target: { value: 'javascript:alert(1)' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(
      await screen.findByText('The tracking link must start with http:// or https://')
    ).toBeInTheDocument();
    expect(calls.some(call => call.method === 'PATCH')).toBe(false);
  });

  it('says plainly when there is no such order', async () => {
    stub([['/api/admin/orders/order-1', () => answer({ error: 'Order not found' }, 404)]]);
    render(<OrderDetailPage />);
    expect(await screen.findByText('Nothing here')).toBeInTheDocument();
  });
});
