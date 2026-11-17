'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { request } from '@/lib/admin/api';
import { ENQUIRIES_CHANGED } from '@/lib/admin/events';
import { FOCUS, LABEL, RULE } from './styles';

export interface RailSection {
  label: string;
  href: string;
}

/** The portal's seven sections, in the order the plan names them. */
export const SECTIONS: RailSection[] = [
  { label: 'Overview', href: '/dashboard' },
  { label: 'Products', href: '/dashboard/products' },
  { label: 'Media', href: '/dashboard/media' },
  { label: 'Content', href: '/dashboard/content' },
  { label: 'Homepage', href: '/dashboard/homepage' },
  { label: 'Settings', href: '/dashboard/settings' },
  { label: 'Enquiries', href: '/dashboard/enquiries' },
];

/**
 * Overview is `/dashboard` exactly — every other section is nested beneath it, so a prefix
 * test would mark Overview current on all seven screens.
 */
export function isCurrent(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The section rail. A left column from 768px up; a horizontal scroller under the header
 * below it, so a phone keeps every section one tap away without a drawer to open.
 *
 * The current item is the one gold mark on the screen: a hairline on its leading edge
 * (left on the rail, under the item on the phone row) and ink type instead of soft.
 * `aria-current="page"` carries the same fact to a screen reader.
 */
/**
 * How many enquiries are waiting, for the mark beside the Enquiries item.
 *
 * Refetched on every navigation, because that is when the count is most likely to be stale,
 * and updated without a request while the admin works in the Enquiries screen — which
 * announces each change on `ENQUIRIES_CHANGED` (see `lib/admin/events.ts`).
 *
 * A failure is silence. Until the CMS migration is applied this request answers 503, and a
 * portal rail is the last place that should carry an error about a table.
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

export default function Rail() {
  const pathname = usePathname();
  const unread = useUnreadEnquiries(pathname);

  return (
    <nav
      aria-label="Portal sections"
      className={cn(
        'shrink-0 border-b md:w-[164px] md:border-r md:border-b-0',
        RULE,
        'bg-paper md:min-h-[calc(100vh-44px)]'
      )}
    >
      <ul className="scrollbar-hide flex overflow-x-auto px-[var(--gutter)] md:flex-col md:px-0 md:py-3">
        {SECTIONS.map(section => {
          const current = isCurrent(pathname, section.href);
          return (
            <li key={section.href} className="shrink-0">
              <Link
                href={section.href}
                aria-current={current ? 'page' : undefined}
                className={cn(
                  LABEL,
                  FOCUS,
                  'block whitespace-nowrap border-transparent px-3 py-2.5 transition-colors duration-200',
                  'border-b-2 md:border-b-0 md:border-l-2 md:py-1.5 md:pr-3 md:pl-4',
                  'hover:text-ink motion-reduce:transition-none',
                  current && 'border-gold text-ink'
                )}
              >
                {section.label}
                {section.href === '/dashboard/enquiries' && unread > 0 ? (
                  <span className="text-ink"> · {unread}</span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
