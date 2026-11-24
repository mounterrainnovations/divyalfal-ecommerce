'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { CARD, ROW, TABLE_CELL, TABLE_HEAD } from './styles';

export interface Column<T> {
  /** Stable key for React, and the column's identity. */
  key: string;
  /** Column head. Set to `''` for a column that needs none (a thumbnail, an action). */
  head: ReactNode;
  cell: (row: T) => ReactNode;
  /** Width and alignment, e.g. `w-[72px] text-right`. */
  className?: string;
  /** A cell that must not wrap; defaults to true, since the rows are one line tall. */
  wrap?: boolean;
}

/**
 * The portal's data table.
 *
 * WHAT CHANGED FROM THE OLD ONE. It was set like a page in a print catalogue — no card, no
 * fill, a hairline under every row, 36px rows, 11px uppercase heads at 0.18em. It is now a
 * working table: a white card with one border, a slate head row that *sticks* while the body
 * scrolls, 44px rows, a hover fill on the row under the cursor, and hairline separation between
 * rows rather than a stripe (a zebra fights the hover state, and with a thumbnail column the
 * stripes read as banding in the images).
 *
 * The toolbar and the empty state are the screen's to supply: `toolbar` renders inside the
 * card's header, above the head row, so the primary action for a table sits on the table.
 *
 * It takes already-fetched rows and renders them — paging, sorting and searching belong to the
 * screen, which owns the query. `empty` is what shows when there are none, inside the same card,
 * so a screen never has to choose between a table head over nothing and its own empty state.
 */
export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty,
  busy,
  caption,
  toolbar,
  footer,
  /**
   * The height at which the body starts scrolling under the sticky head. A table inside a
   * sheet needs a shorter one; the default suits a full screen.
   */
  maxHeight = 'max-h-[70vh]',
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty: ReactNode;
  /** Dims the body while a fetch is in flight, rather than replacing it with a spinner. */
  busy?: boolean;
  /** Describes the table for a screen reader; visually hidden. */
  caption?: string;
  /** Filters and the table's primary action, in the card's header. */
  toolbar?: ReactNode;
  /** Paging and counts, under the rows and inside the card. */
  footer?: ReactNode;
  maxHeight?: string;
}) {
  return (
    <div className={CARD}>
      {toolbar ? (
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 border-b border-slate-200 px-3 py-3">
          {toolbar}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="px-4 py-12 text-center text-[13px] text-slate-500">{empty}</div>
      ) : (
        <div className={cn('ds-scroll overflow-auto', maxHeight)}>
          <table className="w-full border-collapse text-left">
            {caption ? <caption className="sr-only">{caption}</caption> : null}
            <thead>
              <tr>
                {columns.map(column => (
                  <th
                    key={column.key}
                    scope="col"
                    className={cn(TABLE_HEAD, 'first:pl-4 last:pr-4', column.className)}
                  >
                    {column.head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody
              aria-busy={busy || undefined}
              className={cn(
                'divide-y divide-slate-100',
                busy && 'opacity-60 transition-opacity motion-reduce:transition-none'
              )}
            >
              {rows.map(row => (
                <tr
                  key={rowKey(row)}
                  className={cn(ROW, 'align-middle transition-colors hover:bg-slate-50')}
                >
                  {columns.map(column => (
                    <td
                      key={column.key}
                      className={cn(
                        TABLE_CELL,
                        'first:pl-4 last:pr-4',
                        column.wrap === false || column.wrap === undefined
                          ? 'whitespace-nowrap'
                          : '',
                        column.className
                      )}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {footer ? (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-slate-200 px-4 py-2.5">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
