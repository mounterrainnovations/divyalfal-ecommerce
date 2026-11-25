'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { ArrowDown, ArrowUp, Search, Trash2 } from 'lucide-react';
import Sheet from '@/components/admin/Sheet';
import { TextInput } from '@/components/admin/Field';
import {
  ACTION,
  ACTION_GRAVE,
  ACTION_QUIET,
  ACTION_SOFT,
  FOCUS,
  LABEL,
  META,
  badge,
} from '@/components/admin/styles';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/utils/price';

/** The garment as the picker needs it: what `GET /api/admin/collections` sends. */
export interface PickerProduct {
  id: string;
  name: string;
  /** The first photograph, or '' where the garment has none. */
  image: string;
  price: number;
  category: string;
}

/**
 * Hand-pick the garments a collection holds, in the order its page lists them.
 *
 * HOW THIS DIFFERS FROM `app/dashboard/homepage/product-picker.tsx`, WHICH IT IS MODELLED ON.
 * There, an empty selection means "fall back to the automatic query" and is a legitimate
 * resting state. Here it means an empty page on the public site, because a collection *is*
 * its selection — there is no query behind it to fall back to. So this sheet never offers a
 * "clear the selection" button as a neutral action, and the screen behind it warns about a
 * visible collection with nothing in it.
 *
 * IT HAS A SEARCH BOX AND THAT ONE CANNOT. The homepage picker chooses four garments out of a
 * list the owner scrolls; a collection is eleven garments out of a whole catalogue, and
 * scrolling two hundred rows to find the second ivory lehenga is not curation, it is a chore.
 * Search filters the catalogue only — the chosen list above it always stays whole, because
 * hiding part of an ordered selection while its Up and Down buttons still move things around
 * is how an owner reorders a collection they cannot see.
 *
 * ORDER MATTERS, which is why the chosen garments are a list with Up and Down rather than a
 * set of checkboxes: the first garment is the one that opens the collection's page.
 */
export default function ProductPicker({
  label,
  products,
  chosen,
  onChange,
  onClose,
}: {
  /** The collection's name, for the sheet's heading. */
  label: string;
  products: PickerProduct[];
  chosen: string[];
  onChange: (productIds: string[]) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');

  const byId = useMemo(() => new Map(products.map(product => [product.id, product])), [products]);

  /*
   * The chosen list is filtered against the catalogue, so a garment that has been deleted
   * since the collection was curated simply stops being offered. It is still in `chosen`
   * until the owner saves — this screen does not quietly rewrite a selection it was only
   * asked to display — but it cannot be reordered or counted, because there is nothing left
   * to show for it.
   */
  const picked = chosen.filter(id => byId.has(id));
  const missing = chosen.length - picked.length;

  const needle = query.trim().toLowerCase();
  const rest = products.filter(product => {
    if (picked.includes(product.id)) return false;
    if (!needle) return true;
    return (
      product.name.toLowerCase().includes(needle) || product.category.toLowerCase().includes(needle)
    );
  });

  function move(from: number, to: number) {
    if (to < 0 || to >= picked.length) return;
    const next = [...picked];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }

  return (
    <Sheet
      open
      onClose={onClose}
      eyebrow="Collection"
      title={`Garments in ${label}`}
      footer={
        <button type="button" onClick={onClose} className={ACTION}>
          Done
        </button>
      }
    >
      <div className="space-y-6">
        <p className="max-w-[68ch] text-[13px] text-[var(--ds-faint)]">
          {picked.length === 0
            ? 'Nothing is chosen yet. A collection shows exactly the garments picked here — there is no automatic query behind it — so an empty collection is an empty page on the shop.'
            : `${picked.length} ${picked.length === 1 ? 'garment' : 'garments'}, shown on the collection's page in this order.`}
        </p>

        {missing > 0 ? (
          <div className="flex flex-wrap items-start gap-2">
            <span className={badge('warn')}>
              {missing === 1 ? '1 garment gone' : `${missing} garments gone`}
            </span>
            <p className={cn(META, 'min-w-0 flex-1 max-w-[68ch]')}>
              {missing === 1
                ? 'One garment in this collection is no longer in the catalogue, so it cannot be shown or reordered here. Saving the collection drops it.'
                : 'Those garments are no longer in the catalogue, so they cannot be shown or reordered here. Saving the collection drops them.'}
            </p>
          </div>
        ) : null}

        {picked.length > 0 ? (
          <div>
            <p className={cn(LABEL, 'mb-2')}>Chosen, in order</p>
            <ul className="divide-y divide-[var(--ds-line)] overflow-hidden rounded-md border border-[var(--ds-line)]">
              {picked.map((id, index) => {
                const product = byId.get(id)!;
                return (
                  <li key={id} className="flex items-center gap-3 px-2.5 py-2">
                    <span className={cn(LABEL, 'w-4 shrink-0 tabular-nums')}>{index + 1}</span>
                    <Photo product={product} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-[var(--ds-ink)]">
                        {product.name}
                      </span>
                      <span className={cn(META, 'block')}>{formatPrice(product.price)}</span>
                    </span>
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => move(index, index - 1)}
                      aria-label={`Move ${product.name} up`}
                      className={ACTION_QUIET}
                    >
                      <ArrowUp size={15} strokeWidth={1.75} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      disabled={index === picked.length - 1}
                      onClick={() => move(index, index + 1)}
                      aria-label={`Move ${product.name} down`}
                      className={ACTION_QUIET}
                    >
                      <ArrowDown size={15} strokeWidth={1.75} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onChange(picked.filter(other => other !== id))}
                      aria-label={`Remove ${product.name} from this collection`}
                      className={ACTION_GRAVE}
                    >
                      <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
            <button type="button" onClick={() => onChange([])} className={cn(ACTION_SOFT, 'mt-2')}>
              Remove all
            </button>
          </div>
        ) : null}

        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className={LABEL}>The catalogue</p>
            <div className="relative w-full max-w-[260px]">
              <Search
                size={14}
                strokeWidth={1.75}
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[var(--ds-faint)]"
              />
              <TextInput
                id="collection-product-search"
                type="search"
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Search by name or category"
                aria-label="Search the catalogue"
                className="pl-8"
              />
            </div>
          </div>

          {rest.length === 0 ? (
            <p className="text-[13px] text-[var(--ds-faint)]">
              {products.length === 0
                ? 'The catalogue could not be read, so there is nothing to pick. Reload the screen and try again.'
                : needle
                  ? 'No garment matches that search.'
                  : 'Every garment in the catalogue is already in this collection.'}
            </p>
          ) : (
            <ul className="divide-y divide-[var(--ds-line)] overflow-hidden rounded-md border border-[var(--ds-line)]">
              {rest.map(product => (
                <li key={product.id}>
                  <button
                    type="button"
                    onClick={() => onChange([...picked, product.id])}
                    className={cn(
                      'flex w-full items-center gap-3 px-2.5 py-2 text-left hover:bg-[var(--ds-surface-sunk)]',
                      FOCUS
                    )}
                  >
                    <Photo product={product} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-[var(--ds-ink)]">
                        {product.name}
                      </span>
                      <span className={cn(META, 'block')}>{formatPrice(product.price)}</span>
                    </span>
                    <span className={badge()}>{product.category}</span>
                    <span className={cn(LABEL, 'shrink-0 text-[var(--ds-ink)]')}>Add</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Sheet>
  );
}

/** A garment's first photograph, or an honest empty frame where it has none. */
function Photo({ product }: { product: PickerProduct }) {
  if (!product.image) {
    return (
      <span
        title="No photographs"
        aria-label="No photographs"
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--ds-line)]',
          'bg-[var(--ds-surface-sunk)] text-[11px] text-[var(--ds-faint)]'
        )}
      >
        —
      </span>
    );
  }
  return (
    <Image
      src={product.image}
      alt=""
      width={36}
      height={36}
      unoptimized
      className="h-9 w-9 shrink-0 rounded-md border border-[var(--ds-line)] object-cover"
    />
  );
}
