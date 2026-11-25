import type { ReactNode } from 'react';
import { AlertTriangle, Info, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * A callout: what state this screen is in, and why.
 *
 * It is the shape every screen reaches for three times — the tables are not there yet, there is
 * nothing in this list, or a request failed — and writing it three times per screen is how a
 * portal ends up telling the same story five different ways. `label` is the heading ("Not set
 * up yet", "Nothing yet", "Problem"), `children` the sentence.
 *
 * WHAT CHANGED. It was a line of 11px uppercase under a hairline. It is now a bordered,
 * tinted panel with an icon, which is what a dashboard uses to say something out of the
 * ordinary — and, more usefully, it no longer looks identical to the screen's own content.
 *
 * `tone` is carried by the icon and the heading as well as by the fill, so the difference is
 * never colour alone. `role="alert"` on a problem, and nothing on an explanation: a 503 that
 * was expected is not an alert, and announcing it as one on every screen is noise.
 */
const TONES = {
  quiet: {
    panel: 'border-[var(--ds-line)] bg-[var(--ds-surface-sunk)]',
    icon: 'text-[var(--ds-faint)]',
    head: 'text-[var(--ds-ink)]',
    Icon: Info,
  },
  problem: {
    panel: 'border-red-200 bg-red-50',
    icon: 'text-red-500',
    head: 'text-red-800',
    Icon: AlertTriangle,
  },
  working: {
    panel: 'border-[var(--ds-line)] bg-[var(--ds-surface)]',
    icon: 'animate-spin text-[var(--ds-faint)] motion-reduce:animate-none',
    head: 'text-[var(--ds-ink)]',
    Icon: Loader2,
  },
} as const;

export default function Notice({
  label,
  tone = 'quiet',
  children,
  className,
}: {
  label: string;
  tone?: keyof typeof TONES;
  children: ReactNode;
  className?: string;
}) {
  const { panel, icon, head, Icon } = TONES[tone];

  return (
    <div
      role={tone === 'problem' ? 'alert' : undefined}
      className={cn('flex items-start gap-3 rounded-lg border p-4', panel, className)}
    >
      <Icon
        size={16}
        strokeWidth={1.75}
        aria-hidden="true"
        className={cn('mt-px shrink-0', icon)}
      />
      <div className="min-w-0">
        <p className={cn('text-[13px] leading-5 font-semibold', head)}>{label}</p>
        <p className="mt-1 max-w-[68ch] text-[13px] leading-5 text-[var(--ds-muted)]">{children}</p>
      </div>
    </div>
  );
}

/** The 503 state, worded once. Every screen shows exactly this while the tables are missing. */
export function NotSetUp({ message, what }: { message: string; what: string }) {
  return (
    <Notice label="Not set up yet">
      {message}
      <span className="block pt-1.5">Until then, {what}</span>
    </Notice>
  );
}
