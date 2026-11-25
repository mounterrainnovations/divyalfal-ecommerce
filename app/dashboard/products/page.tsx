'use client';

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import {
  Archive as ArchiveIcon,
  ArchiveRestore,
  ImageOff,
  LayoutGrid,
  Plus,
  Rows3,
  Search,
} from 'lucide-react';
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
  CARD,
  CARD_BODY,
  CARD_HEAD,
  LABEL,
  META,
  SCREEN,
  badge,
} from '@/components/admin/styles';
import { request, send } from '@/lib/admin/api';
import { cn } from '@/lib/utils';
import ProductSheet, { draftFrom, emptyDraft, type Draft } from './product-sheet';
import DeleteSheet from './delete-sheet';
import ProductCard from './product-card';
import {
  ARCHIVED_FILTERS,
  CATEGORY_OPTIONS,
  buildProductQuery,
  describeShown,
  readView,
  serverView,
  storeView,
  subscribeToView,
  type AdminProduct,
  type ArchivedFilter,
  type Counts,
} from './catalogue';

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

interface ListResponse {
  products: AdminProduct[];
  total: number;
  totalPages: number;
  counts?: Counts;
}

/**
 * Products: the shop's catalogue as a working table, or as a grid of photographs.
 *
 * This replaces the product half of the old 1,220-line `dashboard-client.tsx` — the same
 * endpoints, a different screen. The filters live in the table's own toolbar and the paging in
 * its footer, so the catalogue is one object on the page rather than three stacked blocks.
 * Editing happens in a slide-over beside the table instead of a modal over it.
 *
 * Search, sort, category, the archive filter and paging are all one query against
 * `/api/products`, so the list on screen is always a server result and never a client-side
 * filter of a stale page. The view toggle is the one piece of state that is *not* in the
 * query: it changes how the same rows are drawn, not which rows they are.
 *
 * WHAT CHANGED, AND WHY IT MATTERED. `Product.isArchived` has been a real column in production
 * all along and this screen ignored it, which meant an archived garment sat in the table
 * looking exactly like a live one — the admin had no way to see, set or trust it. It now
 * defaults to showing live products, says in the header how many archived ones it is holding
 * back, badges them when they are shown, and offers Archive in place of reaching first for a
 * hard delete. That order matters: thirteen products are referenced by real orders through
 * `OrderItem`, so Delete can fail outright where Archive always works and is reversible.
 */
export default function ProductsPage() {
  // The term the top bar handed over, if it handed one over. What the screen does with it is
  // the note on `typed` and `submitted` below.
  const params = useSearchParams();
  const handed = params.get('q') ?? '';

  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Counts | undefined>(undefined);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState('');

  const [sort, setSort] = useState<string>('newest');
  const [category, setCategory] = useState('');
  const [archived, setArchived] = useState<ArchivedFilter>('live');
  const [reloads, setReloads] = useState(0);

  /**
   * The remembered view, read through React's own hook for state that lives outside it.
   *
   * `localStorage` cannot be read while the server renders this component, so the server
   * snapshot is the default and the browser's is whatever was stored; React reconciles the two
   * without a wasted render. (`catalogue.ts` holds the store, and the reason this is not
   * `useState` plus a mount effect.)
   */
  const view = useSyncExternalStore(subscribeToView, readView, serverView);

  /*
   * THE HEADER'S SEARCH, DERIVED RATHER THAN SYNCHRONISED.
   *
   * `?q=` is the portal's one cross-screen link: the search in the top bar submits here rather
   * than filtering a table it cannot see. The screen therefore has to honour the handed term
   * on arrival *and* on every later submission from the header, which re-pushes the same route
   * with a new query while this component is already mounted.
   *
   * The term and the text in the box are each stored **with the handed value they belong to**,
   * and read back only while that handed value still holds. So a new `?q=` takes effect by
   * derivation: there is no effect copying the URL into state, no render where the box shows
   * the previous search, and nothing to go wrong if the header pushes twice in a row. (The
   * same shape as the cursor in `lib/admin/media.ts`, for the same reason.)
   */
  const [typed, setTyped] = useState<{ handed: string; value: string } | null>(null);
  const searchInput = typed?.handed === handed ? typed.value : handed;

  const [submitted, setSubmitted] = useState<{ handed: string; term: string } | null>(null);
  const search = submitted?.handed === handed ? submitted.term : handed;

  /**
   * The page, stored with the query it belongs to.
   *
   * Every filter change has to return to page 1 — page 3 of a search with two results is an
   * empty table — and doing that with a `setPage(1)` in each of five handlers is five places
   * to forget. Keyed on the whole query instead, so a changed filter resets the page by
   * derivation and a new filter cannot be added without one.
   */
  const queryKey = `${handed}|${search}|${category}|${archived}|${sort}`;
  const [paging, setPaging] = useState<{ key: string; page: number }>({ key: queryKey, page: 1 });
  const page = paging.key === queryKey ? paging.page : 1;
  const setPage = (next: number) => setPaging({ key: queryKey, page: Math.max(1, next) });

  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [sheet, setSheet] = useState<{ mode: 'create' | 'edit'; id?: string } | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [deleting, setDeleting] = useState<AdminProduct | null>(null);
  /** The product whose archive state is being written, so its buttons can be disabled. */
  const [archiving, setArchiving] = useState<string | null>(null);

  const reload = useCallback(() => setReloads(value => value + 1), []);

  useEffect(() => {
    const chosen = SORTS.find(option => option.value === sort) ?? SORTS[0];
    const query = buildProductQuery({
      page,
      perPage: PER_PAGE,
      sortBy: chosen.sortBy,
      order: chosen.order,
      search,
      category,
      archived,
    });

    // Aborted on cleanup, so a slow page-1 response cannot overwrite page 2.
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      const answer = await request<ListResponse>(`/api/products?${query}`, {
        signal: controller.signal,
      });
      // A superseded request has no result to render and no failure to report.
      if (answer.aborted) return;

      if (answer.ok && answer.data) {
        setProducts(answer.data.products ?? []);
        setTotal(answer.data.total ?? 0);
        setCounts(answer.data.counts);
        setTotalPages(Math.max(1, answer.data.totalPages ?? 1));
        setFailure('');
      } else {
        setProducts([]);
        setCounts(undefined);
        setFailure(
          answer.message || 'The catalogue could not be loaded. Check the database health and reload.'
        );
      }
      setLoading(false);
    };
    load();

    return () => controller.abort();
  }, [page, search, sort, category, archived, reloads]);

  const openCreate = () => {
    setDraft(emptyDraft());
    setSheet({ mode: 'create' });
  };

  const openEdit = (product: AdminProduct) => {
    setDraft(draftFrom(product));
    setSheet({ mode: 'edit', id: product.id });
  };

  /**
   * Archive or restore, from either view.
   *
   * ONE PATCH, NO CONFIRMATION. Archiving is reversible and visible — the product reappears
   * under "Archived only" with a badge on it — so a confirmation sheet would be a dialog
   * guarding a reversible act, which teaches an admin to click through dialogs. The hard
   * delete keeps its typed-name confirmation, because that one cannot be undone.
   *
   * The list is reloaded rather than patched in place: while the filter is "Live products" the
   * archived row must *leave* the list, and the header's counts have to move with it. The
   * toast is what tells the admin where the row went.
   */
  async function toggleArchive(product: AdminProduct) {
    const archive = product.isArchived !== true;
    setArchiving(product.id);
    const answer = await send(`/api/products/${product.id}`, 'PATCH', { isArchived: archive });
    setArchiving(null);

    if (!answer.ok) {
      setToast({
        text: answer.message || `“${product.name}” could not be ${archive ? 'archived' : 'restored'}.`,
        tone: 'error',
      });
      return;
    }

    setToast({
      text: archive
        ? `“${product.name}” was archived and is no longer on the shop. Restore it from the Archived filter.`
        : `“${product.name}” is live on the shop again.`,
      tone: 'ok',
    });
    // A page that just lost its last row would otherwise show an empty list.
    if (products.length === 1 && page > 1) setPage(page - 1);
    reload();
  }

  const columns: Column<AdminProduct>[] = [
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
            className="h-9 w-9 rounded-md border border-[var(--ds-line)] object-cover"
          />
        ) : (
          <span
            title="No photographs"
            aria-label="No photographs"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--ds-line)] bg-[var(--ds-surface-sunk)] text-[var(--ds-faint)]"
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
          <span className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => openEdit(product)}
              className="block max-w-full truncate text-left text-[13px] font-medium text-[var(--ds-ink)] hover:underline"
            >
              {product.name}
            </button>
            {/* Beside the name rather than in a column of its own: with "Live and archived"
                selected this is the one fact that changes how every other cell should be
                read, and a status column is the first thing to scroll off a narrow screen. */}
            {product.isArchived === true ? (
              <span className={cn(badge('neutral'), 'shrink-0')}>Archived</span>
            ) : null}
          </span>
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
      cell: product => <span className="text-[var(--ds-muted)]">{product.category}</span>,
    },
    {
      key: 'price',
      head: 'Price',
      className: 'text-right',
      cell: product =>
        product.sale && product.salePrice ? (
          <span className="inline-flex items-center justify-end gap-2 tabular-nums">
            <s className="text-[var(--ds-faint)]">{rupees(product.price)}</s>
            <span className="font-medium text-[var(--ds-ink)]">{rupees(product.salePrice)}</span>
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
          <span className="tabular-nums text-[var(--ds-muted)]">{product.photos.length}</span>
        ),
    },
    {
      key: 'actions',
      head: '',
      className: 'w-[200px] text-right',
      cell: product => (
        <span className="inline-flex items-center justify-end gap-1">
          <button type="button" onClick={() => openEdit(product)} className={ACTION_QUIET}>
            Edit
          </button>
          <button
            type="button"
            disabled={archiving === product.id}
            onClick={() => toggleArchive(product)}
            className={ACTION_QUIET}
          >
            {product.isArchived === true ? (
              <ArchiveRestore size={14} strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <ArchiveIcon size={14} strokeWidth={1.75} aria-hidden="true" />
            )}
            {product.isArchived === true ? 'Restore' : 'Archive'}
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

  /** What the header says it is showing — the one place the hidden rows are admitted to. */
  const summary = useMemo(
    () =>
      describeShown({
        shown: total,
        counts,
        archived,
        filtered: Boolean(search) || category !== '',
      }),
    [total, counts, archived, search, category]
  );

  const emptyLine = loading
    ? 'Loading the catalogue…'
    : search
      ? `Nothing matches “${search}”.`
      : category || archived !== 'live'
        ? 'Nothing matches these filters.'
        : 'The catalogue is empty. Add the first product.';

  const toggleClass = (on: boolean) =>
    cn(ACTION_SOFT, on && 'border-[var(--ds-ink)] text-[var(--ds-ink)]');

  /**
   * The filters, built once and handed to whichever view is on screen. The table puts them in
   * its own card header; the grid gets the same strip above it, so switching view moves the
   * photographs and leaves the controls exactly where the hand left them.
   */
  const toolbar = (
    <>
      <form
        onSubmit={event => {
          event.preventDefault();
          setSubmitted({ handed, term: searchInput.trim() });
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
              className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[var(--ds-faint)]"
            />
            <TextInput
              id="product-search"
              type="search"
              value={searchInput}
              placeholder="Name or specification"
              onChange={event => setTyped({ handed, value: event.target.value })}
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
              setTyped({ handed, value: '' });
              setSubmitted({ handed, term: '' });
            }}
            className={ACTION_QUIET}
          >
            Clear
          </button>
        ) : null}
      </form>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex items-center gap-2">
          <label htmlFor="product-category" className={cn(LABEL, 'shrink-0')}>
            Category
          </label>
          <SelectInput
            id="product-category"
            value={category}
            onChange={event => {
              setCategory(event.target.value);
            }}
            className="w-[150px]"
          >
            <option value="">Every category</option>
            {CATEGORY_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectInput>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="product-archived" className={cn(LABEL, 'shrink-0')}>
            Showing
          </label>
          <SelectInput
            id="product-archived"
            value={archived}
            onChange={event => {
              setArchived(event.target.value as ArchivedFilter);
            }}
            className="w-[160px]"
          >
            {ARCHIVED_FILTERS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectInput>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="product-sort" className={cn(LABEL, 'shrink-0')}>
            Sort
          </label>
          <SelectInput
            id="product-sort"
            value={sort}
            onChange={event => {
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
      </div>
    </>
  );

  const footer = (
    <>
      <p className={LABEL}>{total === 0 ? 'No products' : `${from}–${to} of ${total}`}</p>
      {totalPages > 1 ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage(page - 1)}
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
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            className={ACTION_SOFT}
          >
            Next
          </button>
        </div>
      ) : null}
    </>
  );

  return (
    <div className={SCREEN}>
      <ScreenHead
        title="Products"
        note={loading && products.length === 0 ? 'Loading the catalogue…' : summary}
        actions={
          <>
            {/* A pair of buttons rather than a select: there are two states and the icons say
                which is which at a glance. `aria-pressed` is what carries that to a screen
                reader, where the ink border cannot. */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-pressed={view === 'table'}
                onClick={() => storeView('table')}
                className={toggleClass(view === 'table')}
              >
                <Rows3 size={15} strokeWidth={1.75} aria-hidden="true" />
                Table
              </button>
              <button
                type="button"
                aria-pressed={view === 'grid'}
                onClick={() => storeView('grid')}
                className={toggleClass(view === 'grid')}
              >
                <LayoutGrid size={15} strokeWidth={1.75} aria-hidden="true" />
                Grid
              </button>
            </div>

            <button type="button" onClick={openCreate} className={ACTION}>
              <Plus size={15} strokeWidth={2} aria-hidden="true" />
              Add a product
            </button>
          </>
        }
      />

      {failure ? (
        <Notice label="Problem" tone="problem">
          {failure}
        </Notice>
      ) : view === 'table' ? (
        <DataTable
          columns={columns}
          rows={products}
          rowKey={product => product.id}
          busy={loading}
          caption="Products, with thumbnail, category, price, photograph count and archive state"
          toolbar={toolbar}
          footer={footer}
          empty={emptyLine}
        />
      ) : (
        <div className={CARD}>
          <div className={CARD_HEAD}>{toolbar}</div>

          {products.length === 0 ? (
            <div className="px-4 py-12 text-center text-[13px] text-[var(--ds-faint)]">
              {emptyLine}
            </div>
          ) : (
            <div
              aria-busy={loading || undefined}
              className={cn(
                CARD_BODY,
                'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
                loading && 'opacity-60 transition-opacity motion-reduce:transition-none'
              )}
            >
              {products.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onEdit={openEdit}
                  onArchive={toggleArchive}
                  onDelete={setDeleting}
                />
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-[var(--ds-line)] px-4 py-2.5">
            {footer}
          </div>
        </div>
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
          if (products.length === 1 && page > 1) setPage(page - 1);
          reload();
        }}
        onError={message => setToast({ text: message, tone: 'error' })}
      />

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
