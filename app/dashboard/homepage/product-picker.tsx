'use client';

import Image from 'next/image';
import Sheet from '@/components/admin/Sheet';
import {
  ACTION,
  ACTION_GRAVE,
  ACTION_QUIET,
  ACTION_SOFT,
  FOCUS,
  LABEL,
} from '@/components/admin/styles';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';

/**
 * Hand-pick the garments one homepage movement shows, in the order it shows them.
 *
 * **An empty selection is not an empty movement.** It means "whatever the automatic query
 * finds" — the behaviour the site has had all along — and the sheet says so at the top, next to
 * the description of what that query actually does. Nothing about an empty list is a mistake to
 * be fixed, and a client who clears a selection should not be left wondering what will show.
 *
 * Order matters here, which is why the chosen list is a list with Up and Down rather than a set
 * of checkboxes: the first garment opens the band.
 */
export default function ProductPicker({
  label,
  automatic,
  products,
  chosen,
  onChange,
  onClose,
}: {
  label: string;
  /** What happens when nothing is chosen, in words. */
  automatic: string;
  products: Product[];
  chosen: string[];
  onChange: (productIds: string[]) => void;
  onClose: () => void;
}) {
  const byId = new Map(products.map(product => [product.id, product]));
  const picked = chosen.filter(id => byId.has(id));
  const rest = products.filter(product => !picked.includes(product.id));

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
      eyebrow="Homepage"
      title={`Garments in ${label}`}
      footer={
        <>
          <button type="button" onClick={onClose} className={ACTION}>
            Done
          </button>
          {picked.length > 0 ? (
            <button type="button" onClick={() => onChange([])} className={ACTION_SOFT}>
              Clear the selection
            </button>
          ) : null}
        </>
      }
    >
      <div className="space-y-6">
        <p className="max-w-[68ch] text-[13px] text-[var(--ds-faint)]">
          {picked.length === 0
            ? `Nothing is chosen, so this movement shows ${automatic}. Choose garments below to fix the selection instead.`
            : `${picked.length} chosen, shown in this order. Clear the selection to go back to ${automatic}.`}
        </p>

        {picked.length > 0 ? (
          <div>
            <p className={cn(LABEL, 'mb-2')}>Chosen, in order</p>
            <ul className="divide-y divide-[var(--ds-line)] overflow-hidden rounded-md border border-[var(--ds-line)]">
              {picked.map((id, index) => {
                const product = byId.get(id)!;
                return (
                  <li
                    key={id}
                    className="flex items-center gap-3 px-2.5 py-2" 
                  >
                    <span className={cn(LABEL, 'w-4 shrink-0 tabular-nums')}>{index + 1}</span>
                    <Photo product={product} />
                    <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--ds-ink)]">
                      {product.name}
                    </span>
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => move(index, index - 1)}
                      aria-label={`Move ${product.name} up`}
                      className={ACTION_QUIET}
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      disabled={index === picked.length - 1}
                      onClick={() => move(index, index + 1)}
                      aria-label={`Move ${product.name} down`}
                      className={ACTION_QUIET}
                    >
                      Down
                    </button>
                    <button
                      type="button"
                      onClick={() => onChange(picked.filter(other => other !== id))}
                      aria-label={`Remove ${product.name}`}
                      className={ACTION_GRAVE}
                    >
                      Remove
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        <div>
          <p className={cn(LABEL, 'mb-2')}>The catalogue</p>
          {rest.length === 0 ? (
            <p className="text-[13px] text-[var(--ds-faint)]">
              {products.length === 0
                ? 'The catalogue is empty, so there is nothing to pick.'
                : 'Every garment in the catalogue is already chosen.'}
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
                    <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--ds-ink)]">
                      {product.name}
                    </span>
                    <span className={cn(LABEL, 'shrink-0')}>{product.category}</span>
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
function Photo({ product }: { product: Product }) {
  if (product.photos.length === 0) {
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
      src={product.photos[0]}
      alt=""
      width={36}
      height={36}
      unoptimized
      className="h-9 w-9 shrink-0 rounded-md border border-[var(--ds-line)] object-cover"
    />
  );
}
