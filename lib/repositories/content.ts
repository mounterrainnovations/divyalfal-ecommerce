import { unstable_cache, revalidateTag } from 'next/cache';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

/**
 * ContentBlock repository: the draft/published pair the admin edits and the public site reads.
 *
 * Editing writes `draft` only, so nothing the client types reaches the storefront until they
 * press Publish. Publish copies `draft` -> `published` in one transaction and then asks Next to
 * drop the cached read. The revalidation is reported, never thrown: a publish that wrote its
 * rows and failed to bust the cache has still succeeded at the part that matters, and the
 * caller is told so it can say "live in a few minutes" rather than "failed".
 */

/** The cache tag a page's published content is stored under. */
export const contentTag = (page: string) => `content:${page}`;

export interface ContentBlockRecord {
  key: string;
  page: string;
  section: string;
  label: string;
  kind: string;
  draft: Prisma.JsonValue;
  published: Prisma.JsonValue | null;
  updatedAt: Date;
}

export interface PublishResult {
  /** The keys whose `published` value was updated. Keys with no row are left out. */
  published: string[];
  /** False when `revalidateTag` threw: the rows are written, the cache may be stale. */
  revalidated: boolean;
}

/** Thrown when a key names no `ContentBlock`. Routes answer 400/404 rather than 500. */
export class UnknownContentKeyError extends Error {
  readonly key: string;

  constructor(key: string) {
    super(`Unknown content key: ${key}`);
    this.name = 'UnknownContentKeyError';
    this.key = key;
  }
}

async function readPublished(page: string): Promise<Record<string, unknown>> {
  const blocks = await prisma.contentBlock.findMany({
    // Prisma requires DbNull (not JS null) to filter a nullable Json column.
    where: { page, NOT: { published: { equals: Prisma.DbNull } } },
    select: { key: true, published: true },
  });

  const content: Record<string, unknown> = {};
  for (const block of blocks) {
    // A block that has never been published is absent rather than null, so a consumer's
    // `content[key] ?? fallback` lands on the Phase 1 fallback copy instead of rendering a hole.
    if (block.published === null) continue;
    content[block.key] = block.published;
  }
  return content;
}

/**
 * Published values for one page, keyed by `ContentBlock.key`, cached under `content:${page}`.
 *
 * Blocks whose `published` is still null are omitted entirely.
 */
export async function getPublishedContent(page: string): Promise<Record<string, unknown>> {
  const cached = unstable_cache(() => readPublished(page), ['published-content', page], {
    tags: [contentTag(page)],
  });
  return cached();
}

/** The whole block, for the admin editor. Null when the key names no block. */
export async function getDraft(key: string): Promise<ContentBlockRecord | null> {
  return prisma.contentBlock.findUnique({ where: { key } });
}

/**
 * Write a draft value. Throws `UnknownContentKeyError` for a key with no row: blocks are
 * created by the seed, so an unrecognised key is a caller mistake, not a row to invent.
 */
export async function saveDraft(key: string, value: unknown): Promise<ContentBlockRecord> {
  const existing = await prisma.contentBlock.findUnique({ where: { key }, select: { key: true } });
  if (!existing) throw new UnknownContentKeyError(key);

  return prisma.contentBlock.update({
    where: { key },
    data: { draft: value as Prisma.InputJsonValue },
  });
}

/**
 * Copy `draft` -> `published` for each key, in one transaction, then revalidate each affected
 * page's tag. `draft` is left exactly as it was: publishing is a copy, not a move.
 */
export async function publish(keys: string[]): Promise<PublishResult> {
  const unique = [...new Set(keys)];
  if (unique.length === 0) return { published: [], revalidated: true };

  const blocks = await prisma.contentBlock.findMany({
    where: { key: { in: unique } },
    select: { key: true, page: true, draft: true },
  });
  if (blocks.length === 0) return { published: [], revalidated: true };

  await prisma.$transaction(
    blocks.map(block =>
      prisma.contentBlock.update({
        where: { key: block.key },
        data: { published: block.draft as Prisma.InputJsonValue },
      })
    )
  );

  // The write is done and committed. From here nothing may throw.
  let revalidated = true;
  for (const page of new Set(blocks.map(block => block.page))) {
    try {
      // Next 16 wants a cache-life profile with the tag: it says how long the invalidation
      // record is kept, and must outlast the longest cache that carries the tag. 'max' never
      // expires, which is the only answer that cannot silently stop working.
      revalidateTag(contentTag(page), 'max');
    } catch (error) {
      revalidated = false;
      console.error(`[content] revalidateTag(${contentTag(page)}) failed`, error);
    }
  }

  return { published: blocks.map(block => block.key), revalidated };
}

/** Every block on a page, draft and published, for the admin editor's list view. */
export async function listBlocks(page?: string): Promise<ContentBlockRecord[]> {
  return prisma.contentBlock.findMany({
    where: page ? { page } : undefined,
    orderBy: [{ page: 'asc' }, { section: 'asc' }, { key: 'asc' }],
  });
}
