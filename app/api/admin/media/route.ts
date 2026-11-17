import { NextResponse } from 'next/server';
import type { MediaKind } from '@prisma/client';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth-guard';
import { isMissingTable, notSetUpResponse } from '@/lib/admin/not-set-up';
import {
  backfillFromProductPhotos,
  countUsageFor,
  createAsset,
  listAssets,
} from '@/lib/repositories/media';

const KINDS: MediaKind[] = ['IMAGE', 'VIDEO'];

/**
 * GET /api/admin/media?kind=&tag=&cursor=&limit=
 *   -> `{ assets: MediaAsset[], nextCursor: string | null, usage: Record<id, AssetUsage> }`,
 *   newest first.
 *
 * `usage` is the same count `DELETE` enforces with, for the assets on this page only, so the
 * library can say "used in 3 places" on a tile instead of finding out at the moment of
 * deletion. It is three queries for the page, not three per asset (`countUsageFor`).
 */
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
  } catch {
    return unauthorizedResponse();
  }

  const params = new URL(request.url).searchParams;
  const kindParam = params.get('kind')?.toUpperCase();
  const kind = KINDS.find(k => k === kindParam);
  const limitParam = Number(params.get('limit'));

  try {
    const result = await listAssets({
      cursor: params.get('cursor') ?? undefined,
      kind,
      tag: params.get('tag') ?? undefined,
      limit: Number.isFinite(limitParam) && limitParam > 0 ? limitParam : undefined,
    });
    return NextResponse.json({ ...result, usage: await countUsageFor(result.assets) });
  } catch (error) {
    if (isMissingTable(error)) return notSetUpResponse();
    console.error('[API] GET /api/admin/media failed', error);
    return NextResponse.json({ error: 'Failed to list media' }, { status: 500 });
  }
}

/**
 * POST /api/admin/media
 *
 * Either registers an asset already in storage --
 * `{ url, path, mimeType, bytes, kind?, alt?, width?, height?, tags? }` -> 201 with the row --
 * or, with `{ action: 'backfill' }`, gives every product photograph a row it does not yet have
 * and answers `{ created: number }`.
 */
export async function POST(request: Request) {
  try {
    await requireAdmin(request);
  } catch {
    return unauthorizedResponse();
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (body?.action === 'backfill') {
    try {
      const created = await backfillFromProductPhotos();
      return NextResponse.json({ created });
    } catch (error) {
      if (isMissingTable(error)) return notSetUpResponse();
      console.error('[API] media backfill failed', error);
      return NextResponse.json({ error: 'Backfill failed' }, { status: 500 });
    }
  }

  const url = typeof body?.url === 'string' ? body.url.trim() : '';
  const path = typeof body?.path === 'string' ? body.path.trim() : '';
  const mimeType = typeof body?.mimeType === 'string' ? body.mimeType.trim() : '';
  const bytes = typeof body?.bytes === 'number' ? body.bytes : 0;

  if (!url || !path || !mimeType) {
    return NextResponse.json(
      { error: 'url, path and mimeType are required' },
      { status: 400 }
    );
  }

  const kindParam = typeof body?.kind === 'string' ? body.kind.toUpperCase() : undefined;
  const tags = Array.isArray(body?.tags)
    ? (body.tags as unknown[]).filter((tag): tag is string => typeof tag === 'string')
    : undefined;

  try {
    const asset = await createAsset({
      url,
      path,
      mimeType,
      bytes,
      kind: KINDS.find(k => k === kindParam),
      alt: typeof body?.alt === 'string' ? body.alt : undefined,
      width: typeof body?.width === 'number' ? body.width : null,
      height: typeof body?.height === 'number' ? body.height : null,
      tags,
    });
    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    if (isMissingTable(error)) return notSetUpResponse();
    console.error('[API] POST /api/admin/media failed', error);
    return NextResponse.json({ error: 'Failed to create asset' }, { status: 500 });
  }
}
