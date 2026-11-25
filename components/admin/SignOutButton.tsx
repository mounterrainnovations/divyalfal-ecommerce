'use client';

import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ACTION_SOFT, FOCUS } from './styles';

/**
 * Ends the session. The cookie is httpOnly, so only `/api/admin/logout` can clear it; the
 * navigation afterwards is a full page load so the cleared cookie is the one the middleware
 * sees. Nothing in the browser decides who is signed in, which is why this is a one-line
 * button and not a state machine.
 *
 * It navigates to the sign-in screen even if the request fails: the next guarded request would
 * bounce there anyway, and leaving the admin sitting on a dead portal is worse.
 *
 * `className` exists for callers that need a different shape — a full-width row rather than a
 * button in a toolbar.
 *
 * `iconOnly` is the top bar's form: the bare door-and-arrow the reference admin puts at the
 * right end of its header. It keeps a real accessible name and a tooltip, because an icon
 * whose only explanation is its shape is a guess, not a label.
 */
export default function SignOutButton({
  className,
  iconOnly = false,
}: {
  className?: string;
  iconOnly?: boolean;
}) {
  const [leaving, setLeaving] = useState(false);

  if (iconOnly) {
    return (
      <button
        type="button"
        disabled={leaving}
        title="Sign out"
        aria-label={leaving ? 'Signing out' : 'Sign out'}
        onClick={async () => {
          setLeaving(true);
          try {
            await fetch('/api/admin/logout', { method: 'POST' });
          } catch {
            // Deliberately ignored — see above.
          }
          window.location.assign('/dashboard/login');
        }}
        className={cn(
          'rounded-md p-2 text-[var(--ds-muted)] transition-colors duration-150',
          'hover:bg-[var(--ds-surface-sunk)] hover:text-[var(--ds-ink)]',
          'disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none',
          FOCUS,
          className
        )}
      >
        <LogOut size={18} strokeWidth={1.75} aria-hidden="true" />
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={leaving}
      onClick={async () => {
        setLeaving(true);
        try {
          await fetch('/api/admin/logout', { method: 'POST' });
        } catch {
          // Deliberately ignored — see above.
        }
        window.location.assign('/dashboard/login');
      }}
      className={cn(ACTION_SOFT, className)}
    >
      <LogOut size={15} strokeWidth={1.75} aria-hidden="true" className="text-[var(--ds-faint)]" />
      {leaving ? 'Signing out' : 'Sign out'}
    </button>
  );
}
