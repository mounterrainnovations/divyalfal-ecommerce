'use client';

import { usePathname } from 'next/navigation';
import NavBar from '@/components/layout/navbar';

/**
 * The storefront's chrome, and the one place that decides where it does not belong.
 *
 * The root layout rendered `<NavBar />` and `<main className="pt-24">` on every route,
 * including `/dashboard`, so the shop's logo sat on top of the admin portal and the portal
 * started 96px down the page. The portal's stylesheet had been papering over that with
 * `body:has(.ds-root) > nav { display: none }` — a selector that reached out of the portal,
 * up to the root layout's markup, and matched on its shape. It worked, and it would have
 * broken silently the next time that file changed.
 *
 * So the decision lives here instead, as a decision: the storefront chrome renders on
 * storefront routes and not on portal ones. `/dashboard` brings its own shell, its own
 * header and its own spacing.
 *
 * This is a client component only because the pathname is not available to a server layout.
 * It renders no state of its own and nothing below it is forced client-side: `children` is
 * still whatever the server rendered, passed straight through.
 *
 * The alternative is a `(site)` route group with its own layout, which Next would prefer and
 * which needs no client boundary at all. It also means moving every storefront route on disk,
 * so it is the right change to make on its own and not in the middle of a redesign.
 */
export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPortal = pathname === '/dashboard' || pathname.startsWith('/dashboard/');

  if (isPortal) return <>{children}</>;

  return (
    <>
      <NavBar />
      {/* Clears the fixed navbar. The portal, above, gets neither. */}
      <main className="pt-24">{children}</main>
    </>
  );
}
