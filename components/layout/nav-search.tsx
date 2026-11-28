'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The magnifier at the right end of the navigation, and the field behind it.
 *
 * IT IS A REAL SEARCH, which is the only reason it is here. `/products` has always kept a
 * `search` string in its filter state and `/api/products` has always accepted a `search`
 * parameter — the listing simply never read one off the URL, so nothing could link into a
 * search. This submits to `/products?q=…` and that page now seeds its filter from it.
 *
 * The owner's mock-up also shows a heart and a shopping bag beside this. They are not here,
 * and that is deliberate: this shop has no wishlist and no cart. A bag icon in a shop's
 * header is a promise that there is a basket behind it; a shopper who clicks one and gets
 * nothing has been told something untrue about the site. The moment either is built, this is
 * the row they belong in.
 *
 * WHY THE FIELD IS COLLAPSED BY DEFAULT. A permanent input in the bar competes with the
 * wordmark and the menu at exactly the width where the menu is already tight. Collapsed, the
 * bar keeps its proportions; expanded, it takes the space it needs and gives it back.
 */
export default function NavSearch({ className }: { className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldId = useId();

  // Opening it and not landing in it would mean a second click, or a reach for the mouse from
  // a keyboard. The effect runs only on the transition into `open`.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function close() {
    setOpen(false);
    setTerm('');
  }

  return (
    <div className={cn('flex items-center', className)}>
      {open ? (
        <form
          role="search"
          onSubmit={event => {
            event.preventDefault();
            const query = term.trim();
            // An empty submit is a request to see everything, not a request for nothing.
            router.push(query ? `/products?q=${encodeURIComponent(query)}` : '/products');
            close();
          }}
          className="flex items-center gap-1"
        >
          <label htmlFor={fieldId} className="sr-only">
            Search the catalogue
          </label>
          <input
            id={fieldId}
            ref={inputRef}
            type="search"
            value={term}
            onChange={event => setTerm(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Escape') close();
            }}
            placeholder="Search garments…"
            className="h-10 w-44 border-b border-gray-400 bg-transparent px-1 text-sm text-gray-900 placeholder:text-gray-500 focus:border-gray-900 focus:outline-none xl:w-56"
          />
          <button
            type="submit"
            aria-label="Search"
            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-700 transition hover:bg-black/5 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:outline-none"
          >
            <Search size={18} strokeWidth={1.6} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={close}
            aria-label="Close search"
            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition hover:bg-black/5 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:outline-none"
          >
            <X size={17} strokeWidth={1.6} aria-hidden="true" />
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Search the catalogue"
          aria-expanded={false}
          className="flex h-10 w-10 items-center justify-center rounded-full text-gray-700 transition hover:bg-black/5 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:outline-none"
        >
          <Search size={18} strokeWidth={1.6} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
