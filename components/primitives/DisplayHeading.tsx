import type { ReactNode } from 'react';

const SIZE_CLASS = {
  1: 'text-display-1',
  2: 'text-display-2',
  3: 'text-display-3',
} as const;

const TAG = { 1: 'h1', 2: 'h2', 3: 'h3' } as const;

/**
 * Fraunces, light. `level` is the document outline (which heading element); `size` is the
 * visual scale. They are separate so a section can be an h2 and still read at display-1.
 * `size` defaults to the step matching `level`.
 */
export default function DisplayHeading({
  children,
  level = 2,
  size,
}: {
  children: ReactNode;
  level?: 1 | 2 | 3;
  size?: 1 | 2 | 3;
}) {
  const Tag = TAG[level];
  return (
    <Tag className={`font-display font-light text-ink ${SIZE_CLASS[size ?? level]}`}>
      {children}
    </Tag>
  );
}
