'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import DataTable, { type Column } from '@/components/admin/DataTable';
import ScreenHead from '@/components/admin/ScreenHead';
import Notice from '@/components/admin/Notice';
import { SelectInput, TextInput } from '@/components/admin/Field';
import {
  ACTION,
  ACTION_QUIET,
  ACTION_SOFT,
  LABEL,
  META,
  SCREEN,
  badge,
} from '@/components/admin/styles';
import { cn } from '@/lib/utils';
import { request } from '@/lib/admin/api';
import {
  ORDER_STATUS_OPTIONS,
  ORDER_TYPE_OPTIONS,
  PAYMENT_LABEL,
  PAYMENT_STATUS_OPTIONS,
  PAYMENT_TONE,
  STATUS_LABEL,
  STATUS_TONE,
  TYPE_LABEL,
  channelOf,
  orderDate,
  rupees,
  shortRef,
  type OrderListResult,
  type OrderRow,
} from './shared';

const PER_PAGE = 20;

/**
 * Orders: everything the shop has sold, in one table.
 *
 * **Four filters, because an order has four independent facts about it** — who it is for, how
 * far along it is, whether the money arrived, and how it reached the shop. They are separate
 * selects rather than tabs: Enquiries has four states and tabs are right there, but these
 * combine (unpaid *and* shipped is the row that needs chasing) and sixty tabs is not a filter.
 *
 * **Nothing is edited here.** The reference opens the order, and every change — status,
 * payment, tracking — happens on the detail screen, where the lines and the address are in
 * view. An order is a record of an agreement; changing one from a table row, with none of it
 * on screen, is how the wrong order gets marked delivered.
 *
 * The search covers the reference and the customer, under either name: an account holder's
 * name lives on `Profile` and a guest's on the order itself, and whoever is searching has a
 * name off a WhatsApp message and does not know which. See `buildOrderWhere`.
 */
export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [type, setType] = useState('');

  const [loading, setLoading] = useState(true);
  const [notSetUp, setNotSetUp] = useState(false);
  const [failure, setFailure] = useState('');

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), perPage: String(PER_PAGE) });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (paymentStatus) params.set('paymentStatus', paymentStatus);
    if (type) params.set('type', type);

    // Aborted on cleanup, so a slow page-one answer cannot overwrite page two.
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      const answer = await request<OrderListResult>(`/api/admin/orders?${params}`, {
        signal: controller.signal,
      });
      if (answer.aborted) return;

      if (answer.ok && answer.data) {
        setOrders(answer.data.orders);
        setTotal(answer.data.total);
        setTotalPages(Math.max(1, answer.data.totalPages));
        setNotSetUp(false);
        setFailure('');
      } else {
        setOrders([]);
        setTotal(0);
        setTotalPages(1);
        setNotSetUp(answer.notSetUp);
        setFailure(answer.notSetUp ? '' : answer.message);
      }
      setLoading(false);
    };

    load();
    return () => controller.abort();
  }, [page, search, status, paymentStatus, type]);

  const filtered = Boolean(search || status || paymentStatus || type);

  const columns: Column<OrderRow>[] = [
    {
      key: 'ref',
      head: 'Order',
      className: 'w-[120px]',
      cell: order => (
        <>
          <Link
            href={`/dashboard/orders/${order.id}`}
            className="block font-medium tabular-nums text-[var(--ds-ink)] hover:underline"
          >
            {shortRef(order.id)}
          </Link>
          {/* The date rides under the reference where its own column is hidden, rather than
              being scrolled off the right edge. */}
          <span className={cn(META, 'block sm:hidden')}>{orderDate(order.createdAt)}</span>
        </>
      ),
    },
    {
      key: 'customer',
      head: 'Customer',
      wrap: true,
      className: 'min-w-[140px]',
      cell: order => (
        <>
          <span className="block max-w-full truncate text-[var(--ds-ink)]">
            {/* Never a placeholder name: an order with no customer name recorded says so. */}
            {order.customerName ?? <span className="text-[var(--ds-faint)]">Not recorded</span>}
          </span>
          <span className={cn(META, 'block')}>{channelOf(order)}</span>
        </>
      ),
    },
    {
      key: 'date',
      head: 'Date',
      className: 'hidden w-[120px] tabular-nums sm:table-cell',
      cell: order => (
        <span className="text-[var(--ds-faint)]">{orderDate(order.createdAt)}</span>
      ),
    },
    {
      key: 'items',
      head: 'Items',
      className: 'hidden w-[80px] text-right tabular-nums md:table-cell',
      cell: order => (
        <span
          className="text-[var(--ds-muted)]"
          // The two counts differ whenever a line has a quantity above one, and both are
          // useful: the cell shows garments, the title shows lines.
          title={`${order.lineCount} line${order.lineCount === 1 ? '' : 's'}`}
        >
          {order.itemCount}
        </span>
      ),
    },
    {
      key: 'total',
      head: 'Total',
      className: 'w-[110px] text-right',
      cell: order => (
        <span className="font-medium tabular-nums text-[var(--ds-ink)]">
          {rupees(order.totalAmount)}
        </span>
      ),
    },
    {
      key: 'status',
      head: 'Status',
      className: 'w-[140px]',
      cell: order => <span className={badge(STATUS_TONE[order.status])}>{STATUS_LABEL[order.status]}</span>,
    },
    {
      key: 'payment',
      head: 'Payment',
      className: 'w-[110px]',
      cell: order => (
        <span className={badge(PAYMENT_TONE[order.paymentStatus])}>
          {PAYMENT_LABEL[order.paymentStatus]}
        </span>
      ),
    },
    {
      key: 'actions',
      head: '',
      className: 'w-[80px] text-right',
      cell: order => (
        <Link href={`/dashboard/orders/${order.id}`} className={ACTION_QUIET}>
          Open
        </Link>
      ),
    },
  ];

  const from = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const to = Math.min(page * PER_PAGE, total);

  return (
    <div className={SCREEN}>
      <ScreenHead
        title="Orders"
        note="Website orders, quote requests and counter sales. Open one to change its status, record a payment or print an invoice."
        actions={
          <Link href="/dashboard/orders/new" className={ACTION}>
            <Plus size={15} strokeWidth={2} aria-hidden="true" />
            Record an offline order
          </Link>
        }
      />

      {notSetUp ? (
        <Notice label="Not set up yet">
          The orders tables are not in this database yet, so nothing can be listed. This screen
          fills itself once the migration has been applied.
        </Notice>
      ) : failure ? (
        <Notice label="Problem" tone="problem">
          {failure}
        </Notice>
      ) : (
        <DataTable
          columns={columns}
          rows={orders}
          rowKey={order => order.id}
          busy={loading}
          caption="Orders, newest first, with customer, total, status and payment state"
          toolbar={
            <>
              <form
                onSubmit={event => {
                  event.preventDefault();
                  setPage(1);
                  setSearch(searchInput.trim());
                }}
                className="flex flex-wrap items-end gap-2"
              >
                <div className="w-[200px] min-w-0 sm:w-[230px]">
                  <label htmlFor="order-search" className="sr-only">
                    Search orders
                  </label>
                  <div className="relative">
                    <Search
                      size={14}
                      strokeWidth={1.75}
                      aria-hidden="true"
                      className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[var(--ds-faint)]"
                    />
                    <TextInput
                      id="order-search"
                      type="search"
                      value={searchInput}
                      placeholder="Reference or customer"
                      onChange={event => setSearchInput(event.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <button type="submit" className={ACTION_SOFT}>
                  Search
                </button>
                {search ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput('');
                      setSearch('');
                      setPage(1);
                    }}
                    className={ACTION_QUIET}
                  >
                    Clear
                  </button>
                ) : null}
              </form>

              <div className="flex flex-wrap items-end gap-3">
                <div className="w-[150px]">
                  <label htmlFor="order-status" className={cn(LABEL, 'mb-1.5 block')}>
                    Status
                  </label>
                  <SelectInput
                    id="order-status"
                    value={status}
                    onChange={event => {
                      setPage(1);
                      setStatus(event.target.value);
                    }}
                  >
                    <option value="">Any status</option>
                    {ORDER_STATUS_OPTIONS.map(option => (
                      <option key={option} value={option}>
                        {STATUS_LABEL[option]}
                      </option>
                    ))}
                  </SelectInput>
                </div>

                <div className="w-[130px]">
                  <label htmlFor="order-payment" className={cn(LABEL, 'mb-1.5 block')}>
                    Payment
                  </label>
                  <SelectInput
                    id="order-payment"
                    value={paymentStatus}
                    onChange={event => {
                      setPage(1);
                      setPaymentStatus(event.target.value);
                    }}
                  >
                    <option value="">Any payment</option>
                    {PAYMENT_STATUS_OPTIONS.map(option => (
                      <option key={option} value={option}>
                        {PAYMENT_LABEL[option]}
                      </option>
                    ))}
                  </SelectInput>
                </div>

                <div className="w-[130px]">
                  <label htmlFor="order-type" className={cn(LABEL, 'mb-1.5 block')}>
                    Channel
                  </label>
                  <SelectInput
                    id="order-type"
                    value={type}
                    onChange={event => {
                      setPage(1);
                      setType(event.target.value);
                    }}
                  >
                    <option value="">Any channel</option>
                    {ORDER_TYPE_OPTIONS.map(option => (
                      <option key={option} value={option}>
                        {TYPE_LABEL[option]}
                      </option>
                    ))}
                  </SelectInput>
                </div>
              </div>
            </>
          }
          footer={
            <>
              <p className={LABEL}>{total === 0 ? 'No orders' : `${from}–${to} of ${total}`}</p>
              {totalPages > 1 ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage(value => Math.max(1, value - 1))}
                    className={ACTION_SOFT}
                  >
                    Previous
                  </button>
                  <span className={cn(LABEL, 'tabular-nums')}>
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages || loading}
                    onClick={() => setPage(value => Math.min(totalPages, value + 1))}
                    className={ACTION_SOFT}
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </>
          }
          empty={
            loading
              ? 'Reading the orders…'
              : filtered
                ? 'No order matches these filters.'
                : 'No orders yet. A website order appears here the moment it is placed, and a counter sale as soon as it is recorded.'
          }
        />
      )}
    </div>
  );
}
