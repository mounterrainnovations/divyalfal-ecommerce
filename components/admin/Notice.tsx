import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LABEL, RULE } from './styles';

/**
 * One line under a hairline: what state this screen is in and why.
 *
 * It is the shape every screen reaches for three times — the tables are not there yet, there
 * is nothing in this list, or a request failed — and writing it three times per screen is how
 * a portal ends up telling the same story five different ways. `label` is the 11px word
 * ("Not set up yet", "Nothing yet", "Problem"), `children` the sentence.
 *
 * `tone="problem"` marks the label with the sale token, and the word itself carries the same
 * fact, so the difference is never colour alone.
 */
export default function Notice({
  label,
  tone = 'quiet',
  children,
  className,
}: {
  label: string;
  tone?: 'quiet' | 'problem';
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('border-t pt-4', RULE, className)}>
      <p className={cn(LABEL, 'mb-2', tone === 'problem' && 'text-sale')}>{label}</p>
      <p className="measure font-ui text-caption text-ink-soft">{children}</p>
    </div>
  );
}

/** The 503 state, worded once. Every screen shows exactly this while the tables are missing. */
export function NotSetUp({ message, what }: { message: string; what: string }) {
  return (
    <Notice label="Not set up yet">
      {message}{' '}
      <span className="block pt-1.5">Until then, {what}</span>
    </Notice>
  );
}
