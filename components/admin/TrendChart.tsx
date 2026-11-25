'use client';

import { useId, useState } from 'react';
import { cn } from '@/lib/utils';
import { META } from './styles';

export interface TrendPoint {
  /** The x label, already formatted for a reader — "6 Oct", "13 Oct". */
  label: string;
  value: number;
}

/**
 * One series over time, as an area with a line on top.
 *
 * WHY A CHART AT ALL, AND WHEN NOT. The owner asked this portal to follow a reference admin
 * whose dashboard leads with a sales line. This shop takes enquiries rather than orders, so
 * enquiries-per-week is the honest equivalent — the same question ("is work coming in, and is
 * it going up or down?") against the table this portal actually owns. When there is nothing
 * to plot the caller renders an empty state instead: a flat line through two points is a chart
 * that invents a trend out of noise, which is worse than a sentence saying there is no trend
 * yet.
 *
 * WHY IT IS HAND-DRAWN SVG. One single-series area chart does not justify a charting library
 * in the bundle, and every decision a library would make for us — the grid's weight, where the
 * labels go, what the hover shows — is one we want to make deliberately.
 *
 * THE DESIGN RULES IT FOLLOWS.
 *  - One series, so no legend: the card's own heading names what is plotted. Colour is not
 *    carrying identity here, only emphasis, so there is nothing for a colour-blind reader to
 *    disambiguate.
 *  - A 2px line, a 12%-opacity fill beneath it, and a grid that is one hairline per step in
 *    the border colour — the grid must never compete with the data.
 *  - Values are not printed on every point. The hover layer gives the exact figure for one
 *    point at a time, and the axis gives the magnitude at a glance.
 *  - Every point has a hit target the full height of the plot and at least 8px wide, so the
 *    tooltip is reachable by pointer without having to land on the 2px line itself.
 *  - The same numbers are published as a real `<table>` for assistive tech and for anyone who
 *    wants the figures rather than the shape. It is visually hidden, not absent.
 */
export default function TrendChart({
  points,
  caption,
  unit,
  className,
}: {
  points: TrendPoint[];
  /** What the table of figures is called, for a reader who never sees the drawing. */
  caption: string;
  /** The noun after the number in the tooltip — "enquiry" / "enquiries". */
  unit: (value: number) => string;
  className?: string;
}) {
  const gradientId = useId();
  const [hover, setHover] = useState<number | null>(null);

  // The drawing's own coordinate space. It scales with the card; nothing here is device pixels.
  const W = 720;
  const H = 200;
  const PAD_L = 44;
  const PAD_R = 12;
  const PAD_T = 12;
  const PAD_B = 28;

  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  // The scale always starts at zero — an area chart with a truncated baseline overstates every
  // change, which is the single most common way a dashboard misleads the person reading it.
  const peak = Math.max(1, ...points.map(point => point.value));
  // A round ceiling so the axis reads 0 / 2 / 4 / 6 rather than 0 / 1.7 / 3.3 / 5.
  const step = Math.max(1, Math.ceil(peak / 4));
  const top = step * 4;

  const x = (index: number) =>
    points.length <= 1 ? PAD_L + plotW / 2 : PAD_L + (index * plotW) / (points.length - 1);
  const y = (value: number) => PAD_T + plotH - (value / top) * plotH;

  const line = points.map((point, index) => `${x(index)},${y(point.value)}`).join(' ');
  const area = `${PAD_L},${PAD_T + plotH} ${line} ${x(points.length - 1)},${PAD_T + plotH}`;

  const active = hover === null ? null : points[hover];

  return (
    <div className={cn('relative', className)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={caption}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--ds-accent-solid)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--ds-accent-solid)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* The grid, and the only numbers on the y axis. */}
        {[0, 1, 2, 3, 4].map(tick => {
          const value = (top / 4) * tick;
          return (
            <g key={tick}>
              <line
                x1={PAD_L}
                x2={W - PAD_R}
                y1={y(value)}
                y2={y(value)}
                stroke="var(--ds-line)"
                strokeWidth="1"
              />
              <text
                x={PAD_L - 8}
                y={y(value) + 4}
                textAnchor="end"
                className="fill-[var(--ds-faint)] text-[11px]"
              >
                {value}
              </text>
            </g>
          );
        })}

        <polygon points={area} fill={`url(#${gradientId})`} />
        <polyline
          points={line}
          fill="none"
          stroke="var(--ds-accent-solid)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* The ends of the range, which is all the x axis needs to say. */}
        <text x={PAD_L} y={H - 8} className="fill-[var(--ds-faint)] text-[11px]">
          {points[0]?.label}
        </text>
        <text
          x={W - PAD_R}
          y={H - 8}
          textAnchor="end"
          className="fill-[var(--ds-faint)] text-[11px]"
        >
          {points[points.length - 1]?.label}
        </text>

        {/* The hover layer: one full-height target per point, so the tooltip never requires
            hitting the 2px line. Drawn last so it sits above the marks. */}
        {points.map((point, index) => (
          <rect
            key={point.label}
            x={x(index) - plotW / Math.max(1, (points.length - 1) * 2)}
            y={PAD_T}
            width={Math.max(10, plotW / Math.max(1, points.length - 1))}
            height={plotH}
            fill="transparent"
            onMouseEnter={() => setHover(index)}
          />
        ))}

        {active ? (
          <g pointerEvents="none">
            <line
              x1={x(hover as number)}
              x2={x(hover as number)}
              y1={PAD_T}
              y2={PAD_T + plotH}
              stroke="var(--ds-line-strong)"
              strokeWidth="1"
            />
            {/* A 2px surface ring so the marker reads against both the fill and the grid. */}
            <circle
              cx={x(hover as number)}
              cy={y(active.value)}
              r="5"
              fill="var(--ds-accent-solid)"
              stroke="var(--ds-surface)"
              strokeWidth="2"
            />
          </g>
        ) : null}
      </svg>

      {/* The tooltip is HTML, not SVG: real type rendering, and it can never be clipped by the
          viewBox. It is pinned to the card's top-right rather than chasing the cursor, which
          at this size is steadier to read and cannot cover the point it describes. */}
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute top-0 right-0 rounded-md border px-2.5 py-1.5',
          'border-[var(--ds-line)] bg-[var(--ds-surface)] shadow-[0_1px_2px_0_rgb(42_33_27/0.06)]',
          'transition-opacity duration-100 motion-reduce:transition-none',
          active ? 'opacity-100' : 'opacity-0'
        )}
      >
        <span className="block text-[12px] leading-4 text-[var(--ds-faint)]">
          {active?.label ?? ''}
        </span>
        <span className="block text-[14px] leading-5 font-semibold text-[var(--ds-ink)]">
          {active ? `${active.value} ${unit(active.value)}` : ''}
        </span>
      </div>

      {/* The figures themselves, for a reader who never sees the drawing. */}
      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Week beginning</th>
            <th scope="col">Count</th>
          </tr>
        </thead>
        <tbody>
          {points.map(point => (
            <tr key={point.label}>
              <th scope="row">{point.label}</th>
              <td>{point.value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className={cn(META, 'mt-1 text-right')}>Hover a week for its figure</p>
    </div>
  );
}
