'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { ImageOff, Plus, Search } from 'lucide-react';
import DataTable, { type Column } from '@/components/admin/DataTable';
import ScreenHead from '@/components/admin/ScreenHead';
import Notice from '@/components/admin/Notice';
import Toast, { type ToastMessage } from '@/components/admin/Toast';
import { SelectInput, TextInput } from '@/components/admin/Field';
import {
  ACTION,
  ACTION_GRAVE,
  ACTION_QUIET,
  ACTION_SOFT,
  LABEL,
  META,
  SCREEN,
  badge,
} from '@/components/admin/styles';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';
import ProductSheet, { draftFrom, emptyDraft, type Draft } from './product-sheet';
import DeleteSheet from './delete-sheet';

const PER_PAGE = 20;

/**
 * The sort menu, mapped onto the query `/api/products` already understands: `sortBy` is
 * `newest | name | price-low | price-high`, with `order` read only for `name`. One entry per
 * thing an admin actually wants, rather than one per parameter combination.
 */
const SORTS = [
  { value: 'newest', label: 'Newest first', sortBy: 'newest', order: 'desc' },
  { value: 'name-asc', label: 'Name A–Z', sortBy: 'name', order: 'asc' },
  { value: 'name-desc', label: 'Name Z–A', sortBy: 'name', order: 'desc' },
  { value: 'price-low', label: 'Price, lowest', sortBy: 'price-low', order: 'asc' },
  { value: 'price-high', label: 'Price, highest', sortBy: 'price-high', order: 'desc' },
] as const;

const rupees = (value: number) => `₹${value.toLocaleString('en-IN')}`;

/**
 * Products: the shop's catalogue as a working table.
 *
 * This replaces the product half of the old 1,220-line `dashboard-client.tsx` — the same
 * endpoints, a different screen. The filters live in the table's own toolbar and the paging in
 * its footer, so the catalogue is one object on the page rather than three stacked blocks.
 * Editing happens in a slide-over beside the table instead of a modal over it.
 *
 * Search, sort and paging are all one query against `/api/products`, so the list on screen is
 * always a server result and never a client-side filter of a stale page.
 */
export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState('');

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<string>('newest');
  const [reloads, setReloads] = useState(0);

  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [sheet, setSheet] = useState<{ mode: 'create' | 'edit'; id?: string } | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const reload = useCallback(() => setReloads(value => value + 1), []);

  useEffect(() => {
    const chosen = SORTS.find(option => option.value === sort) ?? SORTS[0];
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PER_PAGE),
      sortBy: chosen.sortBy,
      order: chosen.order,
    });
    if (search) params.set('search', search);

    // Aborted on cleanup, so a slow page-1 response cannot overwrite page 2.
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/products?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error(String(response.status));
        const data = await response.json();
        setProducts(data.products ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(Math.max(1, data.totalPages ?? 1));
        setFailure('');
      } catch {
        if (controller.signal.aborted) return;
        setProducts([]);
        setFailure('The catalogue could not be loaded. Check the database health and reload.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    load();

    return () => controller.abort();
  }, [page, search, sort, reloads]);

  const openCreate = () => {
    setDraft(emptyDraft());
    setSheet({ mode: 'create' });
  };

  const openEdit = (product: Product) => {
    setDraft(draftFrom(product));
    setSheet({ mode: 'edit', id: product.id });
  };

  const columns: Column<Product>[] = [
    {
      key: 'photo',
      head: '',
      className: 'w-[52px]',
      cell: product =>
        product.photos.length > 0 ? (
          <Image
            src={product.photos[0]}
            alt=""
            width={36}
            height={36}
            unoptimized
            className="h-9 w-9 rounded-md border border-slate-200 object-cover"
          />
        ) : (
          <span
            title="No photographs"
            aria-label="No photographs"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-400"
          >
            <ImageOff size={14} strokeWidth={1.75} aria-hidden="true" />
          </span>
        ),
    },
    {
      key: 'name',
      head: 'Product',
      wrap: true,
      className: 'min-w-[160px]',
      cell: product => (
        <>
          <button
            type="button"
            onClick={() => openEdit(product)}
            className="block max-w-full truncate text-left text-[13px] font-medium text-ink hover:underline"
          >
            {product.name}
          </button>
          {/* The category rides under the name where its own column is hidden, rather than
              being scrolled off the right edge with the actions. */}
          <span className={cn(META, 'block sm:hidden')}>{product.category}</span>
        </>
      ),
    },
    {
      key: 'category',
      head: 'Category',
      className: 'hidden sm:table-cell',
      cell: product => <span className="text-slate-600">{product.category}</span>,
    },
    {
      key: 'price',
      head: 'Price',
      className: 'text-right',
      cell: product =>
        product.sale && product.salePrice ? (
          <span className="inline-flex items-center justify-end gap-2 tabular-nums">
            <s className="text-slate-400">{rupees(product.price)}</s>
            <span className="font-medium text-ink">{rupees(product.salePrice)}</span>
            <span className={badge('danger')}>Sale</span>
          </span>
        ) : (
          <span className="tabular-nums">{rupees(product.price)}</span>
        ),
    },
    {
      key: 'photos',
      head: 'Photos',
      className: 'hidden text-right sm:table-cell',
      cell: product =>
        product.photos.length === 0 ? (
          <span className={badge('warn')}>None</span>
        ) : (
          <span className="tabular-nums text-slate-600">{product.photos.length}</span>
        ),
    },
    {
      key: 'actions',
      head: '',
      className: 'w-[120px] text-right',
      cell: product => (
        <span className="inline-flex items-center justify-end gap-1">
          <button type="button" onClick={() => openEdit(product)} className={ACTION_QUIET}>
            Edit
          </button>
          <button type="button" onClick={() => setDeleting(product)} className={ACTION_GRAVE}>
            Delete
          </button>
        </span>
      ),
    },
  ];

  const from = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const to = Math.min(page * PER_PAGE, total);

  return (
    <div className={SCREEN}>
      <ScreenHead
        title="Products"
        note="The shop's catalogue. A product goes live the moment it is saved."
        actions={
          <button type="button" onClick={openCreate} className={ACTION}>
            <Plus size={15} strokeWidth={2} aria-hidden="true" />
            Add a product
          </button>
        }
      />

      {failure ? (
        <Notice label="Problem" tone="problem">
          {failure}
        </Notice>
      ) : (
        <DataTable
          columns={columns}
          rows={products}
          rowKey={product => product.id}
          busy={loading}
          caption="Products, with thumbnail, category, price and photograph count"
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
                <div className="w-[200px] min-w-0 sm:w-[240px]">
                  <label htmlFor="product-search" className="sr-only">
                    Search products
                  </label>
                  <div className="relative">
                    <Search
                      size={14}
                      strokeWidth={1.75}
                      aria-hidden="true"
                      className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-slate-400"
                    />
                    <TextInput
                      id="product-search"
                      type="search"
                      value={searchInput}
                      placeholder="Name or specification"
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

              <div className="flex items-center gap-2">
                <label htmlFor="product-sort" className={cn(LABEL, 'shrink-0')}>
                  Sort
                </label>
                <SelectInput
                  id="product-sort"
                  value={sort}
                  onChange={event => {
                    setPage(1);
                    setSort(event.target.value);
                  }}
                  className="w-[160px]"
                >
                  {SORTS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectInput>
              </div>
            </>
          }
          footer={
            <>
              <p className={LABEL}>
                {total === 0 ? 'No products' : `${from}–${to} of ${total}`}
              </p>
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
              ? 'Loading the catalogue…'
              : search
                ? `Nothing matches “${search}”.`
                : 'The catalogue is empty. Add the first product.'
          }
        />
      )}

      <ProductSheet
        open={sheet !== null}
        mode={sheet?.mode ?? 'create'}
        productId={sheet?.id}
        draft={draft}
        onDraftChange={setDraft}
        onClose={() => setSheet(null)}
        onSaved={message => {
          setSheet(null);
          setToast({ text: message, tone: 'ok' });
          reload();
        }}
        onError={message => setToast({ text: message, tone: 'error' })}
      />

      <DeleteSheet
        product={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={message => {
          setDeleting(null);
          setToast({ text: message, tone: 'ok' });
          // A page that just lost its last row would otherwise show an empty table.
          setPage(value => (products.length === 1 && value > 1 ? value - 1 : value));
          reload();
        }}
        onError={message => setToast({ text: message, tone: 'error' })}
      />

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
