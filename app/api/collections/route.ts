import { NextResponse } from 'next/server';
import { DEFAULT_COLLECTIONS, readCollections } from '@/lib/repositories/collections';

/**
 * GET /api/collections -> `{ collections, source }`
 *
 * The public read behind the homepage's "Explore our collection" strip.
 *
 * IT NEVER FAILS. A database that is down, a missing `SiteSetting` table, a malformed row —
 * every one of them answers 200 with `DEFAULT_COLLECTIONS`, which is empty. That is not a
 * degraded response dressed up as a good one: an empty list is the instruction the storefront
 * section needs to keep showing the product strip it has shown all along (see
 * `components/sections/explore.tsx`). A 500 here would leave the strip waiting on a fetch that
 * is never going to answer. `source` is for whoever is reading the network tab to tell the two
 * apart; nothing branches on it.
 *
 * `force-dynamic` because the point of the screen behind it is that an edit shows up.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const collections = await readCollections();
    return NextResponse.json(
      { collections, source: 'stored' },
      {
        // The same two numbers as `/api/showcase`, and for the same reason: the portal tells
        // the owner an edit shows "within a minute", and `s-maxage=30` plus 30 seconds of
        // stale-while-revalidate is the longest a visitor can be served the old list, which
        // makes the sentence true. `must-revalidate` stops the browser's own copy outliving
        // it — without it a tab left open across an edit keeps drawing yesterday's strip.
        headers: {
          'Cache-Control':
            'public, max-age=0, must-revalidate, s-maxage=30, stale-while-revalidate=30',
        },
      }
    );
  } catch (error) {
    console.error('[API] GET /api/collections fell back to defaults:', error);
    return NextResponse.json({ collections: DEFAULT_COLLECTIONS, source: 'default' });
  }
}
