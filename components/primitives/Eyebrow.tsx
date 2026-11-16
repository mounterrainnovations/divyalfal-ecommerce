import type { ReactNode } from 'react';

/**
 * Small uppercase label that sits above a heading. `text-eyebrow` sets the 11px size and
 * 0.18em tracking only; the casing is applied here.
 */
export default function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="font-ui text-eyebrow font-normal uppercase text-ink-soft">{children}</p>;
}
