'use client';

import Image from 'next/image';
import { ArchiveRestore, Archive as ArchiveIcon } from 'lucide-react';
import {
  ACTION_GRAVE,
  ACTION_QUIET,
  CARD,
  LABEL,
  META,
  badge,
} from '@/components/admin/styles';
import { cn } from '@/lib/utils';
import { DEFAULT_IMAGE_FALLBACK } from '@/lib/common/product-interfaces';
import type { AdminProduct } from './catalogue';

const rupees = (value: number) => `₹${value.toLocaleString('en-IN')}`;

/**
 * One product as a card, for the grid view.
 *
 * WHY A GRID AT ALL, GIVEN THE PORTAL IS TABLES. The table answers "what does this product
 * cost, and is it live" for twenty products at once, and it is the right default. It cannot
 * answer "which one is the red Banarasi", which is how a shop owner actually thinks about a
 * rail of sarees. So the grid is the same rows with the photograph given the space to be
 * recognisable, and the same actions on each one — a view, not a different screen.
 *
 * THE FALLBACK PICTURE IS LABELLED. A product with no photographs falls back to
 * `DEFAULT_IMAGE_FALLBACK` so the grid keeps its rhythm instead of collapsing a cell, but the
 * frame then carries a "No photograph" pill: an unlabelled stand-in would be the card claiming
 * a garment has been photographed when it has not, and that is exactly the kind of quiet
 * fiction the catalogue cannot afford — someone would publish it to the homepage.
 */
export default function ProductCard({
  product,
  onEdit,
  onArchive,
  onDelete,
}: {
  product: AdminProduct;
  onEdit: (product: AdminProduct) => void;
  /** Archive a live product, restore an archived one — the component knows which it is. */
  onArchive: (product: AdminProduct) => void;
  onDelete: (product: AdminProduct) => void;
}) {
  const archived = product.isArchived === true;
  const unphotographed = product.photos.length === 0;
  const onSale = product.sale === true && typeof product.salePrice === 'number';

  return (
    <div className={cn(CARD, 'flex flex-col overflow-hidden')}>
      <div className="relative aspect-[3/4] w-full border-b border-[var(--ds-line)] bg-[var(--ds-surface-sunk)]">
        <Image
          src={unphotographed ? DEFAULT_IMAGE_FALLBACK : product.photos[0]}
          alt={unphotographed ? '' : product.name}
          fill
          unoptimized
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className={cn('object-cover', unphotographed && 'opacity-40')}
        />
        {unphotographed ? (
          <span className={cn(badge('warn'), 'absolute top-2 left-2')}>No photograph</span>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 px-3.5 py-3">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={() => onEdit(product)}
            className="min-w-0 text-left text-[13px] leading-5 font-medium text-[var(--ds-ink)] hover:underline"
          >
            {product.name}
          </button>
          <span className={cn(badge(archived ? 'neutral' : onSale ? 'danger' : 'success'), 'shrink-0')}>
            {archived ? 'Archived' : onSale ? 'On sale' : 'Live'}
          </span>
        </div>

        <p className={META}>{product.category}</p>

        <p className={cn(LABEL, 'tabular-nums')}>
          {onSale ? (
            <>
              <s className="text-[var(--ds-faint)]">{rupees(product.price)}</s>{' '}
              <span className="font-semibold text-[var(--ds-ink)]">
                {rupees(product.salePrice as number)}
              </span>
            </>
          ) : (
            <span className="font-semibold text-[var(--ds-ink)]">{rupees(product.price)}</span>
          )}
        </p>

        {/* `mt-auto` so the actions sit on the card's bottom edge whatever the name's length:
            a row of cards with buttons at four different heights reads as a broken grid. */}
        <div className="mt-auto flex flex-wrap items-center gap-1 pt-1">
          <button type="button" onClick={() => onEdit(product)} className={ACTION_QUIET}>
            Edit
          </button>
          <button type="button" onClick={() => onArchive(product)} className={ACTION_QUIET}>
            {archived ? (
              <ArchiveRestore size={14} strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <ArchiveIcon size={14} strokeWidth={1.75} aria-hidden="true" />
            )}
            {archived ? 'Restore' : 'Archive'}
          </button>
          <button
            type="button"
            onClick={() => onDelete(product)}
            className={cn(ACTION_GRAVE, 'ml-auto')}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
