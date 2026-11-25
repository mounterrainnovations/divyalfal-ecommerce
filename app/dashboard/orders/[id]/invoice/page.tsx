import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Notice from '@/components/admin/Notice';
import ScreenHead from '@/components/admin/ScreenHead';
import { ACTION_QUIET, LABEL, META, SCREEN, SECTION_TITLE } from '@/components/admin/styles';
import { cn } from '@/lib/utils';
import { isMissingTable } from '@/lib/admin/not-set-up';
import { getSettings } from '@/lib/repositories/settings';
import {
  getOrder,
  OrderNotFoundError,
  rupeesFromPaise,
  type OrderDetail,
} from '@/lib/repositories/orders';
import {
  PAYMENT_LABEL,
  STATUS_LABEL,
  channelOf,
  measurementEntries,
  orderDate,
  orderDateTime,
  rupees,
  shortRef,
} from '../../shared';
import PrintButton from './print-button';

/**
 * A printable invoice for one order.
 *
 * **A server component, and no PDF library.** The order and the shop's own details are both a
 * database read away, so there is nothing to fetch from the browser and no loading state to
 * design; the only client code is the Print button. `window.print()` then produces a PDF on
 * every platform the owner has, at the paper size their printer actually holds, which is more
 * than a bundled PDF writer would give for 200KB of JavaScript.
 *
 * **The invoice reference is the order id.** There is no invoice-number column in this schema
 * and this module does not add one — a counter that resets on redeploy is worse than no
 * counter — so the shortened order id is the reference, and the invoice says so in print
 * rather than letting a reader assume it is a sequence. A real invoice series is a schema
 * change and a decision about numbering that belongs to the owner, not to this screen.
 *
 * **The totals are not embroidered.** The subtotal is the sum of the lines; `totalAmount` is
 * the only total the database records. When they differ, one "Adjustment" row carries the
 * difference and a sentence says plainly that the database does not record what the difference
 * was for. No discount line, no shipping line, no tax line: none of the three exists as a
 * column, and an invoice that invents them is a document that cannot be reconciled.
 */

/** The shop's own details, from `SiteSetting`, with the keys this document needs named once. */
interface Shop {
  name: string;
  email: string;
  phone: string;
  address: string;
}

/**
 * `SiteSetting.value` is a `Json` column, so a key can hold a string, a number, or an object
 * written by some other screen. Anything that is not usable as a line of text reads as absent,
 * because a header that prints `{"city":"Bhopal"}` is worse than one that prints nothing.
 */
function asLine(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return '';
}

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let order: OrderDetail;
  let shop: Shop;

  try {
    // The settings are not fatal: an invoice with no letterhead is still a usable invoice, and
    // the order is the part nobody can do without. So a settings failure degrades to blanks
    // while an order failure is reported.
    const [found, settings] = await Promise.all([
      getOrder(id),
      getSettings().catch(() => ({}) as Record<string, unknown>),
    ]);
    order = found;
    shop = {
      name: asLine(settings['seo.title']),
      email: asLine(settings['contact.email']),
      phone: asLine(settings['contact.phone']),
      address: asLine(settings['contact.address']),
    };
  } catch (error) {
    const notSetUp = isMissingTable(error);
    const missing = error instanceof OrderNotFoundError;
    if (!notSetUp && !missing) {
      console.error('[Dashboard] invoice for order failed', error);
    }

    return (
      <div className={SCREEN}>
        <ScreenHead
          title="Invoice"
          actions={
            <Link href="/dashboard/orders" className={ACTION_QUIET}>
              <ArrowLeft size={15} strokeWidth={2} aria-hidden="true" />
              All orders
            </Link>
          }
        />
        {notSetUp ? (
          <Notice label="Not set up yet">
            The orders tables are not in this database yet, so no invoice can be produced.
          </Notice>
        ) : missing ? (
          <Notice label="Nothing here">
            There is no order with the reference {shortRef(id)}, so there is nothing to invoice.
          </Notice>
        ) : (
          <Notice label="Problem" tone="problem">
            The invoice could not be produced. Check the database health and reload.
          </Notice>
        )}
      </div>
    );
  }

  const { totals } = order;
  const billTo = order.shippingAddress.length > 0 ? order.shippingAddress : null;

  return (
    <div className={SCREEN}>
      {/*
        THE PRINT STYLESHEET.

        Written as real CSS rather than Tailwind's `print:` variants for two reasons. First, the
        page it has to defeat is not its own: the portal's frame (a fixed sidebar, a top bar,
        a 256px left padding on the content) belongs to `AdminShell`, which this screen may not
        edit, and no utility class on this element can hide a sibling. Second, `@page` has no
        utility at all, and A4 with a 14mm margin is the whole point.

        The visibility trick — hide everything, then show this subtree — is used instead of
        naming the frame's elements, because it keeps working if the frame is ever rearranged.
        `visibility: hidden` leaves the layout in place, so the invoice is then pulled to the
        top-left corner with `position: absolute` to escape the sidebar's padding.
      */}
      <style>{`
        @media print {
          @page { size: A4; margin: 14mm; }
          body { background: #fff; }
          body * { visibility: hidden; }
          .ds-invoice, .ds-invoice * { visibility: visible; }
          .ds-invoice {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            border: 0;
            box-shadow: none;
            background: #fff;
            color: #000;
          }
          /* The controls are for the screen; a printed sheet with a "Print" button on it reads
             as a screenshot of a page rather than as a document. */
          .ds-invoice-screen-only { display: none !important; }
          /* A line item must not be split across two sheets: half a garment on page one and
             its price on page two is unreadable at a counter. */
          .ds-invoice tr { break-inside: avoid; }
          .ds-invoice thead { display: table-header-group; }
        }
      `}</style>

      <div className="ds-invoice-screen-only">
        <ScreenHead
          title={`Invoice ${shortRef(order.id)}`}
          note="Printed from the browser. Choose “Save as PDF” in the print dialogue to keep a copy."
          actions={
            <>
              <Link href={`/dashboard/orders/${order.id}`} className={ACTION_QUIET}>
                <ArrowLeft size={15} strokeWidth={2} aria-hidden="true" />
                Back to the order
              </Link>
              <PrintButton />
            </>
          }
        />
      </div>

      {/* The sheet. `max-w-[820px]` is roughly A4 at this type size, so what is on screen is
          what comes out of the printer. */}
      <article className="ds-invoice mx-auto w-full max-w-[820px] rounded-lg border border-[var(--ds-line)] bg-[var(--ds-surface)] p-8 shadow-[0_1px_2px_0_rgb(42_33_27/0.06)]">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-[var(--ds-line)] pb-5">
          <div className="min-w-0">
            <p className="text-[18px] leading-6 font-semibold text-[var(--ds-ink)]">
              {shop.name || 'Divyafal'}
            </p>
            {shop.address ? (
              <p className={cn(META, 'mt-1 max-w-[42ch] whitespace-pre-line')}>{shop.address}</p>
            ) : null}
            {shop.phone || shop.email ? (
              <p className={cn(META, 'mt-1')}>
                {[shop.phone, shop.email].filter(Boolean).join(' · ')}
              </p>
            ) : null}
            {/* Said once, where a reader would look for the letterhead: these details come from
                Settings, and a blank means nobody has filled them in yet. */}
            {!shop.address && !shop.phone && !shop.email ? (
              <p className={cn(META, 'mt-1')}>
                No contact details are saved in Settings yet, so none are printed.
              </p>
            ) : null}
          </div>

          <div className="shrink-0 text-right">
            <p className="text-[20px] leading-6 font-semibold tracking-[-0.01em] text-[var(--ds-ink)]">
              Invoice
            </p>
            <p className={cn(LABEL, 'mt-2')}>Reference</p>
            <p className="text-[14px] font-semibold tabular-nums text-[var(--ds-ink)]">
              {shortRef(order.id)}
            </p>
            <p className={cn(LABEL, 'mt-2')}>Order date</p>
            <p className="text-[13px] tabular-nums text-[var(--ds-ink)]">
              {orderDate(order.createdAt)}
            </p>
          </div>
        </header>

        <div className="grid gap-6 border-b border-[var(--ds-line)] py-5 sm:grid-cols-2">
          <section>
            <h2 className={cn(LABEL, 'mb-2')}>Billed to</h2>
            <p className="text-[14px] font-medium text-[var(--ds-ink)]">
              {order.customer.name ?? 'Name not recorded'}
            </p>
            {order.customer.phone ? (
              <p className={cn(META, 'mt-0.5')}>{order.customer.phone}</p>
            ) : null}
            {order.customer.email ? (
              <p className={cn(META, 'mt-0.5')}>{order.customer.email}</p>
            ) : null}

            {billTo ? (
              <div className="mt-2">
                {billTo
                  .filter(entry => entry.key !== 'fullName' && entry.key !== 'phone' && entry.key !== 'email')
                  .map(entry => (
                    <p key={entry.key} className={cn(META, 'leading-5')}>
                      {entry.value}
                    </p>
                  ))}
              </div>
            ) : (
              <p className={cn(META, 'mt-2')}>No delivery address was recorded on this order.</p>
            )}
          </section>

          <section className="sm:text-right">
            <h2 className={cn(LABEL, 'mb-2')}>This order</h2>
            <p className={cn(META, 'leading-5')}>Status: {STATUS_LABEL[order.status]}</p>
            <p className={cn(META, 'leading-5')}>
              Payment: {PAYMENT_LABEL[order.paymentStatus]}
            </p>
            <p className={cn(META, 'leading-5')}>Placed through: {channelOf(order)}</p>
            {order.trackingId ? (
              <p className={cn(META, 'leading-5')}>Tracking: {order.trackingId}</p>
            ) : null}
          </section>
        </div>

        <table className="mt-5 w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--ds-line)]">
              <th scope="col" className={cn(LABEL, 'pb-2')}>
                Item
              </th>
              <th scope="col" className={cn(LABEL, 'w-[60px] pb-2 text-right')}>
                Qty
              </th>
              <th scope="col" className={cn(LABEL, 'w-[110px] pb-2 text-right')}>
                Unit price
              </th>
              <th scope="col" className={cn(LABEL, 'w-[120px] pb-2 text-right')}>
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--ds-line)]">
            {order.items.length === 0 ? (
              <tr>
                <td colSpan={4} className={cn(META, 'py-4')}>
                  No items are recorded against this order.
                </td>
              </tr>
            ) : (
              order.items.map(item => {
                const measurements = measurementEntries(item.customMeasurements);
                return (
                  <tr key={item.id} className="align-top">
                    <td className="py-2.5 pr-3">
                      <span className="block text-[13px] font-medium text-[var(--ds-ink)]">
                        {item.productName ?? 'Product no longer in the catalogue'}
                      </span>
                      <span className={cn(META, 'block')}>
                        {item.size ? `Size ${item.size}` : 'Size not recorded'}
                        {item.color ? ` · ${item.color}` : ''}
                      </span>
                      {measurements.length > 0 ? (
                        <span className={cn(META, 'mt-1 block')}>
                          {measurements.map(entry => `${entry.label}: ${entry.value}`).join(' · ')}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2.5 text-right text-[13px] tabular-nums text-[var(--ds-muted)]">
                      {item.quantity}
                    </td>
                    <td className="py-2.5 text-right text-[13px] tabular-nums text-[var(--ds-muted)]">
                      {rupees(item.price)}
                    </td>
                    <td className="py-2.5 text-right text-[13px] font-medium tabular-nums text-[var(--ds-ink)]">
                      {rupees(item.lineTotal)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        <div className="mt-4 flex justify-end border-t border-[var(--ds-line)] pt-4">
          <dl className="w-full max-w-[300px] space-y-1.5">
            <div className="flex items-baseline justify-between gap-4">
              <dt className={LABEL}>Subtotal</dt>
              <dd className="text-[13px] tabular-nums text-[var(--ds-ink)]">
                {rupees(totals.subtotal)}
              </dd>
            </div>

            {totals.adjustment !== 0 ? (
              <div className="flex items-baseline justify-between gap-4">
                <dt className={LABEL}>Adjustment</dt>
                <dd className="text-[13px] tabular-nums text-[var(--ds-ink)]">
                  {rupees(totals.adjustment)}
                </dd>
              </div>
            ) : null}

            <div className="flex items-baseline justify-between gap-4 border-t border-[var(--ds-line)] pt-2">
              <dt className={SECTION_TITLE}>Total</dt>
              <dd className="text-[15px] font-semibold tabular-nums text-[var(--ds-ink)]">
                {rupees(totals.total)}
              </dd>
            </div>
          </dl>
        </div>

        {order.payments.length > 0 ? (
          <section className="mt-5 border-t border-[var(--ds-line)] pt-4">
            <h2 className={cn(LABEL, 'mb-2')}>Payments received</h2>
            <ul className="space-y-1">
              {order.payments.map(payment => (
                <li key={payment.id} className={cn(META, 'leading-5')}>
                  {/* Stored in paise — see `rupeesFromPaise`. An invoice is the one
                      document where an order-of-magnitude error is unrecoverable. */}
                  {rupees(rupeesFromPaise(payment.amount))} · {payment.provider} · {payment.status} ·{' '}
                  {orderDate(payment.createdAt)}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <footer className="mt-6 border-t border-[var(--ds-line)] pt-4">
          {totals.adjustment !== 0 ? (
            <p className={cn(META, 'leading-5')}>
              The adjustment row is the difference between the sum of the items above and the
              total recorded against this order. The shop&rsquo;s records do not say what the
              difference was for, so it is not described as a discount or as delivery.
            </p>
          ) : null}
          <p className={cn(META, 'mt-1 leading-5')}>
            This invoice is referenced by its order number, {shortRef(order.id)}; the shop keeps
            no separate invoice series. Printed {orderDateTime(new Date().toISOString())}.
          </p>
        </footer>
      </article>
    </div>
  );
}
