/**
 * Upload limits and the storage path scheme, shared by `POST /api/upload` and
 * `POST /api/upload/signed`.
 *
 * The image values are the ones the product form has always been held to: the same five MIME
 * types, the same 5MB cap, the same `products/<timestamp>-<random>.<ext>` key in the same
 * bucket. Video is additive, with its own cap.
 */

export const STORAGE_BUCKET = 'product-images';

export const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5MB

export const VIDEO_TYPES = ['video/webm', 'video/mp4'];
export const VIDEO_MAX_BYTES = 50 * 1024 * 1024; // 50MB

/**
 * A Vercel route handler's request body is capped at about 4.5MB, so anything above this must go
 * browser -> storage on a signed URL rather than through `POST /api/upload`. Images sit under the
 * cap by their own 5MB limit in all but the last half megabyte; video is over it almost always,
 * which is why `POST /api/upload/signed` exists rather than a bigger body limit.
 */
export const DIRECT_POST_MAX_BYTES = 4 * 1024 * 1024; // 4MB, under the ~4.5MB platform limit

/** The one filename scheme: `products/<timestamp>-<random>.<ext>`. */
export function storagePathFor(fileName: string): string {
  const ext = fileName.includes('.') ? fileName.split('.').pop() : undefined;
  const stem = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  return `products/${ext ? `${stem}.${ext}` : stem}`;
}
