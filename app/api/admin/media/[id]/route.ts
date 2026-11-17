import { NextResponse } from 'next/server';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth-guard';
import { isMissingTable, notSetUpResponse } from '@/lib/admin/not-set-up';
import {
  AssetInUseError,
  AssetNotFoundError,
  deleteAsset,
  updateAsset,
} from '@/lib/repositories/media';

/** PATCH /api/admin/media/[id] with `{ alt?, tags? }` -> the updated row. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
  } catch {
    return unauthorizedResponse();
  }

  const { id } = await params;
  let body: Record<string, unknown> | null = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const alt = typeof body?.alt === 'string' ? body.alt : undefined;
  const tags = Array.isArray(body?.tags)
    ? (body.tags as unknown[]).filter((tag): tag is string => typeof tag === 'string')
    : undefined;

  if (alt === undefined && tags === undefined) {
    return NextResponse.json({ error: 'Nothing to update: send alt or tags' }, { status: 400 });
  }

  try {
    const asset = await updateAsset(id, { alt, tags });
    return NextResponse.json(asset);
  } catch (error) {
    if (error instanceof AssetNotFoundError) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }
    if (isMissingTable(error)) return notSetUpResponse();
    console.error('[API] PATCH /api/admin/media/[id] failed', error);
    return NextResponse.json({ error: 'Failed to update asset' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/media/[id]
 *
 * 200 `{ deleted: true }` when the asset was unreferenced; **409 with the usage breakdown**
 * (`{ error, usage: { total, products, blocks, slides } }`) when it is still on the site, so the
 * admin can be told where it is still used rather than just that it cannot go.
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
  } catch {
    return unauthorizedResponse();
  }

  const { id } = await params;
  try {
    await deleteAsset(id);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    if (error instanceof AssetInUseError) {
      return NextResponse.json(
        { error: 'This file is still in use and was not deleted.', usage: error.usage },
        { status: 409 }
      );
    }
    if (error instanceof AssetNotFoundError) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }
    if (isMissingTable(error)) return notSetUpResponse();
    console.error('[API] DELETE /api/admin/media/[id] failed', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete asset' },
      { status: 500 }
    );
  }
}
