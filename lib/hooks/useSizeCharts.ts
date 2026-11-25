'use client';

import { useEffect, useState } from 'react';
import {
  DEFAULT_SIZE_CHARTS,
  parseSizeCharts,
  type SizeChart,
} from '@/lib/content/size-charts';

/**
 * The shop's size charts, for a client component that needs them.
 *
 * IT STARTS EMPTY, AND EMPTY IS THE SAFE STATE HERE. `useShowcase` starts with the arrays that
 * are live on the homepage because a category strip must never flash empty. A size guide is the
 * opposite: showing nothing is correct, and the one thing that must never happen is a garment's
 * page displaying measurements that are not the shop's. So a database that is down, a 500, a
 * half-written row or a flaky connection all leave the page with no size guide — the state it
 * has been in since launch — rather than with a guessed table.
 *
 * NOT USED BY THE PRODUCT PAGE, DELIBERATELY. `app/product/[id]/page.tsx` is a server
 * component and reads the charts through the repository in the same render as the product, so
 * the "Size guide" button is in the first HTML and never pops in a moment late. This hook is
 * for client surfaces that have no server render to hang a chart off — a quick-view drawer, a
 * cart-side guide — and it exists so the next one does not re-derive the fetch, the re-parse
 * and the fallback by hand.
 */
export function useSizeCharts(): { charts: SizeChart[] } {
  const [charts, setCharts] = useState<SizeChart[]>(DEFAULT_SIZE_CHARTS);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        // `no-store` is about the *browser's* copy only; the CDN still caches the response for
        // everyone (see the route's Cache-Control). Without it a tab left open across an edit
        // keeps the charts it fetched when it loaded.
        const response = await fetch('/api/size-charts', {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!response.ok) return;
        const body: unknown = await response.json();
        if (!body || typeof body !== 'object') return;

        // Re-parsed on this side too. The endpoint is ours, but a cached response from an
        // older deploy is a real shape to defend against, and the parser is already written.
        const parsed = parseSizeCharts((body as { charts?: unknown }).charts);
        if (parsed) setCharts(parsed);
      } catch {
        // Keep the empty list. See above: this is the designed outcome, not a swallowed bug.
      }
    })();

    return () => controller.abort();
  }, []);

  return { charts };
}
