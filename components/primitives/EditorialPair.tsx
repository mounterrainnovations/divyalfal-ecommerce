import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Asymmetric image / text pair on the 12-column editorial grid: media takes seven columns,
 * the text sits in the last four with a one-column gap, aligned to the media's foot. `flip`
 * mirrors it. DOM order is always media first so reading order is stable; both items are
 * pinned to row 1 so a flipped pair is never auto-placed onto a second row. Stacks below md.
 */
export default function EditorialPair({
  media,
  children,
  flip = false,
  className,
}: {
  media: ReactNode;
  children: ReactNode;
  flip?: boolean;
  /** Applied to the grid root, e.g. `section-rhythm`. */
  className?: string;
}) {
  return (
    <div className={cn('grid-editorial gap-y-8 md:gap-y-0', className)}>
      <div
        className={
          flip
            ? 'col-span-12 md:col-span-7 md:col-start-6 md:row-start-1'
            : 'col-span-12 md:col-span-7 md:col-start-1 md:row-start-1'
        }
      >
        {media}
      </div>
      <div
        className={
          flip
            ? 'col-span-12 self-end md:col-span-4 md:col-start-1 md:row-start-1'
            : 'col-span-12 self-end md:col-span-4 md:col-start-9 md:row-start-1'
        }
      >
        {children}
      </div>
    </div>
  );
}
