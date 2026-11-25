'use client';

import { useEffect, useState } from 'react';
import {
  DEFAULT_CATEGORY_TILES,
  DEFAULT_TESTIMONIALS,
  parseCategoryTiles,
  parseTestimonials,
  type CategoryTile,
  type Testimonial,
} from '@/lib/content/showcase';

/**
 * The two homepage lists the owner can now edit, for the two sections that draw them.
 *
 * THE DEFAULTS ARE THE INITIAL STATE, AND THAT IS THE WHOLE DESIGN. The hook starts with the
 * arrays that are live on the site today, so the server render and the first paint are byte
 * for byte what they were before any of this existed. The fetch can only ever *replace* them
 * with what the owner stored. A database that is down, a 500, a half-written row, a user on a
 * flaky connection — every one of those leaves the homepage showing the six categories and
 * five quotes it has always shown, rather than an empty strip where the shop's navigation was.
 *
 * It is one request for both lists because both sections are on the same page and neither is
 * worth a round trip of its own.
 *
 * NO LOADING STATE IS EXPOSED, deliberately. There is nothing to spin: the sections have real
 * content from the first frame, and swapping in the stored version is not an event the visitor
 * needs told about.
 */
export function useShowcase(): { testimonials: Testimonial[]; categories: CategoryTile[] } {
  const [testimonials, setTestimonials] = useState<Testimonial[]>(DEFAULT_TESTIMONIALS);
  const [categories, setCategories] = useState<CategoryTile[]>(DEFAULT_CATEGORY_TILES);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        // `no-store` is about the *browser's* copy only; the CDN still caches the response
        // for everyone (see the route's Cache-Control). Without it a tab left open across
        // an edit keeps drawing the lists it fetched when it loaded.
        const response = await fetch('/api/showcase', {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!response.ok) return;
        const body: unknown = await response.json();
        if (!body || typeof body !== 'object') return;

        // Re-parsed on this side too. The endpoint is ours, but a cached response from an
        // older deploy is a real shape to defend against, and the parser is already written.
        const stored = body as { testimonials?: unknown; categories?: unknown };
        const quotes = parseTestimonials(stored.testimonials);
        const tiles = parseCategoryTiles(stored.categories);
        if (quotes) setTestimonials(quotes);
        if (tiles) setCategories(tiles);
      } catch {
        // Keep the defaults. See above: this is the designed outcome, not a swallowed bug.
      }
    })();

    return () => controller.abort();
  }, []);

  return { testimonials, categories };
}
