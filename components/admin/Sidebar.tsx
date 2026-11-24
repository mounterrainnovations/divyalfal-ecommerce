'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Images,
  LayoutDashboard,
  LayoutTemplate,
  Mail,
  Settings,
  ShoppingBag,
  Type,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { request } from '@/lib/admin/api';
import { ENQUIRIES_CHANGED } from '@/lib/admin/events';
import { siteCopy } from '@/lib/content/site-copy';
import SignOutButton from './SignOutButton';
import { FOCUS, badge } from './styles';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** One line of what the screen is for, read out by assistive tech via `title`. */
  hint?: string;
}

export interface NavGroup {
  /** The group's name, or `''` for the first group, which needs no heading. */
  label: string;
  items: NavItem[];
}

/**
 * The portal's seven screens, grouped by what they are for.
 *
 * The old rail listed all seven flat, in a plan's order, which gave no clue that Products and
 * Media are the daily work while Content and Homepage are the site's presentation. Three short
 * groups do that work, and they are also the breadcrumb's source of truth — `TopBar` looks the
 * current screen up here rather than keeping a second list of names.
 */
export const NAV: NavGroup[] = [
  {
    label: '',
    items: [{ label: 'Overview', href: '/dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Shop',
    items: [
      { label: 'Products', href: '/dashboard/products', icon: ShoppingBag },
      { label: 'Media', href: '/dashboard/media', icon: Images },
      { label: 'Enquiries', href: '/dashboard/enquiries', icon: Mail },
    ],
  },
  {
    label: 'Site',
    items: [
      { label: 'Content', href: '/dashboard/content', icon: Type },
      { label: 'Homepage', href: '/dashboard/homepage', icon: LayoutTemplate },
      { label: 'Settings', href: '/dashboard/settings', icon: Settings },
    ],
  },
];

/** Every item, flat, for the lookups that do not care about grouping. */
export const NAV_ITEMS: NavItem[] = NAV.flatMap(group => group.items);

/**
 * Overview is `/dashboard` exactly — every other screen is nested beneath it, so a prefix test
 * would mark Overview current on all seven.
 */
export function isCurrent(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The current screen, for the top bar's breadcrumb and the document's own sense of place. */
export function currentItem(pathname: string | null): NavItem | undefined {
  return NAV_ITEMS.find(item => isCurrent(pathname, item.href));
}

/**
 * How many enquiries are waiting, for the count beside the Enquiries item.
 *
 * Refetched on every navigation, because that is when the count is most likely to be stale,
 * and updated without a request while the admin works in the Enquiries screen — which
 * announces each change on `ENQUIRIES_CHANGED` (see `lib/admin/events.ts`).
 *
 * A failure is silence. Until the CMS migration is applied this request answers 503, and a
 * sidebar is the last place that should carry an error about a missing table.
 */
function useUnreadEnquiries(pathname: string | null): number {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    const read = async () => {
      const answer = await request<{ unread: number }>('/api/admin/enquiries?limit=1', {
        signal: controller.signal,
      });
      if (answer.ok && answer.data) setUnread(answer.data.unread);
    };
    read();

    const listen = (event: Event) => {
      const count = (event as CustomEvent<number>).detail;
      if (typeof count === 'number') setUnread(count);
    };
    window.addEventListener(ENQUIRIES_CHANGED, listen);

    return () => {
      controller.abort();
      window.removeEventListener(ENQUIRIES_CHANGED, listen);
    };
  }, [pathname]);

  return unread;
}

/**
 * The portal's sidebar: brand mark, grouped navigation, sign-out pinned to the bottom.
 *
 * It is one element at every width rather than a sidebar plus a separate mobile menu, so there
 * is one nav in the accessibility tree and one active state to keep right. Below `lg` it is
 * off-canvas and slides in over a scrim (`open`/`onClose`, owned by `AdminShell`); from `lg` up
 * it is simply always there and the scrim never renders.
 *
 * The current item is marked three ways on purpose — a slate fill, ink type where the rest are
 * slate, and a gold bar on the leading edge — because the fill alone is a 4% difference that
 * disappears on a dim laptop screen. `aria-current="page"` carries the same fact to a reader.
 */
export default function Sidebar({
  open,
  onClose,
  admin,
}: {
  /** Whether the off-canvas drawer is showing. Ignored from `lg` up. */
  open: boolean;
  onClose: () => void;
  /** The signed-in admin's email, when the session could be read. */
  admin?: string;
}) {
  const pathname = usePathname();
  const unread = useUnreadEnquiries(pathname);

  // Escape closes the drawer: it is the shortcut anyone who opened it by keyboard will try.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  return (
    <>
      {/* The scrim. `lg:hidden` rather than conditional, so the drawer can animate out. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-30 bg-slate-900/40 transition-opacity duration-200 lg:hidden',
          'motion-reduce:transition-none',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      />

      <div
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[244px] flex-col border-r border-slate-200 bg-white',
          'transition-transform duration-200 motion-reduce:transition-none',
          'lg:translate-x-0 lg:visible',
          // `invisible` and not just the translate: an off-canvas drawer whose links are still
          // in the tab order sends a keyboard user into navigation they cannot see.
          open ? 'translate-x-0' : 'invisible -translate-x-full'
        )}
      >
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 px-3">
          <Link
            href="/dashboard"
            className={cn(
              'flex min-w-0 items-center gap-2.5 rounded-md px-1 py-1 hover:bg-slate-50',
              FOCUS
            )}
          >
            {/* The brand mark: the wordmark's initial in ink. The shop's own logotype is a
                display face the portal does not set, so this is a monogram rather than a
                shrunken version of something editorial. */}
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-ink text-[13px] font-semibold text-white"
            >
              {siteCopy.home.hero.wordmark.charAt(0)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] leading-4 font-semibold text-ink">
                {siteCopy.home.hero.wordmark}
              </span>
              <span className="block text-[11px] leading-4 text-slate-500">Admin</span>
            </span>
          </Link>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className={cn(
              'ml-auto rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-ink lg:hidden',
              FOCUS
            )}
          >
            <X size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Portal sections" className="ds-scroll min-h-0 flex-1 overflow-y-auto p-3">
          {NAV.map(group => (
            <div key={group.label || 'main'} className="mb-4 last:mb-0">
              {group.label ? (
                <p className="mb-1 px-2 text-[11px] leading-4 font-semibold tracking-[0.04em] text-slate-400 uppercase">
                  {group.label}
                </p>
              ) : null}
              <ul className="space-y-0.5">
                {group.items.map(item => {
                  const current = isCurrent(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={current ? 'page' : undefined}
                        onClick={onClose}
                        className={cn(
                          'relative flex items-center gap-2.5 rounded-md py-2 pr-2 pl-2.5 text-[13px] font-medium',
                          'transition-colors duration-150 motion-reduce:transition-none',
                          FOCUS,
                          current
                            ? 'bg-slate-100 text-ink'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-ink'
                        )}
                      >
                        {current ? (
                          <span
                            aria-hidden="true"
                            className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-gold"
                          />
                        ) : null}
                        <Icon
                          size={16}
                          strokeWidth={1.75}
                          aria-hidden="true"
                          className={cn('shrink-0', current ? 'text-ink' : 'text-slate-400')}
                        />
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {item.href === '/dashboard/enquiries' && unread > 0 ? (
                          <span className={badge('accent')}>{unread}</span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Pinned, out of the scroll: who is signed in, and the way out. */}
        <div className="shrink-0 border-t border-slate-200 p-3">
          {admin ? (
            <p className="mb-2 truncate px-1 text-[11px] leading-4 text-slate-500" title={admin}>
              {admin}
            </p>
          ) : null}
          <SignOutButton className="w-full justify-start" />
        </div>
      </div>
    </>
  );
}
