'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowDown, ArrowUp, ExternalLink } from 'lucide-react';
import ScreenHead from '@/components/admin/ScreenHead';
import Notice from '@/components/admin/Notice';
import Toast, { type ToastMessage } from '@/components/admin/Toast';
import { CheckboxField } from '@/components/admin/Field';
import AssetPicker from '@/components/admin/AssetPicker';
import { request } from '@/lib/admin/api';
import type { CategoryTile } from '@/lib/repositories/showcase';
import {
  ACTION,
  ACTION_QUIET,
  CARD,
  CARD_BODY,
  CARD_HEAD,
  META,
  SCREEN,
  SECTION_TITLE,
  badge,
} from '@/components/admin/styles';
import { cn } from '@/lib/utils';

/**
 * Categories: the six tiles on the homepage, and the pictures they wear.
 *
 * WHY THIS SCREEN EXISTS. The tiles were `CATEGORY_CONFIG`, an array in
 * `lib/common/product-interfaces.ts`. Every one of them is a link into the shop and a
 * photograph on the front page, and neither could be changed without a deploy.
 *
 * WHY THE NAMES ARE NOT EDITABLE, AND WHY THAT IS NOT A LIMITATION. A tile's name is the value
 * the storefront puts in `/products?categories=…`, and `CATEGORY_MAPPING` turns it back into a
 * `ProductType` to query. Rename "Lehengas" here and the tile would link to a filter that
 * matches nothing — silently, with no error for anyone to see. The six categories are the
 * database's own enum; what a shop actually wants to change is which ones show, in what order,
 * and behind which photograph. That is what this screen offers.
 *
 * THE COUNT IS THE POINT. Each row says how many products are actually filed under it, because
 * that is the number that answers "should this tile be on the front page at all?" — a category
 * tile leading to an empty results page is the worst thing on a shop's homepage.
 */
export default function CategoriesPage() {
  const [tiles, setTiles] = useState<CategoryTile[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState('');
  const [notSetUp, setNotSetUp] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      const answer = await request<{
        categories: CategoryTile[];
        counts: Record<string, number>;
      }>('/api/admin/showcase', { signal: controller.signal });
      if (answer.aborted) return;
      if (answer.notSetUp) setNotSetUp(true);
      else if (!answer.ok) setFailure(answer.message);
      else if (answer.data) {
        setTiles(answer.data.categories);
        setCounts(answer.data.counts ?? {});
      }
      setLoading(false);
    })();

    return () => controller.abort();
  }, []);

  function patch(name: string, change: Partial<CategoryTile>) {
    setTiles(current => current.map(tile => (tile.name === name ? { ...tile, ...change } : tile)));
    setDirty(true);
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= tiles.length || from === to) return;
    setTiles(current => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    const answer = await request<{ categories: CategoryTile[] }>('/api/admin/showcase', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categories: tiles }),
    });
    setSaving(false);

    if (!answer.ok) {
      setToast({ tone: 'error', text: answer.message });
      return;
    }
    if (answer.data) setTiles(answer.data.categories);
    setDirty(false);
    setToast({ tone: 'ok', text: 'Saved. The homepage shows these within a minute.' });
  }

  const hidden = tiles.filter(tile => !tile.visible).length;

  return (
    <div className={SCREEN}>
      <ScreenHead
        title="Categories"
        note="The six tiles on the homepage. Names come from the catalogue itself and cannot be edited here."
        actions={
          <button
            type="button"
            onClick={save}
            className={ACTION}
            disabled={!dirty || saving || notSetUp}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        }
      />

      {notSetUp ? (
        <Notice label="Not set up yet">
          The settings table is not in this database yet, so category pictures cannot be stored.
          The homepage keeps showing the six tiles it has always shown.
        </Notice>
      ) : failure ? (
        <Notice label="Problem" tone="problem">
          {failure}
        </Notice>
      ) : loading ? (
        <Notice label="Loading" tone="working">
          Reading the categories.
        </Notice>
      ) : (
        <>
          {hidden > 0 ? (
            <Notice label="Hidden from the homepage" className="mb-4">
              {hidden === 1
                ? 'One category is hidden. It still has its own page and its products are still in the shop — it simply has no tile on the front page.'
                : `${hidden} categories are hidden. They still have their own pages and their products are still in the shop — they simply have no tiles on the front page.`}
            </Notice>
          ) : null}

          <div className="space-y-4">
            {tiles.map((tile, index) => {
              const count = counts[tile.type] ?? 0;
              return (
                <div key={tile.name} className={CARD}>
                  <div className={CARD_HEAD}>
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <h2 className={SECTION_TITLE}>{tile.name}</h2>
                      <span className={badge(count === 0 ? 'warn' : 'neutral')}>
                        {count === 0
                          ? 'No products'
                          : `${count} ${count === 1 ? 'product' : 'products'}`}
                      </span>
                      {tile.visible ? null : <span className={badge()}>Hidden</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/products?categories=${encodeURIComponent(tile.name)}`}
                        target="_blank"
                        className={ACTION_QUIET}
                      >
                        View in shop
                        <ExternalLink size={14} strokeWidth={1.75} aria-hidden="true" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => move(index, index - 1)}
                        disabled={index === 0}
                        aria-label={`Move ${tile.name} up`}
                        className={ACTION_QUIET}
                      >
                        <ArrowUp size={15} strokeWidth={1.75} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(index, index + 1)}
                        disabled={index === tiles.length - 1}
                        aria-label={`Move ${tile.name} down`}
                        className={ACTION_QUIET}
                      >
                        <ArrowDown size={15} strokeWidth={1.75} aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <div className={cn(CARD_BODY, 'grid gap-4 sm:grid-cols-[160px_1fr]')}>
                    <div>
                      {tile.image ? (
                        <div className="relative mb-2 aspect-[3/4] w-32 overflow-hidden rounded-md border border-[var(--ds-line)]">
                          <Image
                            src={tile.image}
                            alt=""
                            fill
                            sizes="128px"
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <p className={cn(META, 'mb-2')}>No picture chosen.</p>
                      )}
                    </div>

                    <div className="min-w-0 space-y-4">
                      <div>
                        <p className={cn(META, 'mb-1.5')}>Tile photograph</p>
                        <AssetPicker
                          value={tile.image ? [tile.image] : []}
                          onChange={urls => patch(tile.name, { image: urls[0] ?? '' })}
                          label="tile photograph"
                        />
                      </div>

                      <CheckboxField
                        id={`visible-${tile.type}`}
                        label="Show this tile on the homepage"
                        checked={tile.visible}
                        onChange={visible => patch(tile.name, { visible })}
                        hint={
                          count === 0
                            ? 'Nothing is filed under this category, so the tile currently leads to an empty page.'
                            : undefined
                        }
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
