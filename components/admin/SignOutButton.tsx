'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ACTION_QUIET } from './styles';

/**
 * Ends the session. The cookie is httpOnly, so only `/api/admin/logout` can clear it; the
 * navigation afterwards is a full page load so the cleared cookie is the one the middleware
 * sees. Nothing in the browser decides who is signed in, which is why this is a one-line
 * button and not a state machine.
 *
 * It navigates to the login screen even if the request fails: the next guarded request
 * would bounce there anyway, and leaving the admin sitting on a dead portal is worse.
 */
export default function SignOutButton() {
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
      className={cn(ACTION_QUIET)}
    >
      {leaving ? 'Signing out' : 'Sign out'}
    </button>
  );
}
