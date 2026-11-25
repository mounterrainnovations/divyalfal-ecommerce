'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_COLLECTIONS, parseCollections, type Collection } from '@/lib/content/collections';

/**
 * The collections the storefront shows, for the homepage strip that shows them.
 *
 * It is `lib/hooks/useShowcase.ts` with one addition, and the addition is the whole reason this
 * is a separate hook rather than a third list on that one.
 *
 * `useShowcase` exposes no loading state because it cannot need one: its defaults are the
 * arrays that are live on the site, so its sections have real content from the first frame and
 * the fetch can only ever *replace* them. Here the default is an empty list, and an empty list
 * does not mean "nothing to draw" — it means "draw the other thing", the product strip the
 * section has always shown (see `components/sections/explore.tsx`). Those are two different
 * layouts, so a consumer that rendered on the default and then swapped would show the product
 * strip for a frame and then throw it away, which is a visible flash on every page load for
 * every shop that has collections. `ready` is what lets the section wait for the answer before
 * it commits to a layout.
 *
 * `ready` becomes true whether the fetch succeeded or not, because the fallback is a real
 * answer and not an error state: a shop with no collections and a shop whose database is
 * unreachable should both end up looking at the product strip, not at a spinner.
 */
export function useCollections(): { collections: Collection[]; ready: boolean } {
  const [collections, setCollections] = useState<Collection[]>(DEFAULT_COLLECTIONS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        // `no-store` is about the *browser's* copy only; the CDN still caches the response for
        // everyone (see the route's Cache-Control). Without it a tab left open across an edit
        // keeps drawing the collections it fetched when it loaded.
        const response = await fetch('/api/collections', {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!response.ok) return;
        const body: unknown = await response.json();
        if (!body || typeof body !== 'object') return;

        // Re-parsed on this side too. The endpoint is ours, but a cached response from an
        // older deploy is a real shape to defend against, and the parser is already written —
        // and this is what guarantees the slugs the strip links to are URL-safe.
        const stored = parseCollections((body as { collections?: unknown }).collections);
        if (stored) setCollections(stored);
      } catch {
        // Keep the defaults. See above: an empty list is the designed outcome of a failure,
        // not a swallowed bug — it is what tells the section to show the product strip.
      } finally {
        // Not in the `catch`: an aborted fetch (the component unmounted) must not set state,
        // and `finally` runs for the abort too — so the guard is the controller's own signal.
        if (!controller.signal.aborted) setReady(true);
      }
    })();

    return () => controller.abort();
  }, []);

  return { collections, ready };
}
