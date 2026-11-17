'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import DataTable, { type Column } from '@/components/admin/DataTable';
import ScreenHead from '@/components/admin/ScreenHead';
import Toast, { type ToastMessage } from '@/components/admin/Toast';
import { SelectInput, TextInput } from '@/components/admin/Field';
import { ACTION, ACTION_GRAVE, ACTION_QUIET, LABEL, RULE } from '@/components/admin/styles';
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
 * endpoints, a different screen. Rows are 36px and one line each, the thumbnail is in the
 * row rather than in a card, and editing happens in a slide-over beside the table instead of
 * a modal over it. Search, sort and paging are all one query against `/api/products`, so the
 * list on screen is always a server result and never a client-side filter of a stale page.
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
      className: 'w-10',
      cell: product =>
        product.photos.length > 0 ? (
          <Image
            src={product.photos[0]}
            alt=""
            width={32}
            height={32}
            unoptimized
            className="h-8 w-8 object-cover"
          />
        ) : (
          <span
            title="No photographs"
            aria-label="No photographs"
            className={cn(
              'flex h-8 w-8 items-center justify-center border bg-paper-deep font-ui text-eyebrow text-ink-soft',
              RULE
            )}
          >
            —
          </span>
        ),
    },
    {
      key: 'name',
      head: 'Name',
      wrap: true,
      className: 'min-w-[120px] sm:min-w-[160px]',
      cell: product => (
        <button type="button" onClick={() => openEdit(product)} className="text-left hover:underline hover:decoration-gold">
          {product.name}
        </button>
      ),
    },
    {
      key: 'category',
      head: 'Category',
      className: 'hidden sm:table-cell',
      cell: product => <span className="text-ink-soft">{product.category}</span>,
    },
    {
      key: 'price',
      head: 'Price',
      className: 'text-right tabular-nums',
      cell: product =>
        product.sale && product.salePrice ? (
          <span>
            <span className="text-sale">{rupees(product.salePrice)}</span>{' '}
            <s className="text-ink-soft">{rupees(product.price)}</s>
          </span>
        ) : (
          rupees(product.price)
        ),
    },
    {
      key: 'photos',
      head: 'Photos',
      className: 'hidden text-right tabular-nums sm:table-cell',
      cell: product => (
        <span className={product.photos.length === 0 ? 'text-sale' : undefined}>
          {product.photos.length}
        </span>
      ),
    },
    {
      key: 'actions',
      head: '',
      className: 'text-right',
      cell: product => (
        <span className="inline-flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-4">
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
    <div className="max-w-[1120px] px-[var(--gutter)] py-6">
      <ScreenHead
        eyebrow="Portal"
        title="Products"
        actions={
          <button type="button" onClick={openCreate} className={ACTION}>
            Add a product
          </button>
        }
      />

      <form
        onSubmit={event => {
          event.preventDefault();
          setPage(1);
          setSearch(searchInput.trim());
        }}
        className="mb-5 flex flex-wrap items-end gap-x-6 gap-y-4"
      >
        <div className="min-w-0 max-w-[320px] flex-1 basis-[200px]">
          <label htmlFor="product-search" className={cn(LABEL, 'mb-1 block')}>
            Search
          </label>
          <TextInput
            id="product-search"
            type="search"
            value={searchInput}
            placeholder="Name or specification"
            onChange={event => setSearchInput(event.target.value)}
          />
        </div>

        <div className="w-[160px]">
          <label htmlFor="product-sort" className={cn(LABEL, 'mb-1 block')}>
            Sort
          </label>
          <SelectInput
            id="product-sort"
            value={sort}
            onChange={event => {
              setPage(1);
              setSort(event.target.value);
            }}
          >
            {SORTS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectInput>
        </div>

        <button type="submit" className={cn(ACTION, 'mb-1.5')}>
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
            className={cn(ACTION_QUIET, 'mb-1.5')}
          >
            Clear
          </button>
        ) : null}
      </form>

      {failure ? (
        <p className={cn('border-t py-6 font-ui text-caption text-sale', RULE)}>{failure}</p>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={products}
            rowKey={product => product.id}
            busy={loading}
            caption="Products, with thumbnail, category, price and photograph count"
            empty={
              loading
                ? 'Loading the catalogue…'
                : search
                  ? `Nothing matches “${search}”.`
                  : 'The catalogue is empty. Add the first product.'
            }
          />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <p className={LABEL}>
              {total === 0 ? 'No products' : `${from}–${to} of ${total}`}
            </p>
            {totalPages > 1 ? (
              <div className="flex items-center gap-6">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage(value => Math.max(1, value - 1))}
                  className={ACTION_QUIET}
                >
                  Previous
                </button>
                <span className={LABEL}>
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage(value => Math.min(totalPages, value + 1))}
                  className={ACTION_QUIET}
                >
                  Next
                </button>
              </div>
            ) : null}
          </div>
        </>
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
