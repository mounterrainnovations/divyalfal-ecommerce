import { NextResponse } from 'next/server';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth-guard';
import { isMissingTable, notSetUpResponse } from '@/lib/admin/not-set-up';
import {
  AssetNotFoundError,
  AssetNotReplaceableError,
  replaceAssetFile,
} from '@/lib/repositories/media';
import {
  DIRECT_POST_MAX_BYTES,
  IMAGE_TYPES,
  IMAGE_MAX_BYTES,
  VIDEO_TYPES,
} from '@/app/api/upload/limits';

/**
 * POST /api/admin/media/[id]/replace — multipart, `file` plus optional `width`/`height`.
 *
 * New bytes at the asset's existing storage path, so every product, content block and slide
 * that already references the URL shows the new file. -> the updated row, or 400/404/409/413.
 *
 * **The cap here is the platform's, not the image's.** A route handler on Vercel cannot
 * receive a body much over 4.5MB, so a replacement is capped at `DIRECT_POST_MAX_BYTES` and a
 * larger file is refused with the reason, rather than failing at the edge with nothing useful
 * to say. The signed-URL path cannot stand in: it issues a key for a *new* object, and the
 * whole point of a replacement is to write the old one.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
  } catch {
    return unauthorizedResponse();
  }

  const { id } = await params;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Expected a multipart form with a file.' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (!IMAGE_TYPES.includes(file.type) && !VIDEO_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Invalid file type. Only JPG, PNG, WebP, GIF, MP4 and WebM are allowed.' },
      { status: 400 }
    );
  }

  const cap = Math.min(IMAGE_MAX_BYTES, DIRECT_POST_MAX_BYTES);
  if (file.size > cap) {
    return NextResponse.json(
      {
        error: `A replacement file must be under ${Math.floor(cap / (1024 * 1024))}MB. Upload a larger file as a new asset instead.`,
      },
      { status: 413 }
    );
  }

  const number = (name: string) => {
    const raw = form.get(name);
    const value = typeof raw === 'string' ? Number(raw) : NaN;
    return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
  };

  try {
    const asset = await replaceAssetFile(id, {
      body: Buffer.from(await file.arrayBuffer()),
      mimeType: file.type,
      bytes: file.size,
      width: number('width'),
      height: number('height'),
    });
    return NextResponse.json(asset);
  } catch (error) {
    if (error instanceof AssetNotFoundError) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }
    if (error instanceof AssetNotReplaceableError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (isMissingTable(error)) return notSetUpResponse();
    console.error('[API] POST /api/admin/media/[id]/replace failed', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not replace the file.' },
      { status: 500 }
    );
  }
}
