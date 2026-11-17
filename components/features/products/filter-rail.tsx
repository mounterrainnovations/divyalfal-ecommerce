'use client';

import { useEffect, useId, useRef } from 'react';
import type { ReactNode, RefObject } from 'react';
import { X } from 'lucide-react';
import Button from '@/components/primitives/Button';
import HairlineRule from '@/components/primitives/HairlineRule';
import { categories as CATEGORY_NAMES, priceRanges } from '@/lib/data/mock-products';
import { cn } from '@/lib/utils';

export interface RangeOption {
  label: string;
  min: number;
  max: number;
}

export interface FilterRailValue {
  /** Display names ("Sarees", "Kurta Pant"), the same strings `?categories=` carries. */
  categories: string[];
  /** The selected price or discount band; null is "all". */
  range: RangeOption | null;
}

/** The second group beside Categories: a price band on /products, a discount band on /sale. */
export interface RangeGroup {
  legend: string;
  allLabel: string;
  options: RangeOption[];
}

export const PRICE_GROUP: RangeGroup = {
  legend: 'Price Range',
  allLabel: 'All Prices',
  options: priceRanges,
};

export const DISCOUNT_GROUP: RangeGroup = {
  legend: 'Discount',
  allLabel: 'All Discounts',
  options: [
    { label: '10-25% OFF', min: 10, max: 25 },
    { label: '25-50% OFF', min: 25, max: 50 },
    { label: '50-75% OFF', min: 50, max: 75 },
    { label: '75%+ OFF', min: 75, max: 100 },
  ],
};

const sameRange = (a: RangeOption | null, b: RangeOption | null) =>
  a === null || b === null ? a === b : a.min === b.min && a.max === b.max;

/**
 * One selectable row: the native input is visually hidden (it keeps the keyboard, the
 * checked state and the announcement), and its sibling spans draw the state. A selected row
 * reads in full ink with a short gold hairline leading it; the rest are soft ink. Keyboard
 * focus outlines the text, not the whole row.
 */
function Row({
  type,
  name,
  checked,
  onChange,
  children,
}: {
  type: 'checkbox' | 'radio';
  name?: string;
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
}) {
  return (
    <li>
      <label className="group flex cursor-pointer items-center gap-3 py-2">
        <input
          type={type}
          name={name}
          checked={checked}
          onChange={onChange}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className="h-px w-5 shrink-0 origin-left scale-x-0 bg-gold transition-transform duration-300 peer-checked:scale-x-100 motion-reduce:transition-none"
        />
        <span className="font-display text-body font-light text-ink-soft transition-colors duration-300 group-hover:text-ink peer-checked:font-normal peer-checked:text-ink peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-ink motion-reduce:transition-none">
          {children}
        </span>
      </label>
    </li>
  );
}

function Group({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="mb-3 p-0 font-ui text-eyebrow font-normal uppercase text-ink-soft">
        {legend}
      </legend>
      <ul className="m-0 list-none p-0">{children}</ul>
    </fieldset>
  );
}

/**
 * The filters as a quiet list: two short groups of text rows under small-caps legends, never
 * chips or cards. It is controlled — `value` in, `onChange` out with the whole next value —
 * and holds no state of its own, so the page can render it twice (the desktop rail and the
 * mobile drawer) and they cannot disagree. Radio names and ids come from `useId`, so the two
 * copies never share a group.
 */
export function FilterRail({
  value,
  onChange,
  range = PRICE_GROUP,
  className,
}: {
  value: FilterRailValue;
  onChange: (next: FilterRailValue) => void;
  range?: RangeGroup;
  className?: string;
}) {
  const radioName = useId();
  const activeCount = value.categories.length + (value.range ? 1 : 0);

  const toggleCategory = (name: string) =>
    onChange({
      ...value,
      categories: value.categories.includes(name)
        ? value.categories.filter(category => category !== name)
        : [...value.categories, name],
    });

  return (
    <div className={cn('flex flex-col gap-10', className)}>
      <Group legend="Categories">
        {CATEGORY_NAMES.map(name => (
          <Row
            key={name}
            type="checkbox"
            checked={value.categories.includes(name)}
            onChange={() => toggleCategory(name)}
          >
            {name}
          </Row>
        ))}
      </Group>

      <Group legend={range.legend}>
        <Row
          type="radio"
          name={radioName}
          checked={value.range === null}
          onChange={() => onChange({ ...value, range: null })}
        >
          {range.allLabel}
        </Row>
        {range.options.map(option => (
          <Row
            key={option.label}
            type="radio"
            name={radioName}
            checked={sameRange(value.range, option)}
            onChange={() => onChange({ ...value, range: option })}
          >
            {option.label}
          </Row>
        ))}
      </Group>

      {activeCount > 0 && (
        <div>
          <Button variant="quiet" onClick={() => onChange({ categories: [], range: null })}>
            Clear all filters ({activeCount})
          </Button>
        </div>
      )}
    </div>
  );
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The rail, below the `lg` breakpoint, as a full-screen dialog. It follows the navbar's
 * dialog discipline exactly, because that is the reference:
 *
 *  - it is in the DOM **only while open** (no off-canvas panel to widen the page, nothing
 *    hidden left in the tab order);
 *  - `role="dialog"` with `aria-modal`, an accessible name, and focus moved in to the close
 *    button on open;
 *  - Tab and Shift+Tab wrap inside it; Escape closes it;
 *  - body scroll is locked, and the previous value restored on close;
 *  - focus goes back to the control that opened it (`returnFocusRef`);
 *  - it closes itself if the window grows past `lg`, where the rail is on the page anyway.
 */
export function FilterDrawer({
  open,
  onClose,
  returnFocusRef,
  doneLabel,
  children,
  id,
}: {
  open: boolean;
  onClose: () => void;
  /** The button that opened the drawer; focus returns here however the drawer closes. */
  returnFocusRef: RefObject<HTMLElement | null>;
  /** Label of the closing button at the foot, e.g. "Show results". */
  doneLabel: string;
  children: ReactNode;
  id?: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const dialog = dialogRef.current;
      if (!dialog) return;
      const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (!dialog.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    let media: MediaQueryList | undefined;
    const onGrow = (event: MediaQueryListEvent) => {
      if (event.matches) onCloseRef.current();
    };
    if (typeof window.matchMedia === 'function') {
      media = window.matchMedia('(min-width: 1024px)');
      media.addEventListener('change', onGrow);
    }

    const returnTo = returnFocusRef.current;
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      media?.removeEventListener('change', onGrow);
      returnTo?.focus();
    };
  }, [open, returnFocusRef]);

  if (!open) return null;

  return (
    <div
      id={id}
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Filters"
      className="fixed inset-0 z-[60] flex animate-in flex-col bg-paper duration-300 fade-in lg:hidden"
    >
      <div className="flex h-16 shrink-0 items-center justify-between px-[var(--gutter)]">
        <p className="font-ui text-eyebrow uppercase text-ink">Filters</p>
        <button
          ref={closeRef}
          type="button"
          aria-label="Close filters"
          onClick={() => onCloseRef.current()}
          className="-mr-3 flex h-12 w-12 items-center justify-center text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <X size={24} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>
      <HairlineRule />

      <div className="flex-1 overflow-y-auto px-[var(--gutter)] py-8">{children}</div>

      <HairlineRule />
      <div className="shrink-0 px-[var(--gutter)] py-6">
        <Button onClick={() => onCloseRef.current()}>{doneLabel}</Button>
      </div>
    </div>
  );
}
