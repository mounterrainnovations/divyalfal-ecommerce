'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { FOCUS, LABEL, RULE } from './styles';

export interface RailSection {
  label: string;
  href: string;
}

/**
 * The portal's seven sections, in the order the plan names them. Overview and Products are
 * built; the other five are route stubs until their screens land.
 */
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
export default function Rail() {
  const pathname = usePathname();

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
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
