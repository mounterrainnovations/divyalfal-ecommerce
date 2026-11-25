import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReportsPage from './page';
import { plottableReport, sampleReport } from './report-fixture';

/**
 * The screen, with the endpoint answering the figures the live database actually returns.
 *
 * What is checked here is only the thing that would be expensive to get wrong and invisible
 * until someone acted on it: that eight orders from one day produce a stated refusal to plot
 * rather than a chart, that thirteen products with no sizes are reported as unknown rather than
 * as zero, that an empty enquiries table reads as "nothing has come in" rather than as a 0 that
 * looks like a failure, and that the chart does appear once the figures can carry it. The
 * layout is not tested; the sentences are, because the sentences are the product.
 */

let urls: string[] = [];

function answer(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function stub(reply: (url: string) => Response) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      urls.push(String(url));
      return reply(String(url));
    })
  );
}

beforeEach(() => {
  urls = [];
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('the reports screen, on the figures this shop actually has', () => {
  it('refuses to plot eight orders from one day, and says why in so many words', async () => {
    stub(() => answer(sampleReport()));
    render(<ReportsPage />);

    expect(
      await screen.findByText(/All 8 orders in this window fall in 1 of its 12 months/)
    ).toBeInTheDocument();

    // No chart: `TrendChart` always publishes this line beneath itself, so its absence is the
    // check that nothing was drawn.
    expect(screen.queryByText('Hover a week for its figure')).not.toBeInTheDocument();

    // The figures are still there, as figures.
    const may = screen.getByRole('rowheader', { name: 'May 2026' });
    expect(may.closest('tr')).toHaveTextContent('8');
    expect(screen.getByRole('columnheader', { name: 'Orders placed' })).toBeInTheDocument();
  });

  it('draws the chart once the orders are spread widely enough to carry one', async () => {
    stub(() => answer(plottableReport()));
    render(<ReportsPage />);

    await screen.findByText('Orders over time');
    expect(screen.queryByText(/is too few for the shape of a line/)).not.toBeInTheDocument();
    expect(screen.queryByText(/would describe one month/)).not.toBeInTheDocument();
    // The monthly series is drawn as a bar per month, which publishes its figures as a table.
    expect(screen.getByRole('table', { name: /Orders placed per month/ })).toBeInTheDocument();
  });

  it('states the revenue basis on the figure rather than beside it', async () => {
    stub(() => answer(sampleReport()));
    render(<ReportsPage />);

    // Found by the caveat rather than by the label, because "Revenue" is also a column head in
    // the products table — and the caveat is the half of this tile that must not go missing.
    const note = await screen.findByText('2 cancelled or returned (₹18,000) left out');
    const tile = note.closest('div');
    expect(tile).toHaveTextContent('Revenue');
    expect(tile).toHaveTextContent('₹48,000');
  });

  it('reports unknown stock as unknown, not as zero', async () => {
    stub(() => answer(sampleReport()));
    render(<ReportsPage />);

    expect(await screen.findByText('Stock is unknown for 13 of 15 products')).toBeInTheDocument();
    expect(screen.getByText(/a gap in the data and not a count of zero/)).toBeInTheDocument();

    // And the 999-unit "Custom" size is reported as made to order rather than added in.
    expect(screen.getByText(/999 units on Midnight Silk Saree \(Custom\)/)).toBeInTheDocument();
    expect(screen.getByText(/None of the recorded sizes has run out\./)).toBeInTheDocument();
  });

  it('says nothing has come in rather than showing a zero that looks like a failure', async () => {
    stub(() => answer(sampleReport()));
    render(<ReportsPage />);

    expect(
      await screen.findByText(/Nothing has come in through the contact or academy forms/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/The table is there and reading correctly; it is empty/)
    ).toBeInTheDocument();
  });

  it('shows the gateway and the orders table side by side without reconciling them', async () => {
    stub(() => answer(sampleReport()));
    render(<ReportsPage />);

    await screen.findByText('Payments recorded by the gateway');
    expect(screen.getByRole('rowheader', { name: 'captured' }).closest('tr')).toHaveTextContent(
      '₹6,000'
    );
    expect(screen.getByText(/need not agree/)).toBeInTheDocument();
    expect(screen.getByText(/The gateway stores paise/)).toBeInTheDocument();
  });

  it('says how much of the catalogue has never sold, instead of ranking the rest at zero', async () => {
    stub(() => answer(sampleReport()));
    render(<ReportsPage />);

    await screen.findByText('Top products');
    expect(screen.getByText(/1 of 15 products/)).toBeInTheDocument();
    expect(screen.getByText(/The other 14 are not ranked/)).toBeInTheDocument();
  });

  it('asks the endpoint for the window the reader picked', async () => {
    stub(() => answer(sampleReport()));
    render(<ReportsPage />);

    await screen.findByText('Top products');
    expect(urls[0]).toBe('/api/admin/reports?range=12m');

    await userEvent.selectOptions(screen.getByLabelText('Report window'), '90d');
    await waitFor(() => expect(urls).toContain('/api/admin/reports?range=90d'));
  });

  it('tells the reader the tables are missing rather than showing an empty report', async () => {
    stub(() => answer({ error: 'not set up', setup: 'pending' }, 503));
    render(<ReportsPage />);

    expect(await screen.findByText('Not set up yet')).toBeInTheDocument();
    expect(screen.queryByText('Orders placed')).not.toBeInTheDocument();
  });

  it('shows a failure as a failure, with the server’s own wording', async () => {
    stub(() => answer({ error: 'Failed to read the report. Ranges: 30d, 90d, 12m, all.' }, 500));
    render(<ReportsPage />);

    expect(await screen.findByText(/Failed to read the report/)).toBeInTheDocument();
  });
});
