// The coupons screen, with the API stubbed.
//
// Two of its claims are worth holding down mechanically, because both are about money and both
// would be invisible when wrong. The status column must be computed rather than read off the
// stored `active` flag — a coupon switched on last year with an end date in it is still
// `active: true`, and a table that printed the flag would advertise it as live for ever. And
// the screen must never send a percentage it was told was over 100.
//
// The dates below are deliberately years either side of today, so the test does not depend on
// the clock it runs under; the day-boundary arithmetic itself is tested in
// `lib/content/coupons.test.ts`, where the instant can be stated exactly.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import CouponsPage from './page';

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
  id: 'c1',
  code: 'DIWALI20',
  kind: 'PERCENT' as const,
  value: 20,
  minSubtotal: 5000,
  endsAt: '2099-12-31',
  usedCount: 4,
  active: true,
  note: 'Diwali mailer',
};

/** Switched on by its own flag, and over: the case the status column exists for. */
const GONE = {
  id: 'c2',
  code: 'MONSOON',
  kind: 'AMOUNT' as const,
  value: 500,
  startsAt: '2020-06-01',
  endsAt: '2020-08-31',
  maxUses: 100,
  usedCount: 0,
  active: true,
  note: '',
};

function stub(coupons: unknown[]) {
  calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const call: Call = {
        url: String(url),
        method: init?.method ?? 'GET',
        body: init?.body && typeof init.body === 'string' ? JSON.parse(init.body) : undefined,
      };
      calls.push(call);
      // A PUT answers with what it was sent, which is what the real route does after
      // re-parsing: the screen adopts the server's copy rather than its own.
      if (call.method === 'PUT') return answer(call.body);
      return answer({ coupons });
    })
  );
}

/** The table row for a code, so a cell is read in its own row and not the other one's. */
function rowFor(code: string): HTMLElement {
  return screen.getByText(code).closest('tr') as HTMLElement;
}

beforeEach(() => stub([LIVE, GONE]));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('the coupons screen', () => {
  it('calls a finished coupon expired even though its stored flag says it is active', async () => {
    render(<CouponsPage />);
    await screen.findByText('MONSOON');

    expect(within(rowFor('MONSOON')).getByText('Expired')).toBeInTheDocument();
    expect(within(rowFor('DIWALI20')).getByText('Active')).toBeInTheDocument();
  });

  it('says plainly that nothing increments the use count', async () => {
    render(<CouponsPage />);

    expect(await screen.findByText('Nothing counts a use yet')).toBeInTheDocument();
    expect(
      screen.getByText(/only moves when a sale records that code/)
    ).toBeInTheDocument();
    // And the count is reported as the number it is, against its stated limit.
    expect(rowFor('DIWALI20')).toHaveTextContent('4');
    expect(rowFor('MONSOON')).toHaveTextContent('of 100');
  });

  it('describes each coupon in words rather than leaving the figures to be read', async () => {
    render(<CouponsPage />);
    await screen.findByText('DIWALI20');

    expect(rowFor('DIWALI20')).toHaveTextContent('20% off orders of ₹5,000 or more');
    expect(rowFor('MONSOON')).toHaveTextContent('₹500 off');
  });

  it('refuses a percentage above 100 and sends nothing', async () => {
    render(<CouponsPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit DIWALI20' }));
    fireEvent.change(screen.getByLabelText(/^Percentage off/), { target: { value: '150' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save coupon' }));

    expect(await screen.findByText(/cannot be higher than that/)).toBeInTheDocument();
    expect(calls.some(call => call.method === 'PUT')).toBe(false);
  });

  it('saves an edit as the whole list, with the code upper-cased', async () => {
    render(<CouponsPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit DIWALI20' }));
    fireEvent.change(screen.getByLabelText(/^Code/), { target: { value: 'diwali 25' } });
    fireEvent.change(screen.getByLabelText(/^Percentage off/), { target: { value: '25' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save coupon' }));

    await waitFor(() => expect(calls.some(call => call.method === 'PUT')).toBe(true));
    const sent = calls.find(call => call.method === 'PUT')!.body as { coupons: unknown[] };
    expect(sent.coupons).toHaveLength(2);
    expect(sent.coupons[0]).toMatchObject({
      code: 'DIWALI25',
      value: 25,
      // Untouched by the edit: a count a sale recorded is not the editor's to reset.
      usedCount: 4,
    });
    expect(sent.coupons[1]).toMatchObject({ code: 'MONSOON' });
  });

  it('adds a coupon switched off, so saving one does not publish it', async () => {
    render(<CouponsPage />);

    // The header's button and the sheet's share a name; the header's is the one that exists now.
    fireEvent.click(await screen.findByRole('button', { name: 'Add coupon' }));
    fireEvent.change(screen.getByLabelText(/^Code/), { target: { value: 'newyear' } });
    fireEvent.change(screen.getByLabelText(/^Percentage off/), { target: { value: '10' } });

    const buttons = screen.getAllByRole('button', { name: 'Add coupon' });
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() => expect(calls.some(call => call.method === 'PUT')).toBe(true));
    const sent = calls.find(call => call.method === 'PUT')!.body as { coupons: unknown[] };
    expect(sent.coupons).toHaveLength(3);
    expect(sent.coupons[2]).toMatchObject({ code: 'NEWYEAR', active: false, usedCount: 0 });
  });

  it('refuses a code that is already another coupon', async () => {
    render(<CouponsPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Add coupon' }));
    fireEvent.change(screen.getByLabelText(/^Code/), { target: { value: 'MONSOON' } });
    fireEvent.change(screen.getByLabelText(/^Percentage off/), { target: { value: '10' } });

    const buttons = screen.getAllByRole('button', { name: 'Add coupon' });
    fireEvent.click(buttons[buttons.length - 1]);

    expect(await screen.findByText(/MONSOON is already a coupon/)).toBeInTheDocument();
    expect(calls.some(call => call.method === 'PUT')).toBe(false);
  });

  it('deletes a coupon only after the deletion is confirmed', async () => {
    render(<CouponsPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit MONSOON' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(calls.some(call => call.method === 'PUT')).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete it' }));

    await waitFor(() => expect(calls.some(call => call.method === 'PUT')).toBe(true));
    const sent = calls.find(call => call.method === 'PUT')!.body as { coupons: { code: string }[] };
    expect(sent.coupons.map(coupon => coupon.code)).toEqual(['DIWALI20']);
  });
});
