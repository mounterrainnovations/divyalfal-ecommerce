'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

/**
 * The portal's frame: sidebar, top bar, and the screen.
 *
 * WHY THIS IS A CLIENT COMPONENT AND THE LAYOUT IS NOT. Two things here need the current path —
 * the sidebar's active item, and the fact that `/dashboard/login` must render *without* the
 * frame (a sidebar whose every link bounces back to the sign-in screen is furniture, not
 * navigation). A server layout cannot read the path, but it can read the session cookie, which
 * no client code can. So the layout does the session and hands the address down, and this
 * component does the path. `children` is still whatever the route is, so the Overview screen
 * remains a server component that queries the database directly; only the frame hydrates.
 *
 * WHY THE DRAWER STATE LIVES HERE. The sidebar is off-canvas below `lg` and the button that
 * opens it is in the top bar — two siblings — so the one piece of state they share belongs to
 * their parent. Closing it on navigation is the sidebar's own job (each link calls `onClose`),
 * not an effect on `pathname`: tapping a section should leave you looking at that section, and
 * an effect that calls `setState` on every route change is a cascading render for a fact the
 * click already knew.
 */
export default function AdminShell({
  children,
  admin,
}: {
  children: ReactNode;
  /** The signed-in admin's email, verified on the server. Undefined if it could not be read. */
  admin?: string;
}) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);

  // While the drawer is open it is the only thing on screen; letting the page behind it scroll
  // is how a phone ends up showing a menu floating over a half-scrolled table.
  useEffect(() => {
    if (!navOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [navOpen]);

  // The sign-in screen is its own page: no frame, no navigation, nothing to sign out of. It
  // still carries `ds-root`, which is what sets the portal's typeface and hides the shop's
  // navigation bar (see `dashboard.css`).
  if (pathname === '/dashboard/login') {
    return <div className="ds-root min-h-screen bg-slate-50">{children}</div>;
  }

  return (
    <div className="ds-root min-h-screen bg-slate-50 text-slate-700">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} admin={admin} />

      <div className="lg:pl-[244px]">
        <TopBar onOpenNav={() => setNavOpen(true)} admin={admin} />
        {/* `id` so the skip link in `layout.tsx` has somewhere to go. */}
        <main id="admin-main">{children}</main>
      </div>
    </div>
  );
}
