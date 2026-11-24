'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, ExternalLink, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { currentItem } from './Sidebar';
import { FOCUS } from './styles';

/**
 * The portal's top bar: where you are, and who you are.
 *
 * It is sticky, 56px, and deliberately thin — the screen's own heading and primary action live
 * in the content below (`ScreenHead`), so putting them here too would be two headers arguing.
 * What belongs here is only what is true of the whole portal: the trail to the current screen,
 * the way out to the public site, and the signed-in admin.
 *
 * THE BREADCRUMB READS THE SIDEBAR'S LIST. `currentItem` resolves the path against the one
 * navigation definition in `Sidebar.tsx`, so a renamed screen is renamed in both places at
 * once and the bar can never name a section the sidebar does not have.
 *
 * THE ADMIN'S EMAIL COMES FROM THE SERVER. The session cookie is httpOnly, so no client code
 * can read it; `app/dashboard/layout.tsx` verifies it on the server and passes the address
 * down. When it cannot be read — no `JWT_SECRET`, an expired token mid-session — the chip says
 * "Signed in" rather than inventing a name.
 */
export default function TopBar({
  onOpenNav,
  admin,
}: {
  onOpenNav: () => void;
  admin?: string;
}) {
  const pathname = usePathname();
  const item = currentItem(pathname);

  // The initial in the avatar. A letter from the address the server verified, nothing derived.
  const initial = (admin?.trim().charAt(0) || 'A').toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-slate-200 bg-white/95 px-3 backdrop-blur-sm sm:px-5">
      <button
        type="button"
        onClick={onOpenNav}
        aria-label="Open navigation"
        className={cn(
          'rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-ink lg:hidden',
          FOCUS
        )}
      >
        <Menu size={18} strokeWidth={1.75} aria-hidden="true" />
      </button>

      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex min-w-0 items-center gap-1 text-[13px]">
          <li className="shrink-0">
            <Link
              href="/dashboard"
              className={cn('rounded px-1 py-0.5 text-slate-500 hover:text-ink', FOCUS)}
            >
              Admin
            </Link>
          </li>
          <li aria-hidden="true" className="shrink-0 text-slate-300">
            <ChevronRight size={14} strokeWidth={2} />
          </li>
          <li className="min-w-0">
            {/* `aria-current` on a span and not a link: this is where we already are. An
                unrecognised path still gets a name, because a trail that ends in nothing
                reads as a broken page rather than an unlisted one. */}
            <span aria-current="page" className="block truncate px-1 font-semibold text-ink">
              {item?.label ?? 'Overview'}
            </span>
          </li>
        </ol>
      </nav>

      <Link
        href="/"
        className={cn(
          'hidden items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-slate-100 hover:text-ink sm:inline-flex',
          FOCUS
        )}
      >
        View site
        <ExternalLink size={14} strokeWidth={1.75} aria-hidden="true" />
      </Link>

      <div className="flex min-w-0 items-center gap-2 border-l border-slate-200 pl-2 sm:pl-3">
        <span
          aria-hidden="true"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[12px] font-semibold text-slate-700"
        >
          {initial}
        </span>
        <span className="hidden min-w-0 md:block">
          <span className="block truncate text-[12px] leading-4 font-medium text-ink">
            {admin ?? 'Signed in'}
          </span>
          <span className="block text-[11px] leading-4 text-slate-500">Administrator</span>
        </span>
      </div>
    </header>
  );
}
