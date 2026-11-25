import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import AdminShell from '@/components/admin/AdminShell';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth-verify';
import '@/components/admin/dashboard.css';

/**
 * The admin portal's layout.
 *
 * WHY IT IS A SERVER COMPONENT. The top bar has to show who is signed in, and the session is a
 * httpOnly JWT: no client code can read it, and there is no `/api/admin/me` to ask (adding one
 * is out of this task's remit, and would be a new endpoint for a fact the server already has
 * in hand). So the layout verifies the cookie with the same verifier the middleware uses —
 * `lib/auth-verify.ts`, one verifier in the codebase, nothing new — and passes the address to
 * the client shell. The path-dependent parts of the frame live in `AdminShell`.
 *
 * A failure here is not an error: `verifySessionToken` returns null for a missing, expired or
 * unsigned token, and the shell simply shows "Signed in" instead of an address. Access itself
 * is decided by `middleware.ts` and by `requireAdmin` in each route, never by this read.
 *
 * WHY `dashboard.css` IS IMPORTED HERE. It holds the portal's typeface and the rule that hides
 * the storefront's navigation bar on these routes. `app/globals.css` belongs to the shop and
 * the portal does not add to it, so the portal's own CSS is one file, imported once, at the
 * root of the only routes it applies to.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);

  return (
    <>
      {/* Every screen is a sidebar and a top bar away from its content; one link past both is
          the difference between a keyboard-usable portal and twelve tab stops per screen. */}
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-[var(--ds-ink)] focus:px-3 focus:py-2 focus:text-[13px] focus:font-medium focus:text-white"
      >
        Skip to content
      </a>
      <AdminShell admin={session?.email}>{children}</AdminShell>
    </>
  );
}
