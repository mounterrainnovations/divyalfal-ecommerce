'use client';

import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ACTION_SOFT } from './styles';

/**
 * Ends the session. The cookie is httpOnly, so only `/api/admin/logout` can clear it; the
 * navigation afterwards is a full page load so the cleared cookie is the one the middleware
 * sees. Nothing in the browser decides who is signed in, which is why this is a one-line
 * button and not a state machine.
 *
 * It navigates to the sign-in screen even if the request fails: the next guarded request would
 * bounce there anyway, and leaving the admin sitting on a dead portal is worse.
 *
 * `className` exists for one caller — the sidebar, where it is a full-width row pinned to the
 * bottom rather than a button in a toolbar.
 */
export default function SignOutButton({ className }: { className?: string }) {
  const [leaving, setLeaving] = useState(false);

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
      <LogOut size={15} strokeWidth={1.75} aria-hidden="true" className="text-slate-400" />
      {leaving ? 'Signing out' : 'Sign out'}
    </button>
  );
}
