'use client';

import { useCallback, useEffect, useState } from 'react';
import { request } from '@/lib/admin/api';

/**
 * The media library as the browser sees it: the row shape, the usage count, the sentence that
 * explains a refusal, and the one hook both the library screen and the `AssetPicker` load
 * through.
 *
 * `MediaAsset` comes over the wire as JSON, so `createdAt` is a string and the Prisma type
 * cannot be used directly. It is declared once here rather than per consumer.
 */

export interface AdminAsset {
  id: string;
  url: string;
  path: string;
  kind: 'IMAGE' | 'VIDEO';
  alt: string;
  tags: string[];
  bytes: number;
  mimeType: string;
  width: number | null;
  height: number | null;
  createdAt: string;
}

export interface AssetUsage {
  total: number;
  products: number;
  blocks: number;
  slides: number;
}

export interface MediaListResponse {
  assets: AdminAsset[];
  nextCursor: string | null;
  usage: Record<string, AssetUsage>;
}

const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

/**
 * "2 products and 1 slide" — the places an asset is used, named.
 *
 * This is the text a 409 turns into. "It is in use" tells the client nothing they can act on;
 * naming the three kinds of reference tells them where to go and change it. `blocks` is said
 * as "pieces of page copy", because "content block" is a word from the schema and not one
 * from the shop.
 */
export function usageSentence(usage: AssetUsage): string {
  const parts = [
    usage.products > 0 ? plural(usage.products, 'product', 'products') : null,
    usage.blocks > 0 ? plural(usage.blocks, 'piece of page copy', 'pieces of page copy') : null,
    usage.slides > 0 ? plural(usage.slides, 'gallery slide', 'gallery slides') : null,
  ].filter((part): part is string => part !== null);

  if (parts.length === 0) return 'nothing';
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/** "used in 3 places" / "not used yet", for a tile. */
export function usageLabel(usage: AssetUsage | undefined): string {
  if (!usage) return 'usage unknown';
  if (usage.total === 0) return 'not used yet';
  return `used in ${plural(usage.total, 'place', 'places')}`;
}

export const SIZE_LABEL = (bytes: number) =>
  bytes <= 0 ? '—' : bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export interface Library {
  assets: AdminAsset[];
  usage: Record<string, AssetUsage>;
  loading: boolean;
  /** A real failure, already worded for a human. Empty while all is well. */
  failure: string;
  /** The tables are missing. Expected until the migration runs; not a failure. */
  notSetUp: boolean;
  nextCursor: string | null;
  loadMore: () => void;
  reload: () => void;
  /** Put a just-uploaded asset at the front without refetching the page. */
  prepend: (asset: AdminAsset) => void;
  /** Replace one row in place after an edit, keeping its position. */
  replace: (asset: AdminAsset) => void;
  /** Drop a deleted row. */
  remove: (id: string) => void;
}

/**
 * Load the library, newest first, one page at a time.
 *
 * Paging is **append**, not replace: the API is cursor-paginated, so there is no page 2 to go
 * back to — there is only more. A changed filter starts again from the top, which is what the
 * cursor reset in the effect below does.
 */
export function useAssetLibrary(filter: { kind?: 'IMAGE' | 'VIDEO'; tag?: string } = {}): Library {
  const [assets, setAssets] = useState<AdminAsset[]>([]);
  const [usage, setUsage] = useState<Record<string, AssetUsage>>({});
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState('');
  const [notSetUp, setNotSetUp] = useState(false);
  const [reloads, setReloads] = useState(0);

  const { kind, tag } = filter;
  const filterKey = `${kind ?? ''}|${tag ?? ''}|${reloads}`;

  /**
   * The cursor is stored *with the filter it belongs to*, and read back only while that
   * filter still holds. So a changed filter starts from the top by derivation, with no effect
   * resetting state and no render where a page-2 cursor is sent against a page-1 query. The
   * previous filter's rows stay on screen, dimmed, until the new ones arrive — the same thing
   * the Products table does while a query is in flight.
   */
  const [page, setPage] = useState<{ key: string; cursor: string | null }>({
    key: filterKey,
    cursor: null,
  });
  const cursor = page.key === filterKey ? page.cursor : null;

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (kind) params.set('kind', kind);
      if (tag) params.set('tag', tag);
      if (cursor) params.set('cursor', cursor);

      const answer = await request<MediaListResponse>(`/api/admin/media?${params}`, {
        signal: controller.signal,
      });
      if (answer.aborted) return;

      if (answer.ok && answer.data) {
        setAssets(current =>
          cursor
            ? [
                ...current,
                // Belt and braces: a row that arrived twice would break React's keys.
                ...answer.data!.assets.filter(fresh => !current.some(had => had.id === fresh.id)),
              ]
            : answer.data!.assets
        );
        setUsage(current => ({ ...current, ...answer.data!.usage }));
        setNextCursor(answer.data.nextCursor);
        setFailure('');
        setNotSetUp(false);
      } else {
        setNextCursor(null);
        setNotSetUp(answer.notSetUp);
        setFailure(answer.notSetUp ? '' : answer.message);
      }
      setLoading(false);
    };

    load();
    return () => controller.abort();
  }, [kind, tag, cursor, reloads]);

  return {
    assets,
    usage,
    loading,
    failure,
    notSetUp,
    nextCursor,
    loadMore: () => {
      if (nextCursor) setPage({ key: filterKey, cursor: nextCursor });
    },
    reload: useCallback(() => setReloads(value => value + 1), []),
    prepend: (asset: AdminAsset) => {
      setAssets(current => [asset, ...current.filter(had => had.id !== asset.id)]);
      // A file uploaded a second ago is referenced by nothing. Said, rather than left unknown.
      setUsage(current => ({
        ...current,
        [asset.id]: { total: 0, products: 0, blocks: 0, slides: 0 },
      }));
    },
    replace: (asset: AdminAsset) =>
      setAssets(current => current.map(had => (had.id === asset.id ? asset : had))),
    remove: (id: string) => setAssets(current => current.filter(had => had.id !== id)),
  };
}
