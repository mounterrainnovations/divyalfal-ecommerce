'use client';

import {
  DIRECT_POST_MAX_BYTES,
  IMAGE_TYPES,
  IMAGE_MAX_BYTES,
  STORAGE_BUCKET,
  VIDEO_TYPES,
  VIDEO_MAX_BYTES,
} from '@/app/api/upload/limits';
import { request, send } from '@/lib/admin/api';
import type { AdminAsset } from '@/lib/admin/media';

/**
 * One file from a hard disk to a `MediaAsset` row, by whichever of the two paths it fits.
 *
 * **Which path, and why there are two.** A route handler can only receive a body of about
 * 4.5MB, so a 50MB film cannot be POSTed to `/api/upload` whatever cap that route declares.
 * Anything over `DIRECT_POST_MAX_BYTES`, and every video regardless of size, therefore asks
 * `/api/upload/signed` for permission to write one key in the bucket and sends the bytes
 * **browser -> storage**, past the function entirely. Small images keep the short path, which
 * is the one the product form has always used.
 *
 * Either way the last step is the same: `POST /api/admin/media` registers the object as a row,
 * because an object in the bucket that no row knows about is invisible to the library.
 *
 * **Dimensions are measured here, in the browser.** The server would have to decode the image
 * to learn them, and `createImageBitmap` already has the bytes in hand. A failure leaves them
 * null, which reads as "not measured" rather than as a wrong number.
 *
 * Nothing in here throws. Every call answers `{ ok }` with a sentence for the admin, because
 * it is driven by a drop of fifteen files where the third one is a PDF.
 */

/** The registered row, exactly as the library lists it. */
export type UploadedAsset = AdminAsset;

export type UploadResult =
  | { ok: true; asset: UploadedAsset }
  | { ok: false; message: string; notSetUp?: boolean };

const mb = (bytes: number) => `${Math.round(bytes / (1024 * 1024))}MB`;

/** The same two type lists the upload routes enforce, so a refusal happens before the request. */
export function describeRejection(file: File): string | null {
  const isImage = IMAGE_TYPES.includes(file.type);
  const isVideo = VIDEO_TYPES.includes(file.type);
  if (!isImage && !isVideo) {
    return `“${file.name}” is a ${file.type || 'file of unknown type'}. Photographs may be JPG, PNG, WebP or GIF, and footage MP4 or WebM.`;
  }
  const cap = isVideo ? VIDEO_MAX_BYTES : IMAGE_MAX_BYTES;
  if (file.size > cap) {
    return `“${file.name}” is ${mb(file.size)}. The limit is ${mb(cap)}.`;
  }
  return null;
}

export const isVideoFile = (file: File) => VIDEO_TYPES.includes(file.type);

/** The bucket key inside a Supabase public URL — the client half of `storagePathFromUrl`. */
function pathFromPublicUrl(url: string): string {
  const marker = `/${STORAGE_BUCKET}/`;
  const at = url.indexOf(marker);
  if (at !== -1) return url.slice(at + marker.length).split('?')[0];
  return url.replace(/^\//, '').split('?')[0];
}

/** Width and height, or nulls. Images only: a video's dimensions need a decode we do not do. */
export async function measure(file: File): Promise<{ width: number | null; height: number | null }> {
  if (!IMAGE_TYPES.includes(file.type) || typeof createImageBitmap !== 'function') {
    return { width: null, height: null };
  }
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close?.();
    return size;
  } catch {
    return { width: null, height: null };
  }
}

export async function uploadAsset(
  file: File,
  options: { tags?: string[]; alt?: string } = {}
): Promise<UploadResult> {
  const rejection = describeRejection(file);
  if (rejection) return { ok: false, message: rejection };

  const { width, height } = await measure(file);
  const direct = !isVideoFile(file) && file.size <= DIRECT_POST_MAX_BYTES;

  const stored = direct ? await postThroughRoute(file) : await putStraightToStorage(file);
  if (!stored.ok) return stored;

  const registered = await send<UploadedAsset>('/api/admin/media', 'POST', {
    url: stored.url,
    path: stored.path,
    mimeType: file.type,
    bytes: file.size,
    kind: isVideoFile(file) ? 'VIDEO' : 'IMAGE',
    width,
    height,
    alt: options.alt ?? '',
    tags: options.tags ?? [],
  });

  if (!registered.ok || !registered.data) {
    return {
      ok: false,
      notSetUp: registered.notSetUp,
      message: registered.notSetUp
        ? `“${file.name}” was uploaded, but it cannot be listed until the CMS tables exist.`
        : `“${file.name}” was uploaded but could not be added to the library: ${registered.message}`,
    };
  }

  return { ok: true, asset: registered.data };
}

type Stored = { ok: true; url: string; path: string } | { ok: false; message: string };

/** The short path: multipart to `/api/upload`, which writes the object and returns its URL. */
async function postThroughRoute(file: File): Promise<Stored> {
  const body = new FormData();
  body.append('file', file);

  const answer = await request<{ url?: string }>('/api/upload', { method: 'POST', body });
  if (!answer.ok || !answer.data?.url) {
    return { ok: false, message: `“${file.name}” was not uploaded: ${answer.message}` };
  }
  return { ok: true, url: answer.data.url, path: pathFromPublicUrl(answer.data.url) };
}

/**
 * The long path: ask for a signed key, then PUT the bytes to storage from the browser.
 *
 * The signed URL carries its own token in the query string, so the PUT needs no key of its
 * own — which is the point, since this project publishes no `NEXT_PUBLIC_ANON_KEY` and the
 * browser has no Supabase client to speak through.
 */
async function putStraightToStorage(file: File): Promise<Stored> {
  const signed = await send<{ uploadUrl: string; path: string; publicUrl: string }>(
    '/api/upload/signed',
    'POST',
    { fileName: file.name, contentType: file.type, size: file.size }
  );

  if (!signed.ok || !signed.data) {
    return { ok: false, message: `“${file.name}” was not uploaded: ${signed.message}` };
  }

  try {
    const put = await fetch(signed.data.uploadUrl, {
      method: 'PUT',
      headers: { 'content-type': file.type, 'x-upsert': 'false' },
      body: file,
    });
    if (!put.ok) {
      return {
        ok: false,
        message: `“${file.name}” was not accepted by storage (${put.status}). Nothing was saved.`,
      };
    }
  } catch {
    return {
      ok: false,
      message: `“${file.name}” could not be sent to storage. Check the connection and try again.`,
    };
  }

  return { ok: true, url: signed.data.publicUrl, path: signed.data.path };
}

/** Replace an existing asset's bytes in place. The URL does not change; see the route. */
export async function replaceAsset(
  id: string,
  file: File
): Promise<{ ok: true; asset: UploadedAsset } | { ok: false; message: string }> {
  const rejection = describeRejection(file);
  if (rejection) return { ok: false, message: rejection };

  const { width, height } = await measure(file);
  const body = new FormData();
  body.append('file', file);
  if (width) body.append('width', String(width));
  if (height) body.append('height', String(height));

  const answer = await request<UploadedAsset>(`/api/admin/media/${id}/replace`, {
    method: 'POST',
    body,
  });

  if (!answer.ok || !answer.data) return { ok: false, message: answer.message };
  return { ok: true, asset: answer.data };
}
