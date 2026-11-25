'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Ruler, X } from 'lucide-react';
import { chartHasRows, type SizeChart } from '@/lib/content/size-charts';

/**
 * The size guide on a product page: a link that opens the shop's own measurement table.
 *
 * WHY IT IS A DIALOG AND NOT A SECTION ON THE PAGE. The table is reference material consulted
 * once, at the moment someone is choosing between XS and M. Inline, a six-column table pushes
 * the price and the contact button below the fold on a phone for every visitor, including the
 * ones who never wanted it.
 *
 * WHY THE TABLE SCROLLS SIDEWAYS RATHER THAN WRAPPING. A chart can be "Size / Bust / Waist /
 * Hip / Shoulder / Length" — six columns at 390px is 65px each, which turns "34–36" into two
 * lines and a column heading into four. A measurement table is read by scanning along a row, so
 * the cells keep their width, stay on one line, and the table scrolls inside the dialog. The
 * page itself never scrolls sideways, and a line under the table says so on small screens
 * where the overflow is not otherwise obvious.
 *
 * STOREFRONT LANGUAGE, NOT THE PORTAL'S. Plain Tailwind, Cormorant for the heading, the same
 * grey scale as the rest of the product page. None of `components/admin/styles.ts` belongs
 * here: those tokens resolve against custom properties scoped to the portal shell and would
 * come out as nothing on a shop page.
 */

/**
 * The table itself, with the shop's note under it.
 *
 * Exported because the portal's editor renders THIS component for its live preview. A preview
 * built from its own markup is a preview that can disagree with the shop — which is the one
 * thing a preview must never do — so there is exactly one implementation of a drawn chart and
 * both callers use it.
 */
export function SizeChartTable({ chart }: { chart: SizeChart }) {
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-gray-300 bg-gray-50">
              {chart.columns.map((column, index) => (
                <th
                  key={index}
                  scope="col"
                  className="px-4 py-2.5 text-xs font-semibold tracking-[0.08em] whitespace-nowrap text-gray-600 uppercase"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chart.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b border-gray-200 last:border-b-0">
                {row.map((value, cellIndex) => (
                  /*
                   * The first cell of each row is the row's header — the size name — so it is a
                   * `<th scope="row">`. A screen reader then announces "XL, Bust, 42" instead of
                   * reading forty loose numbers, which is the difference between a usable table
                   * and an unusable one.
                   */
                  <CellTag
                    key={cellIndex}
                    header={cellIndex === 0}
                    className={
                      cellIndex === 0
                        ? 'px-4 py-2.5 font-medium whitespace-nowrap text-gray-900'
                        : 'px-4 py-2.5 whitespace-nowrap text-gray-700'
                    }
                  >
                    {value}
                  </CellTag>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {chart.columns.length > 3 ? (
        <p className="mt-2 text-xs text-gray-500 sm:hidden">Scroll the table sideways for the remaining columns.</p>
      ) : null}

      {chart.note ? (
        <p className="mt-4 text-sm leading-relaxed whitespace-pre-line text-gray-600">
          {chart.note}
        </p>
      ) : null}
    </div>
  );
}

/** `<th scope="row">` or `<td>`, chosen by position. See the comment at the call site. */
function CellTag({
  header,
  className,
  children,
}: {
  header: boolean;
  className: string;
  children: React.ReactNode;
}) {
  if (header) {
    return (
      <th scope="row" className={className}>
        {children}
      </th>
    );
  }
  return <td className={className}>{children}</td>;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function SizeGuide({ chart }: { chart: SizeChart }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const headingId = useId();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    /*
     * The same contract the portal's slide-over keeps (`components/admin/Sheet.tsx`), because
     * a modal that half-keeps it is worse than no modal: focus moves in, Tab cycles inside,
     * Escape closes, the page behind cannot scroll, and the trigger gets focus back on the way
     * out. Reading `activeElement` before focus moves is what makes the last part true, and
     * doing the restore in the cleanup covers an unmount as well as an ordinary close.
     */
    const returnTo = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        item => item.offsetParent !== null || item === document.activeElement
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (!panel.contains(active)) {
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
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      returnTo?.focus?.();
    };
  }, [open]);

  /*
   * A chart with headings and no rows is a chart someone is still writing. The trigger is not
   * drawn for it, so a visitor never opens a size guide to find an empty table — the page
   * simply has no size guide yet, which is the honest state and the one it has always been in.
   */
  if (!chartHasRows(chart)) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="inline-flex items-center gap-2 text-base font-bold text-black underline underline-offset-4 transition hover:no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
      >
        <Ruler className="h-4 w-4" aria-hidden="true" />
        Size guide
      </button>

      {open ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6">
          {/* The scrim. A button rather than a div so a pointer-only visitor can dismiss by
              clicking away; `tabIndex={-1}` keeps it out of the trap's cycle, where it would
              read as a mysterious extra stop. */}
          <button
            type="button"
            aria-label="Close the size guide"
            tabIndex={-1}
            onClick={close}
            className="absolute inset-0 cursor-default bg-black/40"
          />

          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={headingId}
            className="relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-xl"
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <p className="text-xs tracking-[0.12em] text-gray-500 uppercase">Size guide</p>
                <h2 id={headingId} className="mt-0.5 font-serif text-2xl text-gray-900 sm:text-3xl">
                  {chart.name}
                </h2>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                aria-label="Close the size guide"
                className="-mt-1 -mr-2 shrink-0 rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {/* The dialog scrolls vertically; the table inside it scrolls horizontally. Both
                are needed — a long chart on a short phone, and a wide chart on a narrow one. */}
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              <SizeChartTable chart={chart} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
