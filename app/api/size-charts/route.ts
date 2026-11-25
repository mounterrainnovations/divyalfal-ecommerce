import { NextResponse } from 'next/server';
import { DEFAULT_SIZE_CHARTS, readSizeCharts } from '@/lib/repositories/size-charts';

/**
 * GET /api/size-charts -> `{ charts, source }`
 *
 * The public read behind the "Size guide" on a product page.
 *
 * IT NEVER FAILS. A database that is down, a missing `SiteSetting` table, a malformed row —
 * every one of them answers 200 with the defaults, which for this feature is an empty list
 * (see `DEFAULT_SIZE_CHARTS`: no measurement is ever invented to fill a gap). An empty list is
 * a safe answer in a way it would not be for the homepage sections: the product page renders
 * no size guide at all for it, which is precisely what the shop showed before this existed.
 * Nothing on a garment's page can break because this query timed out.
 *
 * `source` is for diagnosis, not for branching — it is how someone reading the network tab
 * tells "the shop has no charts yet" apart from "the read fell over".
 *
 * `force-dynamic` because the point of the screen behind it is that an edit shows up.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const charts = await readSizeCharts();
    return NextResponse.json(
      { charts, source: 'stored' },
      {
        // The same two numbers as `/api/showcase`, and the same promise: the portal tells the
        // owner an edit shows "within a minute", and 30 seconds of shared cache plus 30 of
        // stale-while-revalidate is the longest a visitor can be served the old charts.
        // `must-revalidate` keeps a browser's own copy from outliving that window.
        headers: {
          'Cache-Control':
            'public, max-age=0, must-revalidate, s-maxage=30, stale-while-revalidate=30',
        },
      }
    );
  } catch (error) {
    console.error('[API] GET /api/size-charts fell back to defaults:', error);
    return NextResponse.json({ charts: DEFAULT_SIZE_CHARTS, source: 'default' });
  }
}
