'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LABEL, ROW, RULE } from './styles';

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
 * A table set like a page in a print catalogue: a hairline under the column heads, a
 * hairline under each row, no card, no fill, no stripes, no radius. 36px rows and 11px
 * uppercase heads, so a screenful is a screenful of data.
 *
 * It takes already-fetched rows and renders them — paging, sorting and searching belong to
 * the screen, which owns the query. `empty` is what shows when there are none, so a screen
 * never has to decide between a table head over nothing and its own empty state.
 */
export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty,
  busy,
  caption,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty: ReactNode;
  /** Dims the body while a fetch is in flight, rather than replacing it with a spinner. */
  busy?: boolean;
  /** Describes the table for a screen reader; visually hidden. */
  caption?: string;
}) {
  if (rows.length === 0) {
    return <div className={cn('border-t py-10 font-ui text-caption text-ink-soft', RULE)}>{empty}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr className={cn('border-y', RULE)}>
            {columns.map(column => (
              <th
                key={column.key}
                scope="col"
                className={cn(LABEL, 'h-8 px-2 font-normal first:pl-0 last:pr-0', column.className)}
              >
                {column.head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody
          aria-busy={busy || undefined}
          className={cn(busy && 'opacity-50 transition-opacity motion-reduce:transition-none')}
        >
          {rows.map(row => (
            <tr
              key={rowKey(row)}
              className={cn(ROW, 'border-b align-middle hover:bg-paper-deep', RULE)}
            >
              {columns.map(column => (
                <td
                  key={column.key}
                  className={cn(
                    'px-2 font-ui text-caption text-ink first:pl-0 last:pr-0',
                    column.wrap === false || column.wrap === undefined ? 'whitespace-nowrap' : '',
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
  );
}
