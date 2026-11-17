'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Rail from '@/components/admin/Rail';
import SignOutButton from '@/components/admin/SignOutButton';
import { ACTION_QUIET, FOCUS, LABEL, RULE } from '@/components/admin/styles';
import { cn } from '@/lib/utils';
import { siteCopy } from '@/lib/content/site-copy';

/**
 * The admin portal's shell: one compact header, the section rail, and the screen.
 *
 * WHY THIS IS A CLIENT COMPONENT. Two things need the current path — the rail's
 * `aria-current`, and the fact that `/dashboard/login` must render *without* the shell
 * (a rail whose every link bounces back to the login screen is furniture, not navigation).
 * A server layout cannot read the path. `children` is still whatever the route is, so the
 * Overview screen below remains a server component that queries the database directly; only
 * this frame hydrates.
 *
 * WHY THE `<style>` BLOCK. `app/layout.tsx` renders the storefront `NavBar` on every route,
 * including this one, and the root layout is outside this task's remit (another agent is
 * working in the tree). A portal does not want the shop's primary navigation above its own
 * header, so the two elements the navbar renders — its fixed bar and the spacer that holds
 * pages clear of it — are hidden here, by the data attributes the navbar already carries.
 * The rule ships only in the markup of `/dashboard/*`, so the storefront is untouched. When
 * the root layout can be edited, the storefront nav should be excluded from `/dashboard`
 * there and this block deleted.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const bare = pathname === '/dashboard/login';

  return (
    <>
      <style>{`
        header[data-condensed], [data-nav-spacer] { display: none !important; }
      `}</style>

      {bare ? (
        children
      ) : (
        <div className="min-h-screen bg-paper font-ui text-caption text-ink">
          <header
            className={cn(
              'flex h-11 items-center justify-between gap-4 border-b px-[var(--gutter)]',
              RULE
            )}
          >
            <div className="flex min-w-0 items-baseline gap-3">
              <Link
                href="/dashboard"
                className={cn(
                  'font-display text-[13px] uppercase tracking-(--tracking-wordmark) text-ink',
                  FOCUS
                )}
              >
                {siteCopy.home.hero.wordmark}
              </Link>
              <span className={cn(LABEL, 'hidden sm:inline')}>Portal</span>
            </div>

            <div className="flex shrink-0 items-center gap-6">
              <Link href="/" className={cn(ACTION_QUIET)}>
                View site
              </Link>
              <SignOutButton />
            </div>
          </header>

          <div className="flex flex-col md:flex-row">
            <Rail />
            <div className="min-w-0 flex-1">{children}</div>
          </div>
        </div>
      )}
    </>
  );
}
