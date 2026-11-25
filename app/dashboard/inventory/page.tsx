'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { ImageOff, Plus, Search } from 'lucide-react';
import DataTable, { type Column } from '@/components/admin/DataTable';
import ScreenHead from '@/components/admin/ScreenHead';
import Notice, { NotSetUp } from '@/components/admin/Notice';
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
  FIGURE,
  LABEL,
  META,
  SCREEN,
  SECTION_TITLE,
  badge,
} from '@/components/admin/styles';
import { request, send } from '@/lib/admin/api';
import { cn } from '@/lib/utils';
import {
  LOW_STOCK_AT,
  STOCK_FILTERS,
  STOCK_LABEL,
  describeProductStock,
  filterVariants,
  isPending,
  pendingStockEdits,
  productStock,
  productsWithoutSizes,
  stockState,
  stockTone,
  totals as sumTotals,
  type InventoryResponse,
  type ProductRef,
  type StockFilter,
  type VariantRow,
} from './stock';
import VariantSheet, {
  RemoveSizeSheet,
  draftFor,
  emptyDraft,
  type VariantDraft,
} from './variant-sheet';

/**
 * Stock: every size the shop has recorded, and — just as prominently — every garment for which
 * it has recorded none.
 *
 * WHAT THIS SCREEN IS ACTUALLY ABOUT. `ProductVariant` holds eight rows covering two of the
 * fifteen products. The other thirteen garments have no sizes in the database at all, and the
 * single most important thing this screen does is refuse to render that as "0 in stock". A
 * stock figure of zero is a claim about the shop — nothing left on the rail — and thirteen
 * false claims of that kind is a screen that would send someone to reorder garments that are
 * hanging up in the shop. So the table lists what is recorded, the section beneath it lists
 * what is not, and the totals at the top count the two separately.
 *
 * WHY STOCK IS EDITED IN THE ROW. Correcting stock is the thing an admin comes here to do, it
 * is one number, and it is done several at a time while walking a rail. Typed values are held
 * until they are saved and every changed row says "Unsaved" — a batch save whose contents you
 * cannot see is worse than six separate saves. "Save all" sends them in one transaction, so a
 * failure leaves every number as it was rather than three of six corrected.
 *
 * Everything else — adding a size, renaming one, removing one — is in a sheet, because those
 * change what an order would record rather than how many of a thing there are.
 */
export default function InventoryPage() {
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [products, setProducts] = useState<ProductRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState('');
  const [notSetUp, setNotSetUp] = useState(false);
  const [reloads, setReloads] = useState(0);

  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [query, setQuery] = useState('');

  /** Typed stock values, keyed by variant id, until they are saved. */
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [sheet, setSheet] = useState<{ mode: 'create' | 'edit'; id?: string } | null>(null);
  const [draft, setDraft] = useState<VariantDraft>(emptyDraft);
  const [removing, setRemoving] = useState<VariantRow | null>(null);

  const reload = useCallback(() => setReloads(value => value + 1), []);
  const say = (text: string, tone: 'ok' | 'error') => setToast({ text, tone });

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      const answer = await request<InventoryResponse>('/api/admin/inventory', {
        signal: controller.signal,
      });
      if (answer.aborted) return;

      if (answer.ok && answer.data) {
        setVariants(answer.data.variants ?? []);
        setProducts(answer.data.products ?? []);
        setFailure('');
        setNotSetUp(false);
        // A reload is the moment the screen and the database agree again, so the typed values
        // are dropped: keeping them would leave "Unsaved" marks measured against numbers that
        // have since changed under them.
        setEdits({});
      } else {
        setNotSetUp(answer.notSetUp);
        setFailure(answer.notSetUp ? '' : answer.message || 'Stock could not be loaded.');
      }
      setLoading(false);
    };
    load();

    return () => controller.abort();
  }, [reloads]);

  const shown = useMemo(
    () => filterVariants(variants, { stock: stockFilter, search: query }),
    [variants, stockFilter, query]
  );

  const uncovered = useMemo(() => productsWithoutSizes(products, variants), [products, variants]);
  const figures = useMemo(() => sumTotals(products, variants), [products, variants]);
  const unsaved = useMemo(() => pendingStockEdits(variants, edits), [variants, edits]);

  function typeStock(id: string, value: string) {
    setEdits(current => ({ ...current, [id]: value }));
  }

  /** Save one row's typed stock. The row's own button, for the common single correction. */
  async function saveOne(variant: VariantRow) {
    const typed = edits[variant.id];
    if (!isPending(variant, typed)) return;
    setSaving(true);
    const answer = await send('/api/admin/inventory', 'PATCH', {
      id: variant.id,
      stock: Number(typed),
    });
    setSaving(false);

    if (!answer.ok) {
      say(answer.message || 'That stock figure could not be saved.', 'error');
      return;
    }
    say(`${variant.product?.name ?? 'Stock'} — size ${variant.size} is now ${Number(typed)}.`, 'ok');
    reload();
  }

  /** Save every typed change in one transaction. */
  async function saveAll() {
    if (unsaved.length === 0) return;
    setSaving(true);
    const answer = await send<{ updated: number }>('/api/admin/inventory', 'PATCH', {
      updates: unsaved,
    });
    setSaving(false);

    if (!answer.ok) {
      say(answer.message || 'The stock changes could not be saved.', 'error');
      return;
    }
    const count = answer.data?.updated ?? unsaved.length;
    say(`${count} ${count === 1 ? 'size was' : 'sizes were'} updated.`, 'ok');
    reload();
  }

  const openAdd = (productId = '') => {
    setDraft(emptyDraft(productId));
    setSheet({ mode: 'create' });
  };

  const openEdit = (variant: VariantRow) => {
    setDraft(draftFor(variant));
    setSheet({ mode: 'edit', id: variant.id });
  };

  const columns: Column<VariantRow>[] = [
    {
      key: 'product',
      head: 'Product',
      wrap: true,
      className: 'min-w-[200px]',
      cell: variant => (
        <span className="flex min-w-0 items-center gap-2.5">
          {variant.product?.photo ? (
            <Image
              src={variant.product.photo}
              alt=""
              width={36}
              height={36}
              unoptimized
              className="h-9 w-9 shrink-0 rounded-md border border-[var(--ds-line)] object-cover"
            />
          ) : (
            <span
              title="No photographs"
              aria-label="No photographs"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--ds-line)] bg-[var(--ds-surface-sunk)] text-[var(--ds-faint)]"
            >
              <ImageOff size={14} strokeWidth={1.75} aria-hidden="true" />
            </span>
          )}
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-medium text-[var(--ds-ink)]">
              {variant.product?.name ?? 'Unknown product'}
            </span>
            {variant.product?.isArchived ? (
              <span className={cn(badge('neutral'), 'mt-0.5')}>Archived product</span>
            ) : null}
          </span>
        </span>
      ),
    },
    {
      key: 'size',
      head: 'Size',
      className: 'w-[90px]',
      cell: variant => (
        <span className="font-medium text-[var(--ds-ink)]">{variant.size}</span>
      ),
    },
    {
      key: 'color',
      head: 'Colour',
      className: 'hidden w-[120px] sm:table-cell',
      cell: variant =>
        variant.color ? (
          <span>{variant.color}</span>
        ) : (
          // An em dash, not "—none—" and not blank: the column has a value for most rows and
          // a reader needs to see that this one is genuinely empty rather than cut off.
          <span className={META} title="No colour recorded for this size">
            —
          </span>
        ),
    },
    {
      key: 'stock',
      head: 'Units',
      className: 'w-[210px]',
      cell: variant => {
        const typed = edits[variant.id] ?? String(variant.stock);
        const pending = isPending(variant, edits[variant.id]);
        return (
          <span className="flex items-center gap-2">
            <label htmlFor={`stock-${variant.id}`} className="sr-only">
              Units of {variant.product?.name ?? 'product'} in size {variant.size}
            </label>
            <TextInput
              id={`stock-${variant.id}`}
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={typed}
              disabled={saving}
              onChange={event => typeStock(variant.id, event.target.value)}
              className="w-[84px] tabular-nums"
            />
            {pending ? (
              <>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => saveOne(variant)}
                  className={ACTION_QUIET}
                >
                  Save
                </button>
                <span className={badge('accent')}>Unsaved</span>
              </>
            ) : null}
          </span>
        );
      },
    },
    {
      key: 'state',
      head: 'State',
      className: 'w-[120px]',
      cell: variant => {
        const state = stockState(variant.stock);
        return <span className={badge(stockTone(state))}>{STOCK_LABEL[state]}</span>;
      },
    },
    {
      key: 'actions',
      head: '',
      className: 'w-[140px] text-right',
      cell: variant => (
        <span className="inline-flex items-center justify-end gap-1">
          <button type="button" onClick={() => openEdit(variant)} className={ACTION_QUIET}>
            Edit
          </button>
          <button type="button" onClick={() => setRemoving(variant)} className={ACTION_GRAVE}>
            Remove
          </button>
        </span>
      ),
    },
  ];

  return (
    <div className={SCREEN}>
      <ScreenHead
        title="Stock"
        note={
          loading && variants.length === 0
            ? 'Loading stock…'
            : `${figures.variantsTracked} sizes tracked across ${figures.productsCovered} of ${figures.productsAll} products · ${figures.withoutSizes} with no sizes set up`
        }
        actions={
          <>
            {unsaved.length > 0 ? (
              <button type="button" disabled={saving} onClick={saveAll} className={ACTION_SOFT}>
                {saving
                  ? 'Saving'
                  : `Save ${unsaved.length} change${unsaved.length === 1 ? '' : 's'}`}
              </button>
            ) : null}
            <button type="button" onClick={() => openAdd()} className={ACTION}>
              <Plus size={15} strokeWidth={2} aria-hidden="true" />
              Add a size
            </button>
          </>
        }
      />

      {notSetUp ? (
        <NotSetUp
          message="Stock is recorded against product sizes, and that table is not in this database yet."
          what="stock cannot be shown or edited."
        />
      ) : failure ? (
        <Notice label="Problem" tone="problem">
          {failure}
        </Notice>
      ) : (
        <div className="space-y-5">
          {/* The four figures, and the fourth is the point: "no sizes set up" sits beside
              "out of stock" so the gap in the data is as visible as the shortage on the rail. */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Sizes tracked" value={figures.variantsTracked} />
            <Stat
              label="Products covered"
              value={`${figures.productsCovered} of ${figures.productsAll}`}
            />
            <Stat label="Units in stock" value={figures.unitsInStock} />
            <Stat
              label="Out of stock"
              value={figures.outOfStock}
              note={
                figures.withoutSizes > 0
                  ? `${figures.withoutSizes} more have no sizes set up — stock unknown, not zero`
                  : undefined
              }
            />
          </div>

          <DataTable
            columns={columns}
            rows={shown}
            rowKey={variant => variant.id}
            busy={loading || saving}
            caption="Product sizes, with colour, units in stock and stock state"
            toolbar={
              <>
                <div className="w-[200px] min-w-0 sm:w-[240px]">
                  <label htmlFor="stock-search" className="sr-only">
                    Search sizes
                  </label>
                  <div className="relative">
                    <Search
                      size={14}
                      strokeWidth={1.75}
                      aria-hidden="true"
                      className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[var(--ds-faint)]"
                    />
                    <TextInput
                      id="stock-search"
                      type="search"
                      value={query}
                      placeholder="Product, size or colour"
                      onChange={event => setQuery(event.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor="stock-state" className={cn(LABEL, 'shrink-0')}>
                    Showing
                  </label>
                  <SelectInput
                    id="stock-state"
                    value={stockFilter}
                    onChange={event => setStockFilter(event.target.value as StockFilter)}
                    className="w-[190px]"
                  >
                    {STOCK_FILTERS.map(option => (
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
                  {shown.length === variants.length
                    ? `${variants.length} ${variants.length === 1 ? 'size' : 'sizes'}`
                    : `${shown.length} of ${variants.length} sizes`}
                </p>
                <p className={META}>Low means {LOW_STOCK_AT} or fewer units left</p>
              </>
            }
            empty={
              loading
                ? 'Loading stock…'
                : variants.length === 0
                  ? 'No sizes have been recorded for any product yet.'
                  : 'No sizes match these filters.'
            }
          />

          {/* ---------------------------------------------------------------------------- */}
          {/* The thirteen products the table above cannot say anything about.             */}
          {/* ---------------------------------------------------------------------------- */}
          <div className={CARD}>
            <div className={CARD_HEAD}>
              <div className="min-w-0">
                <h2 className={SECTION_TITLE}>Products with no sizes set up</h2>
                <p className={cn(META, 'mt-0.5 max-w-[68ch]')}>
                  Stock for these garments is <strong>unknown, not zero</strong> — no sizes have
                  ever been recorded against them, so nothing here can say whether the shop has
                  one. Adding the first size is what starts counting.
                </p>
              </div>
              <span className={badge(uncovered.length > 0 ? 'warn' : 'success')}>
                {uncovered.length} of {figures.productsAll}
              </span>
            </div>

            {uncovered.length === 0 ? (
              <div className={cn(CARD_BODY, 'text-center text-[13px] text-[var(--ds-faint)]')}>
                {loading
                  ? 'Loading the catalogue…'
                  : 'Every product has at least one size recorded.'}
              </div>
            ) : (
              <ul className="divide-y divide-[var(--ds-line)]">
                {uncovered.map(product => (
                  <li
                    key={product.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3"
                  >
                    {product.photo ? (
                      <Image
                        src={product.photo}
                        alt=""
                        width={36}
                        height={36}
                        unoptimized
                        className="h-9 w-9 shrink-0 rounded-md border border-[var(--ds-line)] object-cover"
                      />
                    ) : (
                      <span
                        title="No photographs"
                        aria-label="No photographs"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--ds-line)] bg-[var(--ds-surface-sunk)] text-[var(--ds-faint)]"
                      >
                        <ImageOff size={14} strokeWidth={1.75} aria-hidden="true" />
                      </span>
                    )}

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-[var(--ds-ink)]">
                        {product.name}
                      </span>
                      <span className={cn(META, 'block')}>
                        {describeProductStock(productStock(product.id, variants))}
                        {product.isArchived ? ' · archived' : ''}
                      </span>
                    </span>

                    <span className={cn(badge('warn'), 'shrink-0')}>Stock unknown</span>

                    <button
                      type="button"
                      onClick={() => openAdd(product.id)}
                      className={ACTION_SOFT}
                    >
                      <Plus size={15} strokeWidth={2} aria-hidden="true" />
                      Add the first size
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <VariantSheet
        open={sheet !== null}
        mode={sheet?.mode ?? 'create'}
        variantId={sheet?.id}
        products={products}
        draft={draft}
        onDraftChange={setDraft}
        onClose={() => setSheet(null)}
        onSaved={message => {
          setSheet(null);
          say(message, 'ok');
          reload();
        }}
        onError={message => say(message, 'error')}
      />

      <RemoveSizeSheet
        variant={removing}
        onClose={() => setRemoving(null)}
        onRemoved={message => {
          setRemoving(null);
          say(message, 'ok');
          reload();
        }}
      />

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

/**
 * One figure at the top of the screen. `note` is the honest footnote under a count that would
 * otherwise be read as the whole story — "6 out of stock" beside "9 more have no sizes set up".
 */
function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: number | string;
  note?: string;
}) {
  return (
    <div className={cn(CARD, 'px-5 py-4')}>
      <p className={cn(LABEL, 'truncate')}>{label}</p>
      <p className={cn(FIGURE, 'mt-2')}>{value}</p>
      {note ? <p className={cn(META, 'mt-2')}>{note}</p> : null}
    </div>
  );
}
