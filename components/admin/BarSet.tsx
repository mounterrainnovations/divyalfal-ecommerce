'use client';

import { cn } from '@/lib/utils';
import { LABEL, META } from './styles';

export interface Bar {
  /** Stable key for React, and the row's identity. */
  key: string;
  label: string;
  /** What the bar's length is drawn from. Must be zero or more. */
  value: number;
  /** The figure as a reader should see it: "8", "₹48,000", "26 units". */
  display: string;
  /** A quieter second line: the share, or why the figure is not what it looks like. */
  note?: string;
}

/**
 * One categorical breakdown: a label, a bar, a figure.
 *
 * WHY THIS EXISTS BESIDE `TrendChart` AND NOT INSTEAD OF IT. `TrendChart` draws one series over
 * time; this draws one measure across categories — statuses, payment states, product types,
 * garments. They are different questions and neither can stand in for the other, so this is a
 * sibling in the same neighbourhood rather than a second attempt at the same component. The
 * conventions are deliberately the ones `TrendChart` set: one series, no legend (the card's
 * heading names what is measured), a zero baseline, the accent carrying emphasis only, and the
 * figures published as a real table rather than as pictures of numbers.
 *
 * WHY A BAR SET AND NOT A PIE. Six categories in a pie is six angles a reader has to compare by
 * eye; the same six as bars share one baseline and sort themselves. A pie also needs a legend,
 * which means colour carrying identity, which means a colour-blind reader decoding it. Nothing
 * here needs more than one colour.
 *
 * WHY IT IS A `<table>` AND NOT A LIST OF DIVS. The data *is* a table — a label, a figure and a
 * share per row — so the drawing and the figures are the same markup rather than a drawing with
 * a hidden table beside it. A screen reader reads the rows; everyone else sees the bars. The
 * bars themselves are `aria-hidden`, because the number is already in the row and announcing
 * both would say everything twice.
 *
 * WHY THE BARS SCALE TO THE LARGEST VALUE, NOT TO THE TOTAL. A share-of-total scale makes eight
 * roughly equal rows into eight stubs against a mostly empty track. The length is for comparing
 * the rows with each other; the share, where the caller supplies one, is in `note`. A zero row
 * draws no bar at all — not a sliver, which reads as "a little" rather than "none".
 */
export default function BarSet({
  bars,
  caption,
  measure,
  className,
}: {
  bars: Bar[];
  /** Describes the whole set for a reader who cannot see it. Visually hidden. */
  caption: string;
  /** The column head over the figures: "Orders", "Units", "Revenue". */
  measure: string;
  className?: string;
}) {
  // At least 1, so a set of all-zero rows divides by something and draws nothing.
  const peak = Math.max(1, ...bars.map(bar => Math.max(0, bar.value)));

  return (
    <table className={cn('w-full border-collapse', className)}>
      <caption className="sr-only">{caption}</caption>
      <thead className="sr-only">
        <tr>
          <th scope="col">Name</th>
          <th scope="col">{measure}</th>
        </tr>
      </thead>
      <tbody>
        {bars.map(bar => {
          const fraction = Math.min(1, Math.max(0, bar.value) / peak);
          return (
            <tr key={bar.key} className="align-top">
              <th scope="row" className="py-1.5 pr-3 text-left font-normal">
                <span className={cn(LABEL, 'block truncate')}>{bar.label}</span>
                {/* The bar sits under its own label rather than in a column of its own: at a
                    card's width a three-column layout leaves the bars too short to compare. */}
                <span
                  aria-hidden="true"
                  className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-[var(--ds-surface-sunk)]"
                >
                  <span
                    className="block h-full rounded-full bg-[var(--ds-accent-solid)]"
                    style={{ width: `${fraction * 100}%` }}
                  />
                </span>
              </th>
              <td className="w-[1%] py-1.5 pl-3 text-right align-top whitespace-nowrap">
                <span className="block text-[13px] leading-4 font-semibold tabular-nums text-[var(--ds-ink)]">
                  {bar.display}
                </span>
                {bar.note ? <span className={cn(META, 'mt-1 block')}>{bar.note}</span> : null}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
