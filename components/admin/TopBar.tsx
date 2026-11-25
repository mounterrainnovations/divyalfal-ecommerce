'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ExternalLink, Menu, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import SignOutButton from './SignOutButton';
import { FOCUS, INPUT } from './styles';

/**
 * The portal's top bar: the way into the catalogue, and who you are.
 *
 * It is sticky, 64px, and holds only what is true of the whole portal — the search, the way
 * out to the public site, the signed-in admin, and the way out of the session. The screen's
 * own heading and primary action live in the content below (`ScreenHead`), so putting them
 * here too would be two headers arguing.
 *
 * WHY THE BREADCRUMB IS GONE. It used to read "Admin › Products", which restated the sidebar's
 * own highlighted row two inches to the right. The reference admin spends that space on a
 * search field instead, and so does this one.
 *
 * THE SEARCH IS REAL. It submits to the Products screen with `?q=`, which that screen reads on
 * mount and on every change (see `app/dashboard/products/page.tsx`), so a term typed here lands
 * as a filtered catalogue rather than as a page that ignored you. Products is the only screen
 * it searches, and the placeholder says so — a box labelled "search everything" that quietly
 * searches one table is worse than a box that tells the truth.
 *
 * THE ADMIN'S EMAIL COMES FROM THE SERVER. The session cookie is httpOnly, so no client code
 * can read it; `app/dashboard/layout.tsx` verifies it on the server and passes the address
 * down. When it cannot be read — no `JWT_SECRET`, an expired token mid-session — the chip says
 * "Signed in" rather than inventing a name.
 */
export default function TopBar({ onOpenNav, admin }: { onOpenNav: () => void; admin?: string }) {
  const router = useRouter();
  const [term, setTerm] = useState('');

  // The initial in the avatar. A letter from the address the server verified, nothing derived.
  const initial = (admin?.trim().charAt(0) || 'A').toUpperCase();

  return (
    <header
      className={cn(
        'sticky top-0 z-20 flex h-16 items-center gap-3 px-4 sm:px-6',
        'border-b border-[var(--ds-line)] bg-[var(--ds-surface)]'
      )}
    >
      <button
        type="button"
        onClick={onOpenNav}
        aria-label="Open navigation"
        className={cn(
          'rounded-md p-2 text-[var(--ds-muted)] lg:hidden',
          'hover:bg-[var(--ds-surface-sunk)] hover:text-[var(--ds-ink)]',
          FOCUS
        )}
      >
        <Menu size={18} strokeWidth={1.75} aria-hidden="true" />
      </button>

      <form
        role="search"
        onSubmit={event => {
          event.preventDefault();
          const query = term.trim();
          router.push(query ? `/dashboard/products?q=${encodeURIComponent(query)}` : '/dashboard/products');
        }}
        className="min-w-0 flex-1 sm:max-w-sm"
      >
        <label htmlFor="portal-search" className="sr-only">
          Search products
        </label>
        <div className="relative">
          <Search
            size={16}
            strokeWidth={1.75}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--ds-faint)]"
          />
          <input
            id="portal-search"
            type="search"
            value={term}
            onChange={event => setTerm(event.target.value)}
            placeholder="Search products by name or detail…"
            className={cn(INPUT, 'bg-[var(--ds-surface-sunk)] pl-9')}
          />
        </div>
      </form>

      <Link
        href="/"
        className={cn(
          'ml-auto hidden items-center gap-1.5 rounded-md px-2.5 py-2 text-[14px] font-medium',
          'text-[var(--ds-muted)] hover:bg-[var(--ds-surface-sunk)] hover:text-[var(--ds-ink)] md:inline-flex',
          FOCUS
        )}
      >
        View site
        <ExternalLink size={15} strokeWidth={1.75} aria-hidden="true" />
      </Link>

      <div className="flex min-w-0 shrink-0 items-center gap-2.5 md:ml-0 ml-auto">
        <span
          aria-hidden="true"
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
            'bg-[var(--ds-accent-soft)] text-[13px] font-semibold text-[var(--ds-accent)]'
          )}
        >
          {initial}
        </span>
        {/* The address is the title, not the label: a long address would push the sign-out
            control off a laptop screen, and "Admin" is what the row is for. */}
        <span
          title={admin ?? undefined}
          className="hidden text-[14px] font-medium text-[var(--ds-ink)] sm:block"
        >
          {admin ? 'Admin' : 'Signed in'}
        </span>
        <SignOutButton iconOnly />
      </div>
    </header>
  );
}
