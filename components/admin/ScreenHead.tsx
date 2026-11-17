import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LABEL, TITLE } from './styles';

/**
 * The head of every portal screen: the section name at 11px, the screen's title in Fraunces,
 * a gold hairline under both, and whatever primary action the screen owns on the right.
 *
 * The gold rule is the one accent on a screen — the same role it plays on the storefront,
 * where `HairlineRule` sits under a movement's heading.
 */
export default function ScreenHead({
  eyebrow,
  title,
  note,
  actions,
}: {
  eyebrow: string;
  title: string;
  /** One line of context under the title; kept to a line on purpose. */
  note?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-3">
        <div className="min-w-0">
          <p className={cn(LABEL, 'mb-1.5')}>{eyebrow}</p>
          <h1 className={TITLE}>{title}</h1>
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-6">{actions}</div> : null}
      </div>
      <hr className="m-0 h-px w-full border-0 bg-gold" />
      {note ? <p className="mt-3 font-ui text-caption text-ink-soft">{note}</p> : null}
    </div>
  );
}
