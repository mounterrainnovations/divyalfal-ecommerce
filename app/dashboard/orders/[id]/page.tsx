'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { ArrowLeft, ImageOff, Printer } from 'lucide-react';
import ScreenHead from '@/components/admin/ScreenHead';
import Notice from '@/components/admin/Notice';
import Toast, { type ToastMessage } from '@/components/admin/Toast';
import Field, { SelectInput, TextInput } from '@/components/admin/Field';
import {
  ACTION,
  ACTION_QUIET,
  ACTION_SOFT,
  CARD,
  CARD_BODY,
  CARD_HEAD,
  LABEL,
  META,
  SCREEN,
  SECTION_TITLE,
  TABLE_CELL,
  TABLE_HEAD,
  badge,
} from '@/components/admin/styles';
import { cn } from '@/lib/utils';
import { request, send } from '@/lib/admin/api';
import {
  ORDER_STATUS_OPTIONS,
  PAYMENT_LABEL,
  PAYMENT_STATUS_OPTIONS,
  PAYMENT_TONE,
  STATUS_LABEL,
  STATUS_TONE,
  channelOf,
  measurementEntries,
  orderDateTime,
  rupees,
  rupeesFromPaise,
  shortRef,
  type OrderDetail,
} from '../shared';

/**
 * One order, in full: who it is for, where it is going, what is on it, what was paid, and the
 * four fields the portal is allowed to change.
 *
 * **Everything on this screen is a server fact.** The controls hold a draft until Save, and
 * the answer to the PATCH replaces the whole order — not just the fields that were sent — so
 * the screen can never show a status the database did not accept. That matters most for the
 * one thing an admin does here repeatedly: marking an order shipped and pasting a tracking
 * link, often on a phone, often on a bad connection.
 *
 * **The lines are read-only, and that is a decision, not an omission.** The items, the prices
 * and the customer are what was agreed; a portal that can rewrite them is a portal that can
 * make a dispute unresolvable. A correction is a new order with a reason behind it.
 *
 * **Why no payment can be added here.** `Payment.provider_order_id` is unique and belongs to
 * whatever actually took the money. Marking an order PAID changes `Order.paymentStatus` and
 * nothing else; the only thing in the portal that writes a `Payment` row is the offline form,
 * which knows the money came over the counter. So this screen shows the payments that exist
 * and never invents one.
 */
export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === 'string' ? params.id : '';

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notSetUp, setNotSetUp] = useState(false);
  const [missing, setMissing] = useState(false);
  const [failure, setFailure] = useState('');
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [saving, setSaving] = useState(false);

  // The draft the controls edit. Seeded from the order and reset from every answer, so
  // "unsaved" is always a difference between this and `order` and never a stale leftover.
  const [draft, setDraft] = useState({
    status: '',
    paymentStatus: '',
    trackingId: '',
    trackingUrl: '',
  });
  const [urlError, setUrlError] = useState('');

  const adopt = useCallback((fresh: OrderDetail) => {
    setOrder(fresh);
    setDraft({
      status: fresh.status,
      paymentStatus: fresh.paymentStatus,
      trackingId: fresh.trackingId ?? '',
      trackingUrl: fresh.trackingUrl ?? '',
    });
    setUrlError('');
  }, []);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      const answer = await request<OrderDetail>(`/api/admin/orders/${id}`, {
        signal: controller.signal,
      });
      if (answer.aborted) return;

      if (answer.ok && answer.data) {
        adopt(answer.data);
        setMissing(false);
        setNotSetUp(false);
        setFailure('');
      } else {
        setOrder(null);
        setMissing(answer.status === 404);
        setNotSetUp(answer.notSetUp);
        setFailure(answer.notSetUp || answer.status === 404 ? '' : answer.message);
      }
      setLoading(false);
    };

    load();
    return () => controller.abort();
  }, [id, adopt]);

  const dirty =
    order !== null &&
    (draft.status !== order.status ||
      draft.paymentStatus !== order.paymentStatus ||
      draft.trackingId !== (order.trackingId ?? '') ||
      draft.trackingUrl !== (order.trackingUrl ?? ''));

  async function save() {
    if (!order) return;

    // Checked here as well as in the repository so the message lands on the field rather than
    // arriving as a banner after a round trip.
    const link = draft.trackingUrl.trim();
    if (link && !/^https?:\/\/\S+$/i.test(link)) {
      setUrlError('The tracking link must start with http:// or https://');
      return;
    }
    setUrlError('');

    setSaving(true);
    const answer = await send<OrderDetail>(`/api/admin/orders/${order.id}`, 'PATCH', {
      status: draft.status,
      paymentStatus: draft.paymentStatus,
      trackingId: draft.trackingId.trim(),
      trackingUrl: link,
    });
    setSaving(false);

    if (!answer.ok || !answer.data) {
      setToast({ text: answer.message, tone: 'error' });
      return;
    }

    adopt(answer.data);
    setToast({ text: `Order ${shortRef(answer.data.id)} was updated.`, tone: 'ok' });
  }

  if (loading && !order) {
    return (
      <div className={SCREEN}>
        <ScreenHead title="Order" />
        <Notice label="Loading" tone="working">
          Reading the order…
        </Notice>
      </div>
    );
  }

  if (notSetUp || missing || !order) {
    return (
      <div className={SCREEN}>
        <ScreenHead
          title="Order"
          actions={
            <Link href="/dashboard/orders" className={ACTION_SOFT}>
              <ArrowLeft size={15} strokeWidth={2} aria-hidden="true" />
              All orders
            </Link>
          }
        />
        {notSetUp ? (
          <Notice label="Not set up yet">
            The orders tables are not in this database yet, so this order cannot be read.
          </Notice>
        ) : missing ? (
          <Notice label="Nothing here">
            There is no order with the reference {shortRef(id)}. It may have been deleted, or the
            link may be wrong.
          </Notice>
        ) : (
          <Notice label="Problem" tone="problem">
            {failure || 'The order could not be loaded.'}
          </Notice>
        )}
      </div>
    );
  }

  const { totals } = order;

  return (
    <div className={SCREEN}>
      <ScreenHead
        title={`Order ${shortRef(order.id)}`}
        note={`${orderDateTime(order.createdAt)} · ${channelOf(order)} · ${order.items.length} line${
          order.items.length === 1 ? '' : 's'
        }`}
        actions={
          <>
            <Link href="/dashboard/orders" className={ACTION_QUIET}>
              <ArrowLeft size={15} strokeWidth={2} aria-hidden="true" />
              All orders
            </Link>
            <Link href={`/dashboard/orders/${order.id}/invoice`} className={ACTION_SOFT}>
              <Printer size={15} strokeWidth={2} aria-hidden="true" />
              Invoice
            </Link>
          </>
        }
      />

      <div className="flex flex-col gap-5">
        {/* Who and where, side by side: they are read together and they are both short. */}
        <div className="grid gap-5 lg:grid-cols-2">
          <section className={CARD}>
            <div className={CARD_HEAD}>
              <h2 className={SECTION_TITLE}>Customer</h2>
              <span className={badge('neutral')}>
                {order.customer.source === 'account'
                  ? 'Website account'
                  : order.customer.source === 'guest'
                    ? 'Guest'
                    : 'Not recorded'}
              </span>
            </div>
            <div className={CARD_BODY}>
              <dl className="space-y-3">
                <Line label="Name">
                  {order.customer.name ?? <Absent>No name was recorded</Absent>}
                </Line>
                <Line label="Phone">
                  {order.customer.phone ? (
                    <a
                      href={`tel:${order.customer.phone}`}
                      className="underline decoration-[var(--ds-line-strong)]"
                    >
                      {order.customer.phone}
                    </a>
                  ) : (
                    <Absent>No phone number was recorded</Absent>
                  )}
                </Line>
                <Line label="Email">
                  {order.customer.email ? (
                    <a
                      href={`mailto:${order.customer.email}`}
                      className="underline decoration-[var(--ds-line-strong)]"
                    >
                      {order.customer.email}
                    </a>
                  ) : (
                    <Absent>No email address was recorded</Absent>
                  )}
                </Line>
              </dl>
            </div>
          </section>

          <section className={CARD}>
            <div className={CARD_HEAD}>
              <h2 className={SECTION_TITLE}>Shipping address</h2>
            </div>
            <div className={CARD_BODY}>
              {order.shippingAddress.length > 0 ? (
                <dl className="space-y-3">
                  {order.shippingAddress.map(entry => (
                    <Line key={entry.key} label={entry.label}>
                      {entry.value}
                      {/* A key this build has never seen is shown, labelled as it was stored,
                          and marked — hiding it would keep data from the only person able to
                          act on it. */}
                      {entry.known ? null : (
                        <span className={cn(META, 'ml-2')}>(recorded as “{entry.key}”)</span>
                      )}
                    </Line>
                  ))}
                </dl>
              ) : (
                <p className={META}>
                  {order.shippingAddressRecorded
                    ? 'An address was recorded, but none of its fields hold a readable value.'
                    : 'No address was recorded on this order.'}
                </p>
              )}
            </div>
          </section>
        </div>

        {/* The lines. A table rather than DataTable: these rows are two lines tall (a size and
            a tailor's measurements under the name) and the component is built for one. */}
        <section className={CARD}>
          <div className={CARD_HEAD}>
            <h2 className={SECTION_TITLE}>Items</h2>
            <p className={META}>Prices as they were agreed. Nothing here can be edited.</p>
          </div>

          {order.items.length === 0 ? (
            <div className={CARD_BODY}>
              <p className={META}>
                This order has no lines recorded against it, which is unusual: an order is
                normally written with its items in the same transaction.
              </p>
            </div>
          ) : (
            <div className="ds-scroll overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr>
                    <th scope="col" className={cn(TABLE_HEAD, 'w-[52px] pl-4')}>
                      <span className="sr-only">Photograph</span>
                    </th>
                    <th scope="col" className={TABLE_HEAD}>
                      Item
                    </th>
                    <th scope="col" className={cn(TABLE_HEAD, 'w-[70px] text-right')}>
                      Qty
                    </th>
                    <th scope="col" className={cn(TABLE_HEAD, 'w-[110px] text-right')}>
                      Unit price
                    </th>
                    <th scope="col" className={cn(TABLE_HEAD, 'w-[120px] pr-4 text-right')}>
                      Line total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ds-line)]">
                  {order.items.map(item => {
                    const measurements = measurementEntries(item.customMeasurements);
                    return (
                      <tr key={item.id} className="align-top">
                        <td className={cn(TABLE_CELL, 'py-3 pl-4')}>
                          {item.photo ? (
                            <Image
                              src={item.photo}
                              alt=""
                              width={36}
                              height={36}
                              unoptimized
                              className="h-9 w-9 rounded-md border border-[var(--ds-line)] object-cover"
                            />
                          ) : (
                            <span
                              title="No photograph"
                              aria-label="No photograph"
                              className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--ds-line)] bg-[var(--ds-surface-sunk)] text-[var(--ds-faint)]"
                            >
                              <ImageOff size={14} strokeWidth={1.75} aria-hidden="true" />
                            </span>
                          )}
                        </td>
                        <td className={cn(TABLE_CELL, 'py-3')}>
                          <span className="block font-medium text-[var(--ds-ink)]">
                            {item.productName ?? 'Product no longer in the catalogue'}
                          </span>
                          <span className={cn(META, 'block')}>
                            {item.size ? `Size ${item.size}` : 'Size not recorded'}
                            {item.color ? ` · ${item.color}` : ''}
                          </span>
                          {measurements.length > 0 ? (
                            <dl className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-2">
                              {measurements.map(entry => (
                                <div key={entry.label} className="flex gap-2">
                                  <dt className={cn(META, 'shrink-0')}>{entry.label}</dt>
                                  <dd className="min-w-0 text-[12px] leading-4 break-words text-[var(--ds-muted)]">
                                    {entry.value}
                                  </dd>
                                </div>
                              ))}
                            </dl>
                          ) : null}
                        </td>
                        <td className={cn(TABLE_CELL, 'py-3 text-right tabular-nums')}>
                          {item.quantity}
                        </td>
                        <td className={cn(TABLE_CELL, 'py-3 text-right tabular-nums')}>
                          {rupees(item.price)}
                        </td>
                        <td
                          className={cn(
                            TABLE_CELL,
                            'py-3 pr-4 text-right font-medium tabular-nums text-[var(--ds-ink)]'
                          )}
                        >
                          {rupees(item.lineTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-[var(--ds-line)] px-5 py-4">
            <dl className="ml-auto w-full max-w-[320px] space-y-2">
              <Money label="Lines add up to">{rupees(totals.subtotal)}</Money>
              {totals.adjustment !== 0 ? (
                <>
                  <Money label="Adjustment">{rupees(totals.adjustment)}</Money>
                  {/* Said in words, because the schema does not record what the difference
                      was. Inventing "Discount" or "Shipping" here would be inventing a fact
                      about someone's order. */}
                  <p className={cn(META, 'pt-1')}>
                    The lines and the recorded total differ by {rupees(totals.adjustment)}. The
                    database stores only the total, not what the difference was for, so it is
                    shown as an adjustment rather than guessed at.
                  </p>
                </>
              ) : null}
              <div className="border-t border-[var(--ds-line)] pt-2">
                <Money label="Order total" strong>
                  {rupees(totals.total)}
                </Money>
              </div>
            </dl>
          </div>
        </section>

        <section className={CARD}>
          <div className={CARD_HEAD}>
            <h2 className={SECTION_TITLE}>Payments</h2>
            <span className={badge(PAYMENT_TONE[order.paymentStatus])}>
              {PAYMENT_LABEL[order.paymentStatus]}
            </span>
          </div>
          <div className={CARD_BODY}>
            {order.payments.length === 0 ? (
              <p className={META}>
                No payment row has been recorded against this order. The payment state above is
                the order&rsquo;s own column; a payment row is written by the gateway, or by this
                portal when a counter sale is recorded as paid.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--ds-line)]">
                {order.payments.map(payment => (
                  <li key={payment.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-2.5 first:pt-0 last:pb-0">
                    <span className="font-medium tabular-nums text-[var(--ds-ink)]">
                      {/* `Payment.amount` is an Int holding PAISE, verified against the live rows:
                          all five are exactly 100x their order's total. Printing it raw would
                          show a 12,000 rupee order as 12,00,000. */}
                      {rupees(rupeesFromPaise(payment.amount))}
                      {payment.currency === 'INR' ? '' : ` ${payment.currency}`}
                    </span>
                    <span className={LABEL}>{payment.provider}</span>
                    <span className={badge(payment.status === 'captured' ? 'success' : 'neutral')}>
                      {payment.status}
                    </span>
                    <span className={cn(META, 'ml-auto')}>{orderDateTime(payment.createdAt)}</span>
                    <span className={cn(META, 'w-full break-all')}>
                      {payment.providerOrderId}
                      {payment.providerPaymentId ? ` · ${payment.providerPaymentId}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {order.razorpayOrderId || order.razorpayPaymentId ? (
              <p className={cn(META, 'mt-3 break-all')}>
                Gateway references on the order itself: {order.razorpayOrderId ?? '—'}
                {order.razorpayPaymentId ? ` · ${order.razorpayPaymentId}` : ''}
              </p>
            ) : null}
          </div>
        </section>

        {/* The one thing this screen changes, and the only primary action on it. */}
        <section className={CARD}>
          <div className={CARD_HEAD}>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className={SECTION_TITLE}>Status and tracking</h2>
              {/* The saved status, not the draft: the pill is what the database holds, and the
                  select below is what is about to be sent. */}
              <span className={badge(STATUS_TONE[order.status])}>
                {STATUS_LABEL[order.status]}
              </span>
            </div>
            <p className={META}>Last changed {orderDateTime(order.updatedAt)}</p>
          </div>
          <div className={CARD_BODY}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="order-status-edit" label="Order status">
                <SelectInput
                  id="order-status-edit"
                  value={draft.status}
                  disabled={saving}
                  onChange={event => setDraft(current => ({ ...current, status: event.target.value }))}
                >
                  {ORDER_STATUS_OPTIONS.map(option => (
                    <option key={option} value={option}>
                      {STATUS_LABEL[option]}
                    </option>
                  ))}
                </SelectInput>
              </Field>

              <Field
                id="order-payment-edit"
                label="Payment"
                hint="Changes the order’s payment state. It does not create a payment record."
              >
                <SelectInput
                  id="order-payment-edit"
                  value={draft.paymentStatus}
                  disabled={saving}
                  onChange={event =>
                    setDraft(current => ({ ...current, paymentStatus: event.target.value }))
                  }
                >
                  {PAYMENT_STATUS_OPTIONS.map(option => (
                    <option key={option} value={option}>
                      {PAYMENT_LABEL[option]}
                    </option>
                  ))}
                </SelectInput>
              </Field>

              <Field id="order-tracking-id" label="Tracking number" hint="Leave empty to clear it.">
                <TextInput
                  id="order-tracking-id"
                  value={draft.trackingId}
                  disabled={saving}
                  placeholder="e.g. the courier’s consignment number"
                  onChange={event =>
                    setDraft(current => ({ ...current, trackingId: event.target.value }))
                  }
                />
              </Field>

              <Field id="order-tracking-url" label="Tracking link" error={urlError || undefined}>
                <TextInput
                  id="order-tracking-url"
                  type="url"
                  value={draft.trackingUrl}
                  invalid={Boolean(urlError)}
                  disabled={saving}
                  placeholder="https://"
                  onChange={event => {
                    setUrlError('');
                    setDraft(current => ({ ...current, trackingUrl: event.target.value }));
                  }}
                />
              </Field>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button type="button" onClick={save} disabled={saving || !dirty} className={ACTION}>
                {saving ? 'Saving' : 'Save changes'}
              </button>
              {dirty ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => adopt(order)}
                  className={ACTION_QUIET}
                >
                  Discard
                </button>
              ) : null}
              {order.trackingUrl ? (
                <a
                  href={order.trackingUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={cn(ACTION_QUIET, 'ml-auto')}
                >
                  Open the saved tracking link
                </a>
              ) : null}
            </div>
          </div>
        </section>
      </div>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className={cn(LABEL, 'w-[88px] shrink-0 pt-0.5')}>{label}</dt>
      <dd className="min-w-0 flex-1 text-[13px] break-words text-[var(--ds-ink)]">{children}</dd>
    </div>
  );
}

/** A fact that is absent, said in words rather than shown as a dash with no explanation. */
function Absent({ children }: { children: React.ReactNode }) {
  return <span className={META}>{children}</span>;
}

function Money({
  label,
  strong,
  children,
}: {
  label: string;
  strong?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={strong ? SECTION_TITLE : LABEL}>{label}</dt>
      <dd
        className={cn(
          'tabular-nums',
          strong
            ? 'text-[15px] font-semibold text-[var(--ds-ink)]'
            : 'text-[13px] text-[var(--ds-muted)]'
        )}
      >
        {children}
      </dd>
    </div>
  );
}
