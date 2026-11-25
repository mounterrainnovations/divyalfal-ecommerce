'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Images,
  LayoutDashboard,
  LayoutTemplate,
  Mail,
  Quote,
  Settings,
  Shapes,
  ShoppingBag,
  Type,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { request } from '@/lib/admin/api';
import { ENQUIRIES_CHANGED } from '@/lib/admin/events';
import { siteCopy } from '@/lib/content/site-copy';
import { FOCUS, badge } from './styles';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** One line of what the screen is for, read out by assistive tech via `title`. */
  hint?: string;
}

/**
 * The portal's nine screens, in the order an admin works through them.
 *
 * WHY THE LIST IS FLAT. It used to be three labelled groups (Shop / Site / nothing). The
 * reference admin the owner asked this portal to follow lists sixteen screens flat, with
 * nothing but an icon and a word, and the grouping was costing two heading rows to explain an
 * order that is already obvious. Flat it is — and it stays the single source of truth for the
 * shell's title, which looks the current screen up here rather than keeping a second list of
 * names.
 *
 * Categories and Testimonials are the two most recent: both are sections that have always been
 * on the public homepage and were, until now, arrays in source that only a deploy could change.
 */
export const NAV: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Products', href: '/dashboard/products', icon: ShoppingBag },
  { label: 'Categories', href: '/dashboard/categories', icon: Shapes },
  { label: 'Enquiries', href: '/dashboard/enquiries', icon: Mail },
  { label: 'Media', href: '/dashboard/media', icon: Images },
  { label: 'Testimonials', href: '/dashboard/testimonials', icon: Quote },
  { label: 'Content', href: '/dashboard/content', icon: Type },
  { label: 'Homepage', href: '/dashboard/homepage', icon: LayoutTemplate },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

/** The same list under its older name, for callers that only want every item. */
export const NAV_ITEMS: NavItem[] = NAV;

/**
 * Dashboard is `/dashboard` exactly — every other screen is nested beneath it, so a prefix
 * test would mark Dashboard current on all seven.
 */
export function isCurrent(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The current screen, for the top bar and the document's own sense of place. */
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
 * The portal's sidebar: the brand lockup, then the nine screens.
 *
 * It is one element at every width rather than a sidebar plus a separate mobile menu, so there
 * is one nav in the accessibility tree and one active state to keep right. Below `lg` it is
 * off-canvas and slides in over a scrim (`open`/`onClose`, owned by `AdminShell`); from `lg` up
 * it is simply always there and the scrim never renders.
 *
 * THE CURRENT ITEM IS MARKED THREE WAYS and none of them is colour alone: a peach fill that is
 * a 9% step off the sidebar's own surface, the label and icon turning terracotta where the
 * rest are muted, and `aria-current="page"` for a reader. Nothing here depends on telling two
 * similar browns apart.
 *
 * SIGNING OUT IS NOT HERE. It is the icon at the right end of the top bar, where the reference
 * admin puts it and where it sits beside the name of whoever would be signing out.
 */
export default function Sidebar({
  open,
  onClose,
}: {
  /** Whether the off-canvas drawer is showing. Ignored from `lg` up. */
  open: boolean;
  onClose: () => void;
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
          'fixed inset-0 z-30 bg-[#2a211b]/40 transition-opacity duration-200 lg:hidden',
          'motion-reduce:transition-none',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      />

      <div
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col',
          'border-r border-[var(--ds-line)] bg-[var(--ds-surface)]',
          'transition-transform duration-200 motion-reduce:transition-none',
          'lg:translate-x-0 lg:visible',
          // `invisible` and not just the translate: an off-canvas drawer whose links are still
          // in the tab order sends a keyboard user into navigation they cannot see.
          open ? 'translate-x-0' : 'invisible -translate-x-full'
        )}
      >
        <div className="flex h-16 shrink-0 items-center gap-2 border-b border-[var(--ds-line)] px-4">
          <Link
            href="/dashboard"
            className={cn(
              'flex min-w-0 items-center gap-2.5 rounded-md px-1 py-1',
              'hover:bg-[var(--ds-surface-sunk)]',
              FOCUS
            )}
          >
            {/* The brand mark: the wordmark's initial, in the accent, on its wash. The shop's
                own logotype is a display face the portal does not set, so this is a monogram
                rather than a shrunken version of something editorial. */}
            <span
              aria-hidden="true"
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                'bg-[var(--ds-accent-soft)] text-[14px] font-semibold text-[var(--ds-accent)]'
              )}
            >
              {siteCopy.home.hero.wordmark.charAt(0)}
            </span>
            <span className="min-w-0 truncate text-[15px] leading-5 text-[var(--ds-ink)]">
              <span className="font-semibold">{siteCopy.home.hero.wordmark}</span>{' '}
              <span className="font-normal text-[var(--ds-faint)]">Admin</span>
            </span>
          </Link>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className={cn(
              'ml-auto rounded-md p-1.5 text-[var(--ds-faint)] lg:hidden',
              'hover:bg-[var(--ds-surface-sunk)] hover:text-[var(--ds-ink)]',
              FOCUS
            )}
          >
            <X size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Portal sections" className="ds-scroll min-h-0 flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {NAV.map(item => {
              const current = isCurrent(pathname, item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={current ? 'page' : undefined}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2.5 text-[14px] font-medium',
                      'transition-colors duration-150 motion-reduce:transition-none',
                      FOCUS,
                      current
                        ? 'bg-[var(--ds-accent-soft)] text-[var(--ds-accent)]'
                        : 'text-[var(--ds-muted)] hover:bg-[var(--ds-surface-sunk)] hover:text-[var(--ds-ink)]'
                    )}
                  >
                    <Icon
                      size={18}
                      strokeWidth={1.75}
                      aria-hidden="true"
                      className={cn('shrink-0', current ? '' : 'text-[var(--ds-faint)]')}
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
        </nav>
      </div>
    </>
  );
}
