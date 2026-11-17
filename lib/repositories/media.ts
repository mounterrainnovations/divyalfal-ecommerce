import { Prisma, type MediaAsset, type MediaKind } from '@prisma/client';
import { prisma } from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase/server';
import { STORAGE_BUCKET } from '@/app/api/upload/limits';

/**
 * Media library repository.
 *
 * `MediaAsset` owns every asset the site shows, including the product photographs, which it
 * tracks by URL string rather than by a foreign key -- `Product` is not altered and not written.
 * The price of that is that nothing in the database stops an asset still on the page from being
 * deleted, so `countUsage` is the only guard there is and `deleteAsset` refuses while it reports
 * anything at all.
 */

export interface AssetUsage {
  total: number;
  products: number;
  blocks: number;
  slides: number;
}

/** Thrown by `deleteAsset` when the asset is still referenced. The route answers 409 with this. */
export class AssetInUseError extends Error {
  readonly usage: AssetUsage;
  readonly assetId: string;

  constructor(assetId: string, usage: AssetUsage) {
    super(`Asset ${assetId} is still in use (${usage.total} reference(s))`);
    this.name = 'AssetInUseError';
    this.assetId = assetId;
    this.usage = usage;
  }
}

/** Thrown when an id names no asset. */
export class AssetNotFoundError extends Error {
  constructor(id: string) {
    super(`No media asset with id ${id}`);
    this.name = 'AssetNotFoundError';
  }
}

export interface ListAssetsOptions {
  /** The id of the last asset on the previous page. */
  cursor?: string;
  kind?: MediaKind;
  tag?: string;
  limit?: number;
}

export interface ListAssetsResult {
  assets: MediaAsset[];
  /** The cursor to pass for the next page, or null at the end. */
  nextCursor: string | null;
}

const LIST_LIMIT_DEFAULT = 60;
const LIST_LIMIT_MAX = 200;

/** Newest first, cursor-paginated. */
export async function listAssets(options: ListAssetsOptions = {}): Promise<ListAssetsResult> {
  const take = Math.min(Math.max(options.limit ?? LIST_LIMIT_DEFAULT, 1), LIST_LIMIT_MAX);

  const assets = await prisma.mediaAsset.findMany({
    where: {
      ...(options.kind ? { kind: options.kind } : {}),
      ...(options.tag ? { tags: { has: options.tag } } : {}),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: take + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
  });

  const page = assets.slice(0, take);
  return {
    assets: page,
    nextCursor: assets.length > take ? (page[page.length - 1]?.id ?? null) : null,
  };
}

export interface CreateAssetInput {
  url: string;
  path: string;
  mimeType: string;
  bytes: number;
  kind?: MediaKind;
  alt?: string;
  width?: number | null;
  height?: number | null;
  tags?: string[];
}

/** Register an asset already in the bucket (or already under `public/`). */
export async function createAsset(input: CreateAssetInput): Promise<MediaAsset> {
  return prisma.mediaAsset.create({
    data: {
      url: input.url,
      path: input.path,
      mimeType: input.mimeType,
      bytes: input.bytes,
      kind: input.kind ?? kindFor(input.mimeType, input.url),
      alt: input.alt ?? '',
      width: input.width ?? null,
      height: input.height ?? null,
      tags: input.tags ?? [],
    },
  });
}

/** The only two fields the admin may edit. The bytes themselves are immutable. */
export async function updateAsset(
  id: string,
  patch: { alt?: string; tags?: string[] }
): Promise<MediaAsset> {
  const existing = await prisma.mediaAsset.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new AssetNotFoundError(id);

  return prisma.mediaAsset.update({
    where: { id },
    data: {
      ...(patch.alt !== undefined ? { alt: patch.alt } : {}),
      ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
    },
  });
}

/**
 * Everywhere this asset is referenced.
 *
 *  - `products`: rows whose `photos` array contains the URL (`has`, an index-usable array test).
 *  - `blocks`: rows whose `draft` or `published` JSON mentions the URL anywhere. The JSON is cast
 *    to text and matched in the database -- one query, no table walk in JS, and it catches a URL
 *    nested in an `IMAGE_LIST` as readily as one at the root of a `TEXT` block.
 *  - `slides`: rows pointing at the asset by id, the one real foreign key.
 */
export async function countUsage(asset: Pick<MediaAsset, 'id' | 'url'>): Promise<AssetUsage> {
  const [products, blockRows, slides] = await Promise.all([
    prisma.product.count({ where: { photos: { has: asset.url } } }),
    prisma.$queryRaw<{ count: bigint }[]>(
      Prisma.sql`
        SELECT count(*)::bigint AS count
        FROM "ContentBlock"
        WHERE "draft"::text LIKE ${`%${asset.url}%`}
           OR ("published" IS NOT NULL AND "published"::text LIKE ${`%${asset.url}%`})
      `
    ),
    prisma.slide.count({ where: { assetId: asset.id } }),
  ]);

  const blocks = Number(blockRows[0]?.count ?? 0);
  return { products, blocks, slides, total: products + blocks + slides };
}

/**
 * `countUsage` for a whole page of assets, in three queries rather than three per asset.
 *
 * The grid shows "used in N places" on every tile, and calling `countUsage` sixty times would
 * be 180 round trips to draw one screen. The three reads here are each one query for the page:
 * every product's photo list, every content block's JSON as text, and the slide counts grouped
 * by asset. The per-asset arithmetic then happens in memory, which at this catalogue's size is
 * a few hundred string tests.
 *
 * It must agree with `countUsage`, which is the one `deleteAsset` enforces with: a block counts
 * **once** whether the URL is in its draft, its published value or both, which is why the two
 * JSON columns are concatenated per row rather than tested separately.
 */
export async function countUsageFor(
  assets: Pick<MediaAsset, 'id' | 'url'>[]
): Promise<Record<string, AssetUsage>> {
  const usage: Record<string, AssetUsage> = {};
  if (assets.length === 0) return usage;

  const [products, blocks, slides] = await Promise.all([
    prisma.product.findMany({ select: { photos: true } }),
    prisma.$queryRaw<{ body: string }[]>(
      Prisma.sql`
        SELECT coalesce("draft"::text, '') || ' ' || coalesce("published"::text, '') AS body
        FROM "ContentBlock"
      `
    ),
    prisma.slide.groupBy({ by: ['assetId'], _count: { _all: true } }),
  ]);

  const slidesByAsset = new Map(slides.map(row => [row.assetId, row._count._all]));

  for (const asset of assets) {
    const productCount = products.filter(product => product.photos.includes(asset.url)).length;
    const blockCount = blocks.filter(block => block.body.includes(asset.url)).length;
    const slideCount = slidesByAsset.get(asset.id) ?? 0;
    usage[asset.id] = {
      products: productCount,
      blocks: blockCount,
      slides: slideCount,
      total: productCount + blockCount + slideCount,
    };
  }

  return usage;
}

/** Thrown when an asset's bytes cannot be replaced in place. */
export class AssetNotReplaceableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssetNotReplaceableError';
  }
}

export interface ReplaceAssetInput {
  body: Buffer;
  mimeType: string;
  bytes: number;
  width?: number | null;
  height?: number | null;
}

/**
 * Overwrite an asset's bytes **at its existing storage path**, so every reference follows.
 *
 * This is the only honest way to replace a photograph here. References are URL strings in
 * `Product.photos` and inside `ContentBlock` JSON, so giving the row a new URL would leave
 * every existing reference pointing at the old file — a "replace" that replaced nothing.
 * Writing new bytes to the same key means the product page, the content block and the slide
 * all show the new photograph without anything else being touched.
 *
 * Two refusals, both deliberate:
 *
 *  - **A seeded asset cannot be replaced.** Its URL is root-relative (`/samples/...`), so the
 *    bytes are a file in `public/` under source control, not an object in the bucket.
 *  - **The kind cannot change.** An `IMAGE` consumer renders an `<img>`; handing it a film
 *    would break the page that references it rather than update it.
 *
 * The URL does not change, which is the point — and also the one caveat: a cache that already
 * holds the old file keeps serving it until it expires. The caller says so rather than
 * claiming the site has already changed.
 */
export async function replaceAssetFile(
  id: string,
  input: ReplaceAssetInput
): Promise<MediaAsset> {
  const asset = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!asset) throw new AssetNotFoundError(id);

  if (isRootRelative(asset.url)) {
    throw new AssetNotReplaceableError(
      'This file ships with the site rather than living in storage, so its bytes cannot be replaced. Upload the new photograph as its own asset and use that instead.'
    );
  }

  const kind = kindFor(input.mimeType);
  if (kind !== asset.kind) {
    throw new AssetNotReplaceableError(
      `This asset is a ${asset.kind.toLowerCase()} and the replacement is a ${kind.toLowerCase()}. Everything that shows it expects the same kind of file.`
    );
  }

  const { error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(asset.path, input.body, { contentType: input.mimeType, upsert: true });

  if (error) throw new Error(`Could not write the replacement file: ${error.message}`);

  return prisma.mediaAsset.update({
    where: { id },
    data: {
      mimeType: input.mimeType,
      bytes: input.bytes,
      // Measured in the browser before upload; null reads as "not measured", never as a wrong
      // number, and nothing but the admin's own columns depends on it.
      width: input.width ?? null,
      height: input.height ?? null,
    },
  });
}

/**
 * Delete an asset, but only when nothing points at it.
 *
 * The order matters and is deliberate: **usage, then the storage object, then the row.** A
 * storage failure therefore leaves the row intact, which is the recoverable direction -- a row
 * with no bytes behind it is a broken image the client can see and replace, while bytes with no
 * row are invisible and unreachable forever.
 *
 * The seeded sample assets carry a **root-relative** `url` (`/samples/...`, `/slideshow/...`):
 * those files live in `public/`, not in the bucket, and must not be sent to `storage.remove`. A
 * `remove` of a key that is not there succeeds silently, so getting this wrong would have cost
 * nothing visible and quietly taught us that deletion "worked" against the wrong store.
 */
export async function deleteAsset(id: string): Promise<AssetUsage> {
  const asset = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!asset) throw new AssetNotFoundError(id);

  const usage = await countUsage(asset);
  if (usage.total > 0) throw new AssetInUseError(id, usage);

  if (!isRootRelative(asset.url)) {
    const { error } = await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([asset.path]);
    if (error) {
      // Leave the row. The admin sees the asset still listed, which is the truth.
      throw new Error(`Could not delete the stored file: ${error.message}`);
    }
  }

  await prisma.mediaAsset.delete({ where: { id } });
  return usage;
}

/** A seeded asset served from `public/` rather than the storage bucket. */
export function isRootRelative(url: string): boolean {
  return url.startsWith('/');
}

/**
 * Give every product photograph a `MediaAsset` row, so the library shows the whole site's
 * imagery and not only what was uploaded through it.
 *
 * `Product` is **read** here and never written: the link is the URL string, in one direction.
 * Returns the number of rows created. Safe to re-run.
 */
export async function backfillFromProductPhotos(): Promise<number> {
  const products = await prisma.product.findMany({ select: { photos: true } });
  const urls = [...new Set(products.flatMap(product => product.photos).filter(Boolean))];
  if (urls.length === 0) return 0;

  const known = new Set(
    (
      await prisma.mediaAsset.findMany({ where: { url: { in: urls } }, select: { url: true } })
    ).map(asset => asset.url)
  );

  const missing = urls.filter(url => !known.has(url));
  if (missing.length === 0) return 0;

  const result = await prisma.mediaAsset.createMany({
    data: missing.map(url => ({
      url,
      path: storagePathFromUrl(url),
      mimeType: mimeTypeFromUrl(url),
      // Unknown without fetching the object, and a wrong number would be worse than a zero that
      // reads as "not measured". Nothing depends on it but the admin's own size column.
      bytes: 0,
      kind: kindFor(mimeTypeFromUrl(url), url),
      alt: '',
      tags: ['product'],
    })),
    skipDuplicates: true,
  });

  return result.count;
}

// ---------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
  svg: 'image/svg+xml',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
};

export function mimeTypeFromUrl(url: string): string {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
  return MIME_BY_EXT[ext] ?? 'application/octet-stream';
}

export function kindFor(mimeType: string, url = ''): MediaKind {
  if (mimeType.startsWith('video/')) return 'VIDEO';
  if (mimeType.startsWith('image/')) return 'IMAGE';
  return mimeTypeFromUrl(url).startsWith('video/') ? 'VIDEO' : 'IMAGE';
}

/**
 * The bucket key inside a Supabase public URL. For anything else (a root-relative path, or a
 * URL from somewhere that is not the bucket) the path is the URL with its leading slash removed,
 * which is what the seed stores and what `deleteAsset` then declines to send to storage.
 */
export function storagePathFromUrl(url: string): string {
  const marker = `/${STORAGE_BUCKET}/`;
  const at = url.indexOf(marker);
  if (at !== -1) return url.slice(at + marker.length).split('?')[0];
  return url.replace(/^\//, '').split('?')[0];
}
