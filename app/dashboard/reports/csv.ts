import type { ReportPayload } from '@/app/api/admin/reports/aggregate';
import { formatShare, plotVerdict, RANGE_LABEL, type Range } from '@/app/api/admin/reports/windows';
import {
  categoryLabel,
  ENQUIRY_SOURCE_LABEL,
  ENQUIRY_STATUS_LABEL,
  labelled,
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
} from './labels';

/**
 * The screen, as a file.
 *
 * WHY IT IS BUILT FROM THE SAME PAYLOAD THE SCREEN RENDERS. An export endpoint of its own would
 * re-run the queries, which means re-resolving "now", which means a CSV that quietly disagrees
 * with the screen it was taken from — a different window, a different total, and no way for the
 * reader to know which one to trust. This takes the object already in the browser, so the file
 * is the screen: same window, same `generatedAt`, same figures, including the sentences about
 * what could not be shown.
 *
 * WHY THE CAVEATS ARE IN THE FILE AND NOT ONLY ON THE SCREEN. The CSV is the copy that gets
 * mailed to an accountant, and a column of figures with no note attached is exactly where "8
 * orders" becomes "a normal month". So the revenue basis, the paise reading, the
 * made-to-order placeholder and the reason a series was not plotted all travel with the
 * numbers.
 *
 * WHY MONEY IS WRITTEN AS BARE NUMBERS. A spreadsheet must be able to add the column up;
 * "₹48,000" is text and sums to zero. The unit is in the column heading instead.
 *
 * NO LIBRARY, AND NO `join(',')` EITHER. Quoting is the whole job of a CSV writer: a garment
 * named `Saree, red` or `The "Benares" Saree`, or a status someone typed a newline into, each
 * silently break a file built by concatenation — and break it in a way that looks like data
 * rather than like an error. `csvField` is tested against all three.
 */

export type CsvCell = string | number | null | undefined;

/**
 * One field, quoted exactly when RFC 4180 needs it to be.
 *
 * The delimiters are obvious; the leading/trailing space is not. Unquoted surrounding space is
 * legal but readers disagree about whether to keep it, and a name that loses its spacing in one
 * spreadsheet and keeps it in another is a difference nobody can see. Quoting settles it.
 */
export function csvField(value: CsvCell): string {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'number' ? String(value) : value;
  const needsQuotes = /[",\r\n]/.test(text) || text !== text.trim();
  if (!needsQuotes) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * Rows to a CSV document. CRLF between records, as the specification says and as Excel expects;
 * an empty row is written as an empty line, which is how the sections below are separated.
 */
export function toCsv(rows: CsvCell[][]): string {
  return rows.map(row => row.map(csvField).join(',')).join('\r\n');
}

/**
 * `divyafal-reports-12m-2026-11-25.csv`. The range is in the name because two exports taken on
 * one afternoon over different windows are otherwise the same filename twice, and the one in
 * the downloads folder is then whichever was saved last.
 */
export function csvFilename(range: Range, at: Date): string {
  const month = String(at.getMonth() + 1).padStart(2, '0');
  const day = String(at.getDate()).padStart(2, '0');
  return `divyafal-reports-${range}-${at.getFullYear()}-${month}-${day}.csv`;
}

/** A blank line, then the section's own name on a line of its own. */
function section(title: string): CsvCell[][] {
  return [[], [title]];
}

export function reportToCsv(report: ReportPayload): CsvCell[][] {
  const rows: CsvCell[][] = [];
  const { headline, stock } = report;
  const verdict = plotVerdict(report.series, report.unit);

  rows.push(['Divyafal — shop report']);
  rows.push(['Range', RANGE_LABEL[report.range]]);
  rows.push(['Window', report.window.text]);
  rows.push(['Taken at', report.generatedAt]);
  rows.push(['Revenue basis', report.revenueBasis]);

  rows.push(...section('Headline figures'));
  rows.push(['Figure', 'Value', 'Note']);
  rows.push(['Orders placed', headline.orders, 'Every order in the window, whatever its status']);
  rows.push([
    'Revenue (₹)',
    headline.revenue,
    `From ${headline.revenueOrders} of those orders; cancelled and returned ones are excluded`,
  ]);
  rows.push([
    'Excluded from revenue (₹)',
    headline.excludedAmount,
    `${headline.excludedOrders} cancelled or returned ${headline.excludedOrders === 1 ? 'order' : 'orders'}`,
  ]);
  rows.push([
    'Average order value (₹)',
    headline.averageOrderValue,
    headline.averageOrderValue === null
      ? 'No orders counted toward revenue, so there is no average'
      : `Revenue divided by the ${headline.revenueOrders} orders it covers`,
  ]);
  rows.push(['Orders marked paid', headline.paidOrders, 'By Order.paymentStatus']);
  rows.push(['Orders not marked paid', headline.unpaidOrders, 'Pending, failed or refunded']);
  rows.push(['Quote requests (RFQ)', headline.rfqOrders, 'Order.type = RFQ']);

  rows.push(...section(`Orders by ${report.unit}`));
  rows.push([verdict.plot ? 'Plotted on the screen' : 'Not plotted', verdict.reason]);
  rows.push([
    report.unit === 'week' ? 'Week beginning' : 'Month',
    'Orders placed',
    'Revenue counted (₹)',
  ]);
  for (const point of report.series) {
    rows.push([point.key, point.orders, point.revenue]);
  }

  rows.push(...section('Orders by status'));
  rows.push(['Status', 'Orders', 'Share of orders', 'Order value (₹)']);
  for (const row of report.byStatus) {
    rows.push([
      labelled(ORDER_STATUS_LABEL, row.key),
      row.count,
      formatShare(row.count, headline.orders),
      row.amount,
    ]);
  }

  rows.push(...section('Orders by payment status'));
  rows.push(['Payment status', 'Orders', 'Share of orders', 'Order value (₹)']);
  for (const row of report.byPaymentStatus) {
    rows.push([
      labelled(PAYMENT_STATUS_LABEL, row.key),
      row.count,
      formatShare(row.count, headline.orders),
      row.amount,
    ]);
  }

  rows.push(...section('Top products'));
  rows.push([
    'Units and revenue are from order items on the same basis as revenue above: cancelled and returned orders are excluded.',
  ]);
  rows.push(['Product', 'Category', 'Units sold', 'Revenue (₹)']);
  if (report.topProducts.length === 0) {
    rows.push(['Nothing was sold in this window']);
  }
  for (const product of report.topProducts) {
    rows.push([product.name, categoryLabel(product.category), product.units, product.revenue]);
  }

  rows.push(...section('Catalogue mix'));
  rows.push(['The catalogue as it stands today. It is not limited to the window.']);
  rows.push(['Category', 'Products', 'Share of catalogue']);
  for (const row of report.catalogue.byCategory) {
    rows.push([categoryLabel(row.key), row.count, formatShare(row.count, report.catalogue.total)]);
  }
  rows.push(['Total', report.catalogue.total, '']);
  rows.push(['Archived', report.catalogue.archived, '']);

  rows.push(...section('Stock'));
  rows.push([
    `${stock.productsWithoutVariants} of ${stock.productsTotal} products have no size recorded at all, so their stock is unknown rather than zero. The figures below cover the ${stock.productsWithVariants} that do.`,
  ]);
  rows.push(['Units recorded', stock.unitsInStock, 'Placeholder sizes included']);
  rows.push([
    'Units counted',
    stock.unitsCounted,
    'Placeholder sizes excluded — see the lines below',
  ]);
  rows.push(['Sizes recorded', stock.variants, '']);
  rows.push(['Sizes at zero', stock.outOfStockVariants, '']);
  rows.push([]);
  rows.push(['Product', 'Sizes recorded', 'Units counted', 'Placeholder units']);
  for (const row of stock.byProduct) {
    rows.push([row.name, row.variants, row.units - row.placeholderUnits, row.placeholderUnits]);
  }

  if (stock.placeholders.length > 0) {
    rows.push([]);
    rows.push(['Placeholder sizes (treated as made-to-order, not as units on a shelf)']);
    rows.push(['Product', 'Size', 'Units recorded']);
    for (const row of stock.placeholders) {
      rows.push([row.product, row.size, row.stock]);
    }
  }

  if (stock.zeroStock.length > 0) {
    rows.push([]);
    rows.push(['Sizes with no stock left']);
    rows.push(['Product', 'Size', 'Colour']);
    for (const row of stock.zeroStock) {
      rows.push([row.product, row.size, row.color]);
    }
  }

  rows.push(...section('Enquiries'));
  if (!report.enquiries) {
    rows.push(['The enquiries table is not in this database, so nothing could be counted.']);
  } else {
    rows.push(['In this window', report.enquiries.inWindow]);
    rows.push(['Recorded ever', report.enquiries.everTotal]);
    if (report.enquiries.inWindow === 0) {
      rows.push([
        report.enquiries.everTotal === 0
          ? 'Nothing has ever come in through the contact or academy forms.'
          : 'Nothing came in during this window, though enquiries have been received outside it.',
      ]);
    }
    if (report.enquiries.byStatus.length > 0) {
      rows.push([]);
      rows.push(['State', 'Enquiries']);
      for (const row of report.enquiries.byStatus) {
        rows.push([labelled(ENQUIRY_STATUS_LABEL, row.key), row.count]);
      }
    }
    if (report.enquiries.bySource.length > 0) {
      rows.push([]);
      rows.push(['Form', 'Enquiries']);
      for (const row of report.enquiries.bySource) {
        rows.push([labelled(ENQUIRY_SOURCE_LABEL, row.key), row.count]);
      }
    }
  }

  rows.push(...section('Payments recorded by the gateway'));
  if (!report.payments) {
    rows.push(['The payments table could not be read.']);
  } else {
    rows.push([
      'The gateway stores paise; these figures are divided by a hundred to read as rupees.',
    ]);
    rows.push(['Payment rows', report.payments.count]);
    rows.push(['Total (₹)', report.payments.amount]);
    if (report.payments.byStatus.length > 0) {
      rows.push([]);
      rows.push(['Gateway status', 'Rows', 'Total (₹)']);
      for (const row of report.payments.byStatus) {
        rows.push([row.key, row.count, row.amount]);
      }
    }
  }

  return rows;
}

/** The whole file, as text. Separate from `reportToCsv` so the rows can be asserted on. */
export function reportCsvText(report: ReportPayload): string {
  return toCsv(reportToCsv(report));
}
