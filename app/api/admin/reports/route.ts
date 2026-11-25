import { NextResponse } from 'next/server';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth-guard';
import { isMissingTable, notSetUpResponse } from '@/lib/admin/not-set-up';
import { readReport } from './aggregate';
import { parseRange, RANGES } from './windows';

/**
 * The portal's end of the Reports screen.
 *
 * GET /api/admin/reports?range=30d|90d|12m|all -> one `ReportPayload` (see `aggregate.ts`)
 *
 * WHY ONE ENDPOINT AND NOT SEVEN. Every figure on the screen covers the same window, and the
 * CSV has to be the screen's own numbers rather than a second opinion. Seven endpoints would
 * each resolve "now" a few milliseconds apart, which is how a report ends up with a total that
 * does not match its own breakdown. One read, one window, one `generatedAt`.
 *
 * WHY THERE IS NO POST, PUT OR DELETE. Nothing on this screen writes. A report that could
 * change the thing it reports on would be a different kind of object.
 *
 * `force-dynamic` because every figure is live and a cached report is a wrong report. There is
 * no `Cache-Control` beyond that: the browser must not hold an admin's figures either.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
  } catch {
    return unauthorizedResponse();
  }

  // An unrecognised range falls back to the default rather than refusing: see `parseRange`.
  const range = parseRange(new URL(request.url).searchParams.get('range'));

  try {
    const report = await readReport(range);
    return NextResponse.json(report, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (isMissingTable(error)) return notSetUpResponse();
    console.error('[API] GET /api/admin/reports failed', error);
    return NextResponse.json(
      {
        // Named rather than generic: this endpoint reads seven tables, and "Failed to load the
        // report" sends the reader looking at the wrong one. The ranges are listed because a
        // mistyped range is the one failure a caller can fix themselves.
        error: `Failed to read the report. Ranges: ${RANGES.join(', ')}.`,
      },
      { status: 500 }
    );
  }
}
