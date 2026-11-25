import { NextResponse } from 'next/server';
import {
  DEFAULT_CATEGORY_TILES,
  DEFAULT_TESTIMONIALS,
  readCategoryTiles,
  readTestimonials,
} from '@/lib/repositories/showcase';

/**
 * GET /api/showcase -> `{ testimonials, categories }`
 *
 * The public read behind two homepage sections that used to be arrays in source: the client
 * testimonials and the six category tiles.
 *
 * IT NEVER FAILS. A database that is down, a missing `SiteSetting` table, a malformed row —
 * every one of them answers 200 with the defaults, which are the exact lists the site showed
 * before any of this was editable. The homepage is the shop's front door; it must not be able
 * to lose its categories because a query timed out. The only thing a caller learns from a
 * fallback is `source: 'default'`, which is there for diagnosis, not for branching.
 *
 * `force-dynamic` because the point of the screen behind it is that an edit shows up.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [testimonials, categories] = await Promise.all([
      readTestimonials(),
      readCategoryTiles(),
    ]);
    return NextResponse.json(
      { testimonials, categories, source: 'stored' },
      {
        // Short on purpose, and the two numbers are the promise the portal makes. The portal
        // tells the owner an edit shows "within a minute"; `s-maxage=30` plus 30 seconds of
        // stale-while-revalidate is the longest a visitor can be served the old lists, so the
        // sentence is true. `must-revalidate` keeps the browser's own copy from outliving it —
        // without it a tab that had already fetched this kept showing yesterday's categories,
        // which is exactly how this number got shortened.
        headers: {
          'Cache-Control':
            'public, max-age=0, must-revalidate, s-maxage=30, stale-while-revalidate=30',
        },
      }
    );
  } catch (error) {
    console.error('[API] GET /api/showcase fell back to defaults:', error);
    return NextResponse.json({
      testimonials: DEFAULT_TESTIMONIALS,
      categories: DEFAULT_CATEGORY_TILES,
      source: 'default',
    });
  }
}
