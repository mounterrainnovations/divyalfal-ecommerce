import type { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const BASE =
  'inline-flex items-center border-b pb-1 font-ui text-eyebrow font-normal uppercase ' +
  'transition-colors duration-300 motion-reduce:transition-none ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink ' +
  'disabled:pointer-events-none disabled:opacity-50';

const VARIANT = {
  // Ink text on a gold rule that turns to ink on hover.
  primary: 'border-gold text-ink hover:border-ink',
  // Softer text; the rule is gold on hover.
  quiet: 'border-transparent text-ink-soft hover:border-gold hover:text-ink',
} as const;

const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

/**
 * Text plus a rule, never a pill and never a fill. Renders an `<a>` when `href` is set
 * (client-side navigation for internal paths, a plain anchor for external schemes) and a
 * `<button>` otherwise. `newTab` opens an external link in a new tab, with `noopener`.
 * Keyboard focus draws a visible outline.
 */
export default function Button({
  href,
  onClick,
  children,
  variant = 'primary',
  className,
  type = 'button',
  disabled,
  newTab,
}: {
  href?: string;
  onClick?: () => void;
  children: ReactNode;
  variant?: 'primary' | 'quiet';
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  /** External links only: open in a new tab (`target="_blank"`, `rel="noopener noreferrer"`). */
  newTab?: boolean;
}) {
  const classes = cn(BASE, VARIANT[variant], className);

  if (href !== undefined) {
    if (EXTERNAL.test(href)) {
      return (
        <a
          href={href}
          onClick={onClick}
          className={classes}
          {...(newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
          {children}
        </a>
      );
    }
    return (
      <Link href={href} onClick={onClick} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={classes}>
      {children}
    </button>
  );
}
