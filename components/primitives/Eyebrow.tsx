import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Small uppercase label that sits above a heading. `text-eyebrow` sets the 11px size and
 * 0.18em tracking only; the casing is applied here.
 */
export default function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  /** Placement inside the grid, e.g. `col-span-4 col-start-2`. */
  className?: string;
}) {
  return (
    <p className={cn('font-ui text-eyebrow font-normal uppercase text-ink-soft', className)}>
      {children}
    </p>
  );
}
