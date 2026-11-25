'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import ScreenHead from '@/components/admin/ScreenHead';
import Notice from '@/components/admin/Notice';
import Toast, { type ToastMessage } from '@/components/admin/Toast';
import DataTable, { type Column } from '@/components/admin/DataTable';
import BarSet, { type Bar } from '@/components/admin/BarSet';
import TrendChart from '@/components/admin/TrendChart';
import { SelectInput } from '@/components/admin/Field';
import {
  ACTION,
  CARD,
  CARD_BODY,
  CARD_HEAD,
  FIGURE,
  LABEL,
  META,
  SCREEN,
  SECTION_TITLE,
} from '@/components/admin/styles';
import { cn } from '@/lib/utils';
import { request } from '@/lib/admin/api';
import { formatPrice } from '@/lib/utils/price';
import type { ReportPayload, TopProduct } from '@/app/api/admin/reports/aggregate';
import {
  DEFAULT_RANGE,
  formatShare,
  plotVerdict,
  RANGE_LABEL,
  RANGES,
  type Range,
} from '@/app/api/admin/reports/windows';
import { csvFilename, reportCsvText } from './csv';
import {
  categoryLabel,
  ENQUIRY_SOURCE_LABEL,
  ENQUIRY_STATUS_LABEL,
  labelled,
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
} from './labels';

/**
 * Reports: what the shop has actually done, and — more often, today — what the figures are not
 * yet enough to say.
 *
 * THE PROBLEM THIS SCREEN IS BUILT AROUND. There are eight orders in this database and all of
 * them were placed on one day in May. A reports screen that draws a revenue curve through that
 * is not reporting, it is drawing: the reader takes a trend from the line, acts on it, and
 * nothing on the screen ever told them the line was made of one afternoon. So the order of
 * work here was the opposite of the usual one — the honest-empty states were written first and
 * the chart second, and the chart only appears when `plotVerdict` says the figures behind it
 * can support a shape. Everything else is a count, a sum or a group-by, and every panel states
 * the window it covers.
 *
 * WHAT IT WILL NOT DO. No projections. No "up 12% on last month" — there is no last month with
 * anything in it, and a growth figure computed from two points is a sentence invented out of
 * arithmetic. No sample rows to make a panel look furnished. Where a figure is unknown the
 * screen says unknown, which is not the same word as zero: thirteen of the fifteen products
 * have no size recorded at all, and reporting them as "0 in stock" would be a lie about stock
 * the shop may well have on the rail.
 *
 * WHY IT IS A CLIENT SCREEN WHEN THE DASHBOARD IS A SERVER ONE. The window is a control, so
 * changing it must not be a navigation, and the CSV has to be built from exactly the figures on
 * screen rather than from a second read. One fetch through `lib/admin/api`, one payload, one
 * `generatedAt` — the file and the screen cannot disagree.
 */

/** Four windows, and no custom date picker: see the comment on the select below. */
const RANGE_OPTIONS = RANGES.map(range => ({ value: range, label: RANGE_LABEL[range] }));

export default function ReportsPage() {
  const [range, setRange] = useState<Range>(DEFAULT_RANGE);
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [notSetUp, setNotSetUp] = useState(false);
  const [failure, setFailure] = useState('');
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      const answer = await request<ReportPayload>(`/api/admin/reports?range=${range}`, {
        signal: controller.signal,
      });
      // A superseded window: the next fetch owns the screen, and rendering this one's failure
      // would blame the reader's second click on the server.
      if (answer.aborted) return;

      if (answer.ok && answer.data) {
        setReport(answer.data);
        setNotSetUp(false);
        setFailure('');
      } else {
        setReport(null);
        setNotSetUp(answer.notSetUp);
        setFailure(answer.notSetUp ? '' : answer.message);
      }
      setLoading(false);
    };

    load();
    return () => controller.abort();
  }, [range]);

  /**
   * The export, built in the browser from the payload already on screen.
   *
   * The BOM is not decoration: without it Excel reads the file in the system codepage and every
   * rupee sign and en dash in the notes arrives as mojibake, which makes the caveats look like
   * corruption and invites someone to delete them.
   */
  function exportCsv() {
    if (!report) return;

    const blob = new Blob([`﻿${reportCsvText(report)}`], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = csvFilename(report.range, new Date(report.generatedAt));
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);

    setToast({ text: `Saved ${anchor.download}`, tone: 'ok' });
  }

  const verdict = report ? plotVerdict(report.series, report.unit) : null;

  return (
    <div className={SCREEN}>
      <ScreenHead
        title="Reports"
        note={
          report
            ? `${RANGE_LABEL[report.range]} — ${report.window.text}. Every figure below is counted from this shop's own records; nothing is estimated.`
            : 'Orders, payments, stock and enquiries, counted over a window you choose.'
        }
        actions={
          <>
            {/*
              Four fixed windows rather than a date picker. An arbitrary range invites comparing
              one hand-picked fortnight with another, which with eight orders is a way to produce
              any conclusion the picker already had in mind.
            */}
            <SelectInput
              id="report-range"
              aria-label="Report window"
              value={range}
              disabled={loading}
              onChange={event => setRange(event.target.value as Range)}
              className="w-[180px]"
            >
              {RANGE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectInput>
            <button
              type="button"
              onClick={exportCsv}
              disabled={!report || loading}
              className={ACTION}
            >
              <Download size={15} strokeWidth={1.75} aria-hidden="true" />
              Export CSV
            </button>
          </>
        }
      />

      {notSetUp ? (
        <Notice label="Not set up yet">
          The tables these figures are counted from are not in this database yet. Once the migration
          has been applied, this screen fills itself.
        </Notice>
      ) : failure ? (
        <Notice label="Problem" tone="problem">
          {failure}
        </Notice>
      ) : !report ? (
        <Notice label="Reading the figures" tone="working">
          Counting orders, payments, stock and enquiries over {RANGE_LABEL[range].toLowerCase()}.
        </Notice>
      ) : (
        <div className={cn('space-y-4', loading && 'opacity-60')}>
          <Headline report={report} />

          {/* ----------------------------------------------------------------------------- */}
          {/* Orders over time, or the reason there is no line                               */}
          {/* ----------------------------------------------------------------------------- */}
          <Panel
            title="Orders over time"
            note={report.unit === 'week' ? 'By week, Monday to Sunday' : 'By calendar month'}
          >
            {verdict?.plot ? (
              report.unit === 'week' ? (
                <TrendChart
                  points={report.series.map(point => ({
                    label: point.label,
                    value: point.orders,
                  }))}
                  caption={`Orders placed per week, ${report.window.text}`}
                  unit={value => (value === 1 ? 'order' : 'orders')}
                />
              ) : (
                /*
                 * Months go to the bar set rather than to `TrendChart`. The shared chart
                 * publishes its figures as a table whose rows are headed "Week beginning",
                 * which for a monthly series would be wrong in exactly the place a reader who
                 * cannot see the drawing depends on — and that component is not this change's
                 * to edit. A bar per month is also the plainer reading of a monthly count.
                 */
                <BarSet
                  bars={report.series.map(point => ({
                    key: point.key,
                    label: point.label,
                    value: point.orders,
                    display: String(point.orders),
                    note: point.revenue > 0 ? formatPrice(point.revenue) : undefined,
                  }))}
                  caption={`Orders placed per month, ${report.window.text}`}
                  measure="Orders"
                />
              )
            ) : (
              <>
                <p className="max-w-[68ch] text-[13px] leading-5 text-[var(--ds-muted)]">
                  {verdict?.reason}
                </p>
                {/* The figures themselves, with no shape drawn through them. */}
                {report.series.length > 0 ? (
                  <Figures
                    heading={report.unit === 'week' ? 'Week beginning' : 'Month'}
                    measure="Orders placed"
                    rows={report.series.map(point => ({
                      key: point.key,
                      label: point.label,
                      value: String(point.orders),
                      note: point.revenue > 0 ? formatPrice(point.revenue) : undefined,
                    }))}
                    className="mt-4"
                  />
                ) : null}
              </>
            )}
          </Panel>

          {/* ----------------------------------------------------------------------------- */}
          {/* The two breakdowns of the same orders                                          */}
          {/* ----------------------------------------------------------------------------- */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel
              title="Orders by status"
              note={`Share of the ${report.headline.orders} in this window`}
            >
              {report.byStatus.length > 0 ? (
                <BarSet
                  bars={breakdownBars(report.byStatus, report.headline.orders, ORDER_STATUS_LABEL)}
                  caption="Orders by status, with each status's share of the window and the order value behind it"
                  measure="Orders"
                />
              ) : (
                <Blank>
                  No orders were placed in this window, so there are no statuses to break down.
                </Blank>
              )}
            </Panel>

            <Panel
              title="Orders by payment status"
              note="Cancelled orders included — a paid cancellation is still money held"
            >
              {report.byPaymentStatus.length > 0 ? (
                <BarSet
                  bars={breakdownBars(
                    report.byPaymentStatus,
                    report.headline.orders,
                    PAYMENT_STATUS_LABEL
                  )}
                  caption="Orders by payment status, with each state's share of the window and the order value behind it"
                  measure="Orders"
                />
              ) : (
                <Blank>No orders were placed in this window, so nothing is paid or unpaid.</Blank>
              )}
            </Panel>
          </div>

          {/* ----------------------------------------------------------------------------- */}
          {/* Top products                                                                   */}
          {/* ----------------------------------------------------------------------------- */}
          <TopProducts report={report} />

          {/* ----------------------------------------------------------------------------- */}
          {/* The catalogue, and what is on the rail                                         */}
          {/* ----------------------------------------------------------------------------- */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel
              title="Catalogue mix"
              note={`${report.catalogue.total} products as the catalogue stands today`}
            >
              {report.catalogue.byCategory.length > 0 ? (
                <>
                  <BarSet
                    bars={report.catalogue.byCategory.map(row => ({
                      key: row.key,
                      label: categoryLabel(row.key),
                      value: row.count,
                      display: String(row.count),
                      note: formatShare(row.count, report.catalogue.total),
                    }))}
                    caption="Products per category, with each category's share of the catalogue"
                    measure="Products"
                  />
                  <p className={cn(META, 'mt-3')}>
                    Not limited to the window: a product&rsquo;s date is when it was added to the
                    portal, which says nothing about trading.
                    {report.catalogue.archived > 0
                      ? ` ${report.catalogue.archived} archived ${report.catalogue.archived === 1 ? 'product is' : 'products are'} counted here.`
                      : ' Nothing is archived.'}
                  </p>
                </>
              ) : (
                <Blank>There are no products in the catalogue.</Blank>
              )}
            </Panel>

            <Stock report={report} />
          </div>

          {/* ----------------------------------------------------------------------------- */}
          {/* Enquiries and the gateway                                                      */}
          {/* ----------------------------------------------------------------------------- */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Enquiries report={report} />
            <Payments report={report} />
          </div>

          <p className={cn(META, 'pt-1')}>
            Taken {new Date(report.generatedAt).toLocaleString('en-IN')}. {report.revenueBasis}
          </p>
        </div>
      )}

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* The pieces                                                                                  */
/* ------------------------------------------------------------------------------------------ */

/** A card with a heading, one line of context, and whatever the section renders. */
function Panel({
  title,
  note,
  children,
  className,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(CARD, className)}>
      <div className={CARD_HEAD}>
        <h2 className={SECTION_TITLE}>{title}</h2>
        {note ? <span className={META}>{note}</span> : null}
      </div>
      <div className={CARD_BODY}>{children}</div>
    </section>
  );
}

/** What a panel says when the honest answer is nothing. Never a zero on its own. */
function Blank({ children }: { children: React.ReactNode }) {
  return (
    <p className="max-w-[68ch] py-6 text-center text-[13px] leading-5 text-[var(--ds-faint)]">
      {children}
    </p>
  );
}

/**
 * One headline figure. Not a link, unlike the dashboard's tiles: there is no screen behind
 * "average order value" to send anyone to, and a link that goes nowhere useful is worse than
 * none. The note under each figure carries the caveat rather than a trend arrow.
 */
function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className={cn(CARD, 'px-5 py-4')}>
      <p className={cn(LABEL, 'truncate')}>{label}</p>
      <p className={cn(FIGURE, 'mt-3')}>{value}</p>
      <p className={cn(META, 'mt-2')}>{note}</p>
    </div>
  );
}

function Headline({ report }: { report: ReportPayload }) {
  const { headline, enquiries } = report;
  const orders = headline.orders;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
      <Stat
        label="Orders placed"
        value={String(orders)}
        note={orders === 0 ? 'nothing in this window' : 'in this window, any status'}
      />
      <Stat
        label="Revenue"
        value={formatPrice(headline.revenue)}
        note={
          orders === 0
            ? 'no orders in this window'
            : headline.excludedOrders > 0
              ? `${headline.excludedOrders} cancelled or returned (${formatPrice(headline.excludedAmount)}) left out`
              : `from all ${headline.revenueOrders} orders; none were cancelled`
        }
      />
      <Stat
        label="Average order"
        value={headline.averageOrderValue === null ? '—' : formatPrice(headline.averageOrderValue)}
        note={
          headline.averageOrderValue === null
            ? 'no counted orders to average'
            : `across ${headline.revenueOrders} counted ${headline.revenueOrders === 1 ? 'order' : 'orders'}`
        }
      />
      <Stat
        label="Marked paid"
        value={String(headline.paidOrders)}
        note={
          orders === 0
            ? 'no orders in this window'
            : `${formatShare(headline.paidOrders, orders)} of orders; ${headline.unpaidOrders} not paid`
        }
      />
      <Stat
        label="Quote requests"
        value={String(headline.rfqOrders)}
        note={
          orders === 0
            ? 'no orders in this window'
            : `${formatShare(headline.rfqOrders, orders)} of orders came in as RFQ`
        }
      />
      <Stat
        label="Enquiries"
        value={enquiries ? String(enquiries.inWindow) : '—'}
        note={
          !enquiries
            ? 'table not in this database'
            : enquiries.inWindow > 0
              ? 'through the website forms'
              : enquiries.everTotal === 0
                ? 'none have ever come in'
                : `none in this window; ${enquiries.everTotal} all time`
        }
      />
    </div>
  );
}

/** A breakdown's rows, in the one shape `BarSet` takes. */
function breakdownBars(
  rows: { key: string; count: number; amount: number }[],
  total: number,
  labels: Record<string, string>
): Bar[] {
  return rows.map(row => ({
    key: row.key,
    label: labelled(labels, row.key),
    value: row.count,
    display: String(row.count),
    note: `${formatShare(row.count, total)} · ${formatPrice(row.amount)}`,
  }));
}

/**
 * Figures with no chart through them: the honest alternative when `plotVerdict` refuses.
 *
 * It is a real table with a visible head, because here the numbers are the whole point rather
 * than a transcript of a drawing — and a column of them with a heading over it is the oldest and
 * least misleading way to show a series nobody should be reading a shape into.
 */
function Figures({
  heading,
  measure,
  rows,
  className,
}: {
  heading: string;
  measure: string;
  rows: { key: string; label: string; value: string; note?: string }[];
  className?: string;
}) {
  return (
    <table className={cn('w-full border-collapse', className)}>
      <thead>
        <tr>
          <th
            scope="col"
            className={cn(LABEL, 'border-b border-[var(--ds-line)] py-1.5 text-left')}
          >
            {heading}
          </th>
          <th
            scope="col"
            className={cn(LABEL, 'border-b border-[var(--ds-line)] py-1.5 text-right')}
          >
            {measure}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map(row => (
          <tr key={row.key} className="border-b border-[var(--ds-line)] last:border-0">
            <th
              scope="row"
              className="py-1.5 text-left text-[13px] font-normal text-[var(--ds-muted)]"
            >
              {row.label}
            </th>
            <td className="py-1.5 text-right text-[13px] tabular-nums text-[var(--ds-ink)]">
              {row.value}
              {row.note ? <span className={cn(META, 'ml-2')}>{row.note}</span> : null}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TopProducts({ report }: { report: ReportPayload }) {
  const { topProducts, headline } = report;
  const revenue = topProducts.reduce((sum, product) => sum + product.revenue, 0);

  const columns: Column<TopProduct>[] = [
    {
      key: 'name',
      head: 'Product',
      wrap: true,
      className: 'min-w-[180px]',
      cell: product => <span className="text-[var(--ds-ink)]">{product.name}</span>,
    },
    {
      key: 'category',
      head: 'Category',
      className: 'hidden sm:table-cell',
      cell: product => (
        <span className="text-[var(--ds-faint)]">{categoryLabel(product.category)}</span>
      ),
    },
    {
      key: 'units',
      head: 'Units sold',
      className: 'w-[110px] text-right tabular-nums',
      cell: product => product.units,
    },
    {
      key: 'revenue',
      head: 'Revenue',
      className: 'w-[130px] text-right tabular-nums',
      cell: product => formatPrice(product.revenue),
    },
    {
      key: 'share',
      head: 'Share',
      className: 'w-[90px] text-right tabular-nums',
      cell: product => (
        <span className="text-[var(--ds-faint)]">{formatShare(product.revenue, revenue)}</span>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      // Ordered by units by the database; the revenue column is sortable by eye at this size,
      // and a second ordering of five rows would be two tables of the same five rows.
      rows={topProducts}
      rowKey={product => product.productId}
      caption="Products sold in this window, by units and by revenue"
      maxHeight="max-h-[520px]"
      toolbar={
        <div className="min-w-0">
          <h2 className={SECTION_TITLE}>Top products</h2>
          <p className={cn(META, 'mt-0.5')}>
            From order items, on the same basis as revenue: cancelled and returned orders are left
            out.
          </p>
        </div>
      }
      empty={
        headline.orders === 0
          ? 'No orders were placed in this window, so nothing was sold.'
          : 'Every order in this window was cancelled or returned, so no units count as sold.'
      }
      footer={
        topProducts.length > 0 ? (
          <p className={META}>
            {topProducts.length} of {report.catalogue.total} products{' '}
            {topProducts.length === 1 ? 'has' : 'have'} sold anything in this window. The other{' '}
            {report.catalogue.total - topProducts.length} are not ranked, because no order in the
            window contains them.
          </p>
        ) : undefined
      }
    />
  );
}

/**
 * Stock, which is the panel where "unknown" and "zero" are most dangerous to confuse.
 *
 * Two of the fifteen products have sizes recorded. The other thirteen have none at all, and
 * their stock is therefore not known to this database — an owner reading "0" there would reorder
 * cloth for garments already hanging on the rail. The count comes from the query rather than
 * from this comment, so it stays true as sizes are added.
 */
function Stock({ report }: { report: ReportPayload }) {
  const { stock } = report;
  const placeholderUnits = stock.unitsInStock - stock.unitsCounted;

  return (
    <Panel
      title="Stock"
      note={`${stock.variants} sizes recorded across ${stock.productsWithVariants} products`}
    >
      {stock.productsWithoutVariants > 0 ? (
        <Notice
          label={`Stock is unknown for ${stock.productsWithoutVariants} of ${stock.productsTotal} products`}
          className="mb-4"
        >
          They have no size recorded at all, which is a gap in the data and not a count of zero.
          Nothing below includes them, and no total on this screen should be read as the whole
          shop&rsquo;s stock.
        </Notice>
      ) : null}

      {stock.byProduct.length > 0 ? (
        <>
          <BarSet
            bars={stock.byProduct.map(row => ({
              key: row.productId,
              label: row.name,
              value: row.units - row.placeholderUnits,
              display: `${row.units - row.placeholderUnits}`,
              note:
                row.placeholderUnits > 0
                  ? `${row.variants} sizes · ${row.placeholderUnits} made to order`
                  : `${row.variants} sizes`,
            }))}
            caption="Units in stock per product, excluding made-to-order placeholder sizes"
            measure="Units"
          />
          <dl className="mt-4 space-y-1.5 border-t border-[var(--ds-line)] pt-3">
            <Line label="Units counted">{stock.unitsCounted}</Line>
            {placeholderUnits > 0 ? (
              <Line label="Made to order">
                {placeholderUnits} units on{' '}
                {stock.placeholders.map(row => `${row.product} (${row.size})`).join(', ')} — a
                placeholder quantity, not garments on a shelf, so it is kept out of the figures
                above.
              </Line>
            ) : null}
            <Line label="Sizes at zero">
              {stock.outOfStockVariants === 0
                ? 'None of the recorded sizes has run out.'
                : stock.zeroStock
                    .map(row => `${row.product} (${row.size}${row.color ? `, ${row.color}` : ''})`)
                    .join(', ')}
            </Line>
          </dl>
        </>
      ) : (
        <Blank>
          No sizes are recorded for any product, so this database holds no stock figures at all.
        </Blank>
      )}
    </Panel>
  );
}

function Enquiries({ report }: { report: ReportPayload }) {
  const { enquiries } = report;

  if (!enquiries) {
    return (
      <Panel title="Enquiries">
        <Notice label="Not set up yet">
          The enquiries table is not in this database, so nothing could be counted. That is not the
          same as no enquiries having come in.
        </Notice>
      </Panel>
    );
  }

  return (
    <Panel title="Enquiries" note={`${enquiries.everTotal} recorded all time`}>
      {enquiries.inWindow === 0 ? (
        <Blank>
          {enquiries.everTotal === 0
            ? 'Nothing has come in through the contact or academy forms — not in this window, and not at any point. The table is there and reading correctly; it is empty.'
            : `Nothing came in during this window. ${enquiries.everTotal} ${enquiries.everTotal === 1 ? 'enquiry has' : 'enquiries have'} been received outside it.`}
        </Blank>
      ) : (
        <div className="space-y-5">
          <div>
            <p className={cn(LABEL, 'mb-2')}>By state</p>
            <BarSet
              bars={enquiries.byStatus.map(row => ({
                key: row.key,
                label: labelled(ENQUIRY_STATUS_LABEL, row.key),
                value: row.count,
                display: String(row.count),
                note: formatShare(row.count, enquiries.inWindow),
              }))}
              caption="Enquiries in this window by state"
              measure="Enquiries"
            />
          </div>
          <div>
            <p className={cn(LABEL, 'mb-2')}>By form</p>
            <BarSet
              bars={enquiries.bySource.map(row => ({
                key: row.key || 'unrecorded',
                label: labelled(ENQUIRY_SOURCE_LABEL, row.key),
                value: row.count,
                display: String(row.count),
                note: formatShare(row.count, enquiries.inWindow),
              }))}
              caption="Enquiries in this window by the form they came from"
              measure="Enquiries"
            />
          </div>
        </div>
      )}
    </Panel>
  );
}

/**
 * The gateway's own rows, beside the orders table's opinion of the same payments.
 *
 * They are shown together and not reconciled, because they disagree and this screen is not the
 * place to decide which is right: three orders are marked paid while the gateway has captured
 * one. Saying so is useful; quietly preferring either figure would not be.
 */
function Payments({ report }: { report: ReportPayload }) {
  const { payments, headline } = report;

  if (!payments) {
    return (
      <Panel title="Payments recorded by the gateway">
        <Blank>The payments table could not be read, so nothing is shown rather than zero.</Blank>
      </Panel>
    );
  }

  return (
    <Panel
      title="Payments recorded by the gateway"
      note={`${payments.count} ${payments.count === 1 ? 'row' : 'rows'} in this window`}
    >
      {payments.count === 0 ? (
        <Blank>The gateway recorded no payment attempts in this window.</Blank>
      ) : (
        <>
          <BarSet
            bars={payments.byStatus.map(row => ({
              key: row.key,
              // The gateway's own words ("captured", "created", "failed"), not a translation:
              // these are what Razorpay wrote, and renaming them would hide which is which.
              label: row.key,
              value: row.count,
              display: String(row.count),
              note: formatPrice(row.amount),
            }))}
            caption="Payment rows by the status the gateway recorded, with the amount behind each"
            measure="Rows"
          />
          <dl className="mt-4 space-y-1.5 border-t border-[var(--ds-line)] pt-3">
            <Line label="Recorded">
              {formatPrice(payments.amount)} across {payments.count}{' '}
              {payments.count === 1 ? 'row' : 'rows'}, including attempts that never completed.
            </Line>
            <Line label="Against orders">
              {headline.paidOrders} {headline.paidOrders === 1 ? 'order is' : 'orders are'} marked
              paid in the orders table. The two records are kept separately and need not agree;
              neither is corrected here.
            </Line>
          </dl>
          <p className={cn(META, 'mt-3')}>
            The gateway stores paise. These figures are divided by a hundred to read as rupees — the
            only derived number on this screen, and the recorded paise match the order totals
            exactly, which is what that reading rests on.
          </p>
        </>
      )}
    </Panel>
  );
}

/** A label and its sentence, for the notes under a panel's figures. */
function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5">
      <dt className={cn(LABEL, 'w-[110px] shrink-0')}>{label}</dt>
      <dd className="min-w-0 flex-1 text-[13px] leading-5 text-[var(--ds-muted)]">{children}</dd>
    </div>
  );
}
