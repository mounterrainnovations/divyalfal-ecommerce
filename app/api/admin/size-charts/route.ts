import { NextResponse } from 'next/server';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth-guard';
import { isMissingTable, notSetUpResponse } from '@/lib/admin/not-set-up';
import { readSizeCharts, saveSizeCharts } from '@/lib/repositories/size-charts';

/**
 * The portal's end of the shop's size charts.
 *
 * GET /api/admin/size-charts -> `{ charts }`
 * PUT /api/admin/size-charts with `{ charts }` -> `{ charts }`, as stored
 *
 * UNLIKE THE PUBLIC ROUTE, THIS ONE REPORTS FAILURES. The public read answers an empty list for
 * a broken database because a garment's page is better off with no size guide than with an
 * error; an editor must be told, or they will type a table into a screen that cannot save it.
 * Hence the three distinct outcomes the portal already knows how to render: 503 `setup:
 * 'pending'` while `SiteSetting` is missing, 400 with the parser's own message for a body that
 * is not a chart list, 500 for anything else.
 *
 * THE RESPONSE IS THE SAVED VALUE, NOT AN ACKNOWLEDGEMENT. `saveSizeCharts` re-parses before
 * writing — rows get padded to their column count, slugs made unique, unknown categories
 * dropped — so what came back is what the next reader will see. The screen replaces its state
 * with it, which is how the editor and the shop stay in agreement about what was stored.
 */

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
  } catch {
    return unauthorizedResponse();
  }

  try {
    return NextResponse.json({ charts: await readSizeCharts() });
  } catch (error) {
    if (isMissingTable(error)) return notSetUpResponse();
    console.error('[API] GET /api/admin/size-charts failed', error);
    return NextResponse.json({ error: 'Failed to load the size charts' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin(request);
  } catch {
    return unauthorizedResponse();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Expected an object' }, { status: 400 });
  }

  const patch = body as { charts?: unknown };
  if (patch.charts === undefined) {
    return NextResponse.json({ error: 'Nothing to save: expected `charts`' }, { status: 400 });
  }

  try {
    return NextResponse.json({ charts: await saveSizeCharts(patch.charts) });
  } catch (error) {
    if (error instanceof TypeError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (isMissingTable(error)) return notSetUpResponse();
    console.error('[API] PUT /api/admin/size-charts failed', error);
    return NextResponse.json({ error: 'Failed to save the size charts' }, { status: 500 });
  }
}
