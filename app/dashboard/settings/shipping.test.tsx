// The shipping fields on the Settings screen, which are the first money this portal stores.
//
// They are strings in a JSON column, so nothing downstream can keep a delivery charge sane:
// whatever this screen lets through is what the shop's rate becomes. The three cases below are
// therefore the ones that would cost real money if they were wrong — a figure that is not a
// number, a free-shipping threshold with nothing charged under it, and an unset key being
// shown as though it held a rate.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import SettingsPage from './page';

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

/** Every request answered from one stub, with the settings the shop has actually stored. */
function stub(settings: Record<string, unknown>) {
  calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({
        url: String(url),
        method: init?.method ?? 'GET',
        body: init?.body && typeof init.body === 'string' ? JSON.parse(init.body) : undefined,
      });
      return answer({ settings, editableKeys: [] });
    })
  );
}

/** What the shop has today: contact details, and not one shipping row. */
const STORED = {
  whatsapp: '919977057045',
  'contact.email': 'divyafalthecreations@gmail.com',
};

beforeEach(() => stub(STORED));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('the shipping fields', () => {
  it('offers every rate blank, because an unset key is not a rate of zero', async () => {
    render(<SettingsPage />);

    expect(await screen.findByLabelText('Free delivery above')).toHaveValue('');
    expect(screen.getByLabelText('Standard delivery')).toHaveValue('');
    expect(screen.getByLabelText('Express delivery')).toHaveValue('');
    expect(screen.getByLabelText('What the customer is told')).toHaveValue('');
  });

  it('refuses a figure that is not a plain number, and saves nothing', async () => {
    render(<SettingsPage />);

    const standard = await screen.findByLabelText('Standard delivery');
    fireEvent.change(standard, { target: { value: '₹99 approx' } });
    fireEvent.click(screen.getByRole('button', { name: /^Save 1 change$/ }));

    expect(await screen.findByText(/A rupee figure in digits/)).toBeInTheDocument();
    expect(calls.some(call => call.method === 'PUT')).toBe(false);
  });

  it('refuses a free-shipping threshold with no standard charge under it', async () => {
    render(<SettingsPage />);

    const freeOver = await screen.findByLabelText('Free delivery above');
    fireEvent.change(freeOver, { target: { value: '5000' } });
    fireEvent.click(screen.getByRole('button', { name: /^Save 1 change$/ }));

    expect(
      await screen.findByText(/an order below the threshold has no delivery price at all/)
    ).toBeInTheDocument();
    expect(calls.some(call => call.method === 'PUT')).toBe(false);
  });

  it('sends the rates as typed, and only the ones that changed', async () => {
    render(<SettingsPage />);

    fireEvent.change(await screen.findByLabelText('Free delivery above'), {
      target: { value: '5000' },
    });
    fireEvent.change(screen.getByLabelText('Standard delivery'), { target: { value: '149.50' } });
    fireEvent.change(screen.getByLabelText('What the customer is told'), {
      target: { value: 'Delivered in 5 to 7 working days across India.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Save 3 changes$/ }));

    await waitFor(() => expect(calls.some(call => call.method === 'PUT')).toBe(true));
    // Express is untouched, so it is not in the patch: an empty string saved over an absent
    // key would turn "the shop has not said" into "the shop has said nothing", which is a row.
    expect(calls.find(call => call.method === 'PUT')!.body).toEqual({
      'shipping.freeOver': '5000',
      'shipping.standardRate': '149.50',
      'shipping.note': 'Delivered in 5 to 7 working days across India.',
    });
  });
});
