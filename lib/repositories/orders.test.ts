import { describe, expect, it, vi } from 'vitest';

/**
 * The Orders module's arithmetic and its refusals.
 *
 * WHAT IS TESTED HERE AND WHY ONLY THIS. Everything below is a pure function: money, the
 * subtotal-versus-total rule the invoice prints, the stock check that decides whether a
 * walk-in sale is written at all, the request validation, and the `where` the list screen's
 * filters build. Those are the parts where being wrong is both easy and invisible — a
 * rounding slip shows a phantom "Adjustment" row on a correct invoice, a per-line stock check
 * passes an order that oversells the shelf, a dropped `OR` branch hides a guest order from the
 * only search anybody will try.
 *
 * Prisma itself is not tested: `prisma.$transaction` and `updateMany` are the database's
 * behaviour, not this module's, and a mock of them would assert that the mock was called.
 *
 * `@/lib/db` IS MOCKED ONLY TO KEEP IT FROM LOADING. `lib/repositories/orders.ts` imports the
 * Prisma singleton at module scope; this suite never reaches a query, and instantiating a real
 * client in a jsdom environment to import a rounding function would be a slow way to find out
 * nothing.
 */
vi.mock('@/lib/db', () => ({ prisma: {} }));

import {
  ADDRESS_KEYS,
  addressEntries,
  buildOrderWhere,
  demandByVariant,
  findShortfalls,
  invoiceTotals,
  lineTotal,
  money,
  normalizeOfflineOrder,
  normalizeShippingAddress,
  ORDER_STATUSES,
  ORDER_TYPES,
  OrderValidationError,
  PAYMENT_STATUSES,
  resolvePaging,
  paiseForPayment,
  rupeesFromPaise,
  subtotalOf,
  validateOrderPatch,
} from './orders';
import {
  ORDER_STATUS_OPTIONS,
  ORDER_TYPE_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  STATUS_LABEL,
  PAYMENT_LABEL,
  money as clientMoney,
  subtotalOf as clientSubtotal,
  rupeesFromPaise as clientRupeesFromPaise,
} from '@/app/dashboard/orders/shared';

describe('money', () => {
  it('rounds to paise, so a float artefact cannot become an invoice line', () => {
    // 3 * 19.99 is 59.97000000000001 in binary floating point. Left alone it makes a subtotal
    // differ from an identical total, which is what the "Adjustment" row keys off.
    expect(money(3 * 19.99)).toBe(59.97);
    expect(lineTotal({ quantity: 3, price: 19.99 })).toBe(59.97);
  });

  it('leaves whole rupees alone', () => {
    expect(money(6000)).toBe(6000);
    expect(lineTotal({ quantity: 2, price: 6000 })).toBe(12000);
  });

  it('adds the lines rather than the rounded line totals twice over', () => {
    expect(subtotalOf([
      { quantity: 3, price: 19.99 },
      { quantity: 1, price: 0.01 },
    ])).toBe(59.98);
  });

  it('is zero for no lines, which is what an order with no items should subtotal to', () => {
    expect(subtotalOf([])).toBe(0);
  });
});

describe('invoiceTotals', () => {
  const lines = [
    { quantity: 1, price: 6000 },
    { quantity: 1, price: 6000 },
  ];

  it('shows no adjustment when the lines agree with the recorded total', () => {
    expect(invoiceTotals(lines, 12000)).toEqual({
      subtotal: 12000,
      total: 12000,
      adjustment: 0,
    });
  });

  it('carries the whole difference into one adjustment when the total is lower', () => {
    // A real row could differ because of a discount, delivery, or a figure typed at checkout.
    // The schema records none of those, so the invoice must not name the difference.
    expect(invoiceTotals(lines, 11500)).toEqual({
      subtotal: 12000,
      total: 11500,
      adjustment: -500,
    });
  });

  it('carries a positive difference the same way when the total is higher', () => {
    expect(invoiceTotals(lines, 12500).adjustment).toBe(500);
  });

  it('reports the recorded total even when there are no lines at all', () => {
    expect(invoiceTotals([], 6000)).toEqual({ subtotal: 0, total: 6000, adjustment: 6000 });
  });

  it('does not invent an adjustment out of floating-point dust', () => {
    const dusty = [{ quantity: 3, price: 19.99 }];
    expect(invoiceTotals(dusty, 59.97).adjustment).toBe(0);
  });
});

describe('paiseForPayment and rupeesFromPaise', () => {
  /*
   * This is the regression test for a bug that was written, shipped into the working tree and
   * only caught by querying the database. An earlier draft had `Payment.amount` as rupees on
   * the strength of a confident brief. Every live row is exactly 100x its order's total
   * — 600000 against 6000.00, 1200000 against 12000.00 — so the column is paise.
   *
   * The numbers below are the real ones from the live table, on purpose: if anybody ever
   * "corrects" this back, these fail with the actual figures in the message.
   */
  it('writes paise, matching the rows already in Payment.amount', () => {
    expect(paiseForPayment(6000)).toBe(600000);
    expect(paiseForPayment(12000)).toBe(1200000);
  });

  it('reads the live rows back as the rupee totals of their orders', () => {
    expect(rupeesFromPaise(600000)).toBe(6000);
    expect(rupeesFromPaise(1200000)).toBe(12000);
  });

  it('round-trips without drift, which a rupee column could not do', () => {
    for (const amount of [1234.5, 0.01, 99999.99, 6000, 0]) {
      expect(rupeesFromPaise(paiseForPayment(amount))).toBe(amount);
    }
  });

  it('rounds to a whole paisa, because the column is an Int', () => {
    expect(paiseForPayment(1234.567)).toBe(123457);
    expect(paiseForPayment(1234.564)).toBe(123456);
  });
});

describe('demandByVariant and findShortfalls', () => {
  it('sums two lines of the same size before comparing them with stock', () => {
    // The form allows the same product and size twice (two of the same blouse, different
    // measurements). Checked line by line, five and five against a stock of eight both pass.
    const lines = [
      { productVariantId: 'v1', quantity: 5 },
      { productVariantId: 'v1', quantity: 5 },
    ];
    expect(demandByVariant(lines)).toEqual({ v1: 10 });
    expect(
      findShortfalls(demandByVariant(lines), { v1: { label: 'Saree · M', stock: 8 } })
    ).toEqual([{ productVariantId: 'v1', label: 'Saree · M', want: 10, have: 8 }]);
  });

  it('passes an order that exactly empties the shelf', () => {
    expect(findShortfalls({ v1: 8 }, { v1: { label: 'Saree · M', stock: 8 } })).toEqual([]);
  });

  it('names every short line, not only the first', () => {
    const shortfalls = findShortfalls(
      { v1: 3, v2: 4 },
      { v1: { label: 'Saree · M', stock: 1 }, v2: { label: 'Lehenga · S', stock: 0 } }
    );
    expect(shortfalls.map(short => short.label).sort()).toEqual(['Lehenga · S', 'Saree · M']);
  });

  it('treats a variant it was given no stock for as empty', () => {
    // Belt and braces: the caller checks existence first, so this is the path where a variant
    // disappeared between the two reads. Silently treating it as unlimited would oversell.
    expect(findShortfalls({ gone: 1 }, {})).toEqual([
      { productVariantId: 'gone', label: 'gone', want: 1, have: 0 },
    ]);
  });
});

describe('buildOrderWhere', () => {
  it('is empty with no filters, so the list is the whole table', () => {
    expect(buildOrderWhere({})).toEqual({});
  });

  it('passes each enum filter through as an equality', () => {
    expect(buildOrderWhere({ status: 'SHIPPED', paymentStatus: 'PAID', type: 'RFQ' })).toEqual({
      status: 'SHIPPED',
      paymentStatus: 'PAID',
      type: 'RFQ',
    });
  });

  it('searches the id and both kinds of customer name', () => {
    const where = buildOrderWhere({ search: 'Asha' });
    const branches = JSON.stringify(where.OR);

    // The order belongs either to a Profile or to the guest columns, and whoever is searching
    // does not know which. Losing a branch here hides an order completely.
    expect(branches).toContain('guestName');
    expect(branches).toContain('guestEmail');
    expect(branches).toContain('Profile');
    expect(where.OR?.[0]).toEqual({ id: { contains: 'Asha' } });
  });

  it('matches the id by prefix, because the screens show a shortened reference', () => {
    const where = buildOrderWhere({ search: '3F2A1B0C' });
    expect(where.OR?.[0]).toEqual({ id: { contains: '3F2A1B0C' } });
  });

  it('ignores whitespace-only search, rather than filtering on an empty string', () => {
    expect(buildOrderWhere({ search: '   ' })).toEqual({});
  });
});

describe('resolvePaging', () => {
  it('defaults to page one of twenty', () => {
    expect(resolvePaging({})).toEqual({ page: 1, perPage: 20, skip: 0, take: 20 });
  });

  it('clamps a page number nobody should be able to reach', () => {
    expect(resolvePaging({ page: 0 }).page).toBe(1);
    expect(resolvePaging({ page: -5 }).page).toBe(1);
    expect(resolvePaging({ page: Number.NaN }).page).toBe(1);
  });

  it('caps perPage so a bookmarked URL cannot ask for the whole table', () => {
    expect(resolvePaging({ perPage: 100000 }).perPage).toBe(100);
    expect(resolvePaging({ perPage: 0 }).perPage).toBe(20);
  });

  it('skips whole pages', () => {
    expect(resolvePaging({ page: 3, perPage: 10 })).toEqual({
      page: 3,
      perPage: 10,
      skip: 20,
      take: 10,
    });
  });
});

describe('addressEntries', () => {
  it('reads the seven keys the live rows use, in reading order', () => {
    const entries = addressEntries({
      postalCode: '462001',
      fullName: 'Asha Verma',
      city: 'Bhopal',
    });
    expect(entries.map(entry => entry.key)).toEqual(['fullName', 'city', 'postalCode']);
    expect(entries[0]).toEqual({
      key: 'fullName',
      label: 'Name',
      value: 'Asha Verma',
      known: true,
    });
  });

  it('keeps a key it has never heard of, and marks it', () => {
    // Hiding it would keep data from the only person able to act on it.
    const entries = addressEntries({ city: 'Bhopal', landmark: 'Near the temple' });
    expect(entries.map(entry => entry.key)).toEqual(['city', 'landmark']);
    expect(entries[1].known).toBe(false);
  });

  it('survives nulls, numbers and a missing column', () => {
    expect(addressEntries({ city: null, postalCode: 462001 })).toEqual([
      { key: 'postalCode', label: 'Postal code', value: '462001', known: true },
    ]);
    expect(addressEntries(null)).toEqual([]);
    expect(addressEntries('Bhopal')).toEqual([]);
    expect(addressEntries(['Bhopal'])).toEqual([]);
  });

  it('omits an empty value rather than printing a blank row', () => {
    expect(addressEntries({ city: '   ', state: 'MP' }).map(entry => entry.key)).toEqual(['state']);
  });
});

describe('normalizeShippingAddress', () => {
  it('keeps only the seven known keys, trimmed', () => {
    const address = normalizeShippingAddress({
      fullName: '  Asha Verma ',
      city: 'Bhopal',
      nonsense: 'dropped',
    });
    expect(address).toEqual({ fullName: 'Asha Verma', city: 'Bhopal' });
  });

  it('covers every key the live rows use', () => {
    const filled = Object.fromEntries(ADDRESS_KEYS.map(key => [key, `${key} value`]));
    expect(Object.keys(normalizeShippingAddress(filled) ?? {})).toEqual([...ADDRESS_KEYS]);
  });

  it('is null when nothing was filled in, which is true of a carry-out sale', () => {
    expect(normalizeShippingAddress({ city: '  ', state: '' })).toBeNull();
    expect(normalizeShippingAddress(undefined)).toBeNull();
  });
});

describe('validateOrderPatch', () => {
  it('accepts the four fields the portal may change', () => {
    expect(
      validateOrderPatch({
        status: 'shipped',
        paymentStatus: 'paid',
        trackingId: ' AWB123 ',
        trackingUrl: 'https://courier.example/AWB123',
      })
    ).toEqual({
      status: 'SHIPPED',
      paymentStatus: 'PAID',
      trackingId: 'AWB123',
      trackingUrl: 'https://courier.example/AWB123',
    });
  });

  it('clears a tracking field given an empty string', () => {
    expect(validateOrderPatch({ trackingId: '' })).toEqual({ trackingId: null });
  });

  it('refuses a status outside the enum', () => {
    expect(() => validateOrderPatch({ status: 'POSTED' })).toThrow(OrderValidationError);
  });

  it('refuses a tracking link that is not http', () => {
    // It becomes an href on the detail screen, so `javascript:` is the one worth refusing.
    expect(() => validateOrderPatch({ trackingUrl: 'javascript:alert(1)' })).toThrow(
      /must start with http/
    );
  });

  it('refuses a patch that would change nothing', () => {
    expect(() => validateOrderPatch({})).toThrow(/Nothing to change/);
    expect(() => validateOrderPatch(null)).toThrow(OrderValidationError);
  });
});

describe('normalizeOfflineOrder', () => {
  const line = { productId: 'p1', productVariantId: 'v1', quantity: 2, price: 3000 };

  it('accepts a counter sale with one line and nothing else', () => {
    const order = normalizeOfflineOrder({ customerName: ' Asha ', items: [line] });
    expect(order.customerName).toBe('Asha');
    expect(order.customerPhone).toBeNull();
    expect(order.customerEmail).toBeNull();
    expect(order.address).toBeNull();
    // A walk-in may give no phone and no email; an order that cannot be recorded without one
    // is an order that gets recorded on paper instead.
    expect(order.items).toEqual([{ ...line, customMeasurements: null }]);
    expect(order.status).toBe('PENDING');
    expect(order.paymentStatus).toBe('PENDING');
  });

  it('needs a customer name', () => {
    expect(() => normalizeOfflineOrder({ customerName: '  ', items: [line] })).toThrow(
      /name is needed/
    );
  });

  it('needs at least one line', () => {
    expect(() => normalizeOfflineOrder({ customerName: 'Asha', items: [] })).toThrow(
      /at least one line/
    );
  });

  it('refuses a line with no size, and says why rather than filling one in', () => {
    // `OrderItem.productVariantId` is a required FK: there is no default to fall back on.
    let thrown: unknown;
    try {
      normalizeOfflineOrder({
        customerName: 'Asha',
        items: [{ ...line, productVariantId: '' }],
      });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(OrderValidationError);
    expect((thrown as OrderValidationError).field).toBe('items.0.productVariantId');
    expect((thrown as Error).message).toMatch(/must name a size that exists/);
  });

  it('refuses a fractional or absent quantity', () => {
    expect(() =>
      normalizeOfflineOrder({ customerName: 'Asha', items: [{ ...line, quantity: 1.5 }] })
    ).toThrow(/whole quantity/);
    expect(() =>
      normalizeOfflineOrder({ customerName: 'Asha', items: [{ ...line, quantity: 0 }] })
    ).toThrow(/whole quantity/);
  });

  it('refuses a negative price but allows zero, which is a genuine give-away', () => {
    expect(() =>
      normalizeOfflineOrder({ customerName: 'Asha', items: [{ ...line, price: -1 }] })
    ).toThrow(/price of 0 or more/);
    expect(
      normalizeOfflineOrder({ customerName: 'Asha', items: [{ ...line, price: 0 }] }).items[0].price
    ).toBe(0);
  });

  it('rounds a typed price to paise', () => {
    expect(
      normalizeOfflineOrder({ customerName: 'Asha', items: [{ ...line, price: 19.999 }] }).items[0]
        .price
    ).toBe(20);
  });

  it('keeps only the known address keys and drops an empty measurements object', () => {
    const order = normalizeOfflineOrder({
      customerName: 'Asha',
      address: { city: 'Bhopal', nonsense: 'dropped' },
      items: [{ ...line, customMeasurements: {} }],
    });
    expect(order.address).toEqual({ city: 'Bhopal' });
    expect(order.items[0].customMeasurements).toBeNull();
  });

  it('names the line a mistake is on, counting from one for a human', () => {
    let thrown: unknown;
    try {
      normalizeOfflineOrder({
        customerName: 'Asha',
        items: [line, { ...line, quantity: 0 }],
      });
    } catch (error) {
      thrown = error;
    }
    expect((thrown as Error).message).toMatch(/^Line 2/);
    expect((thrown as OrderValidationError).field).toBe('items.1.quantity');
  });

  it('refuses a status or payment state outside the enums', () => {
    expect(() =>
      normalizeOfflineOrder({ customerName: 'Asha', items: [line], status: 'POSTED' })
    ).toThrow(/status must be one of/);
    expect(() =>
      normalizeOfflineOrder({ customerName: 'Asha', items: [line], paymentStatus: 'PART_PAID' })
    ).toThrow(/paymentStatus must be one of/);
  });
});

/**
 * The browser's copy of the vocabulary, checked against the server's.
 *
 * `app/dashboard/orders/shared.ts` repeats the enum lists and the money arithmetic because it
 * runs in the browser and the repository imports Prisma. That duplication is only safe while
 * something asserts the two agree, which is what this block is for: a member added to the
 * schema and to the repository but forgotten in the UI would otherwise show as a filter
 * silently missing an option.
 */
describe('the client-side copies in app/dashboard/orders/shared.ts', () => {
  it('offers every status, payment state and type the repository knows', () => {
    expect([...ORDER_STATUS_OPTIONS]).toEqual([...ORDER_STATUSES]);
    expect([...PAYMENT_STATUS_OPTIONS]).toEqual([...PAYMENT_STATUSES]);
    expect([...ORDER_TYPE_OPTIONS]).toEqual([...ORDER_TYPES]);
  });

  it('has words for every member, so no pill can render as undefined', () => {
    for (const status of ORDER_STATUSES) expect(STATUS_LABEL[status]).toBeTruthy();
    for (const state of PAYMENT_STATUSES) expect(PAYMENT_LABEL[state]).toBeTruthy();
  });

  it('computes the same money as the server', () => {
    const lines = [
      { quantity: 3, price: 19.99 },
      { quantity: 1, price: 6000 },
      { quantity: 2, price: 0.015 },
    ];
    expect(clientMoney(3 * 19.99)).toBe(money(3 * 19.99));
    expect(clientSubtotal(lines)).toBe(subtotalOf(lines));
  });

  it('crosses the paise boundary the same way the server does', () => {
    // The detail screen prints `Payment.amount` using the browser's copy. If these two ever
    // disagree, one of the two places that shows a customer their payment is out by 100x.
    for (const paise of [600000, 1200000, 123450, 1, 0]) {
      expect(clientRupeesFromPaise(paise)).toBe(rupeesFromPaise(paise));
    }
  });
});
