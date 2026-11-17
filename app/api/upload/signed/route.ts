import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth-guard';
import {
  IMAGE_TYPES,
  IMAGE_MAX_BYTES,
  VIDEO_TYPES,
  VIDEO_MAX_BYTES,
  STORAGE_BUCKET,
  storagePathFor,
} from '../limits';

/**
 * POST /api/upload/signed with `{ fileName, contentType, size? }`
 *   -> `{ uploadUrl, path, token, publicUrl }`
 *
 * The browser then sends the bytes straight to `uploadUrl` (or calls
 * `supabase.storage.from('product-images').uploadToSignedUrl(path, token, file)`) and registers
 * the result with `POST /api/admin/media`.
 *
 * This exists because a route handler on Vercel cannot receive a body much over 4.5MB. A 50MB
 * film cannot be POSTed to `/api/upload` at all, whatever cap that route declares, so it is
 * never offered that route: this endpoint hands out permission to write one key in the bucket
 * and the bytes never pass through the function.
 */
export async function POST(request: Request) {
  try {
    await requireAdmin(request);
  } catch {
    return unauthorizedResponse();
  }

  let body: { fileName?: unknown; contentType?: unknown; size?: unknown } | null = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const fileName = typeof body?.fileName === 'string' ? body.fileName.trim() : '';
  const contentType = typeof body?.contentType === 'string' ? body.contentType : '';
  const size = typeof body?.size === 'number' ? body.size : undefined;

  if (!fileName) {
    return NextResponse.json({ error: 'A fileName is required' }, { status: 400 });
  }

  const isImage = IMAGE_TYPES.includes(contentType);
  const isVideo = VIDEO_TYPES.includes(contentType);
  if (!isImage && !isVideo) {
    return NextResponse.json(
      { error: 'Invalid file type. Only JPG, PNG, WebP, GIF, MP4 and WebM are allowed.' },
      { status: 400 }
    );
  }

  // The cap is enforced here too, on the size the caller declares, so an oversized file is
  // refused before a writable key is handed out. Storage enforces the bucket's own limit either
  // way; this is the earlier, clearer refusal.
  const max = isVideo ? VIDEO_MAX_BYTES : IMAGE_MAX_BYTES;
  if (size !== undefined && size > max) {
    return NextResponse.json(
      { error: `File too large. Maximum size is ${max / (1024 * 1024)}MB.` },
      { status: 413 }
    );
  }

  const path = storagePathFor(fileName);

  try {
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .createSignedUploadUrl(path);

    if (error || !data) {
      console.error('[API] createSignedUploadUrl failed', error);
      return NextResponse.json(
        { error: error?.message ?? 'Could not create an upload URL' },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(path);

    return NextResponse.json({
      uploadUrl: data.signedUrl,
      path: data.path ?? path,
      token: data.token,
      publicUrl,
    });
  } catch (error) {
    console.error('[API] POST /api/upload/signed failed', error);
    return NextResponse.json({ error: 'Could not create an upload URL' }, { status: 500 });
  }
}
