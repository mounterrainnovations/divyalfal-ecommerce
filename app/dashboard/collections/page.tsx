'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowDown, ArrowUp, ExternalLink, Plus, Trash2 } from 'lucide-react';
import ScreenHead from '@/components/admin/ScreenHead';
import Notice from '@/components/admin/Notice';
import Toast, { type ToastMessage } from '@/components/admin/Toast';
import Field, { CheckboxField, TextInput } from '@/components/admin/Field';
import AssetPicker from '@/components/admin/AssetPicker';
import { request } from '@/lib/admin/api';
import { slugify, type Collection } from '@/lib/content/collections';
import {
  ACTION,
  ACTION_GRAVE,
  ACTION_QUIET,
  ACTION_SOFT,
  CARD,
  CARD_BODY,
  CARD_HEAD,
  INPUT,
  META,
  SCREEN,
  SECTION_TITLE,
  badge,
} from '@/components/admin/styles';
import { cn } from '@/lib/utils';
import ProductPicker, { type PickerProduct } from './product-picker';

/**
 * Collections: the curated groups the homepage offers, and the garments inside each one.
 *
 * WHY THIS SCREEN EXISTS. The homepage section called "Explore our collection" showed four
 * individual dresses, which is not what the words promise. The owner asked for it to show what
 * the collections *are* — the way the category strip does — and for a click to open the
 * garments inside one. A collection is therefore something the shop composes by hand, and this
 * is where it composes it.
 *
 * NOTHING IS INVENTED HERE. The screen starts empty because the shop has never published a
 * collection; there is no seeded "Bridal" with borrowed copy and a stock photograph. Until the
 * owner makes one, the homepage keeps showing the garment strip it has always shown, which is
 * stated on the screen so nobody has to guess what the public site is doing meanwhile.
 *
 * SAVING IS WHOLESALE, like Testimonials. The list is short and ordered, so the screen sends
 * what the owner is looking at and the server replaces the row — no per-collection save to
 * leave half a list written, and no merge to get wrong. It also means a delete is not final
 * until Save, which is the right shape for a destructive action on a list this small: the
 * owner can remove the wrong card and simply reload.
 *
 * THE COUNT IS THE POINT, twice over. `productIds` is a JSON array and not a foreign key, so a
 * collection can name a garment that has since been deleted and nothing in the database would
 * notice. Each card therefore shows how many of its garments *still exist*, and a visible
 * collection with none of them left is called out — on the public site that is a page with a
 * heading and nothing under it, which is the worst thing a homepage tile can lead to.
 */
export default function CollectionsPage() {
  const [items, setItems] = useState<Collection[]>([]);
  const [products, setProducts] = useState<PickerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState('');
  const [notSetUp, setNotSetUp] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      const answer = await request<{ collections: Collection[]; products: PickerProduct[] }>(
        '/api/admin/collections',
        { signal: controller.signal }
      );
      if (answer.aborted) return;
      if (answer.notSetUp) setNotSetUp(true);
      else if (!answer.ok) setFailure(answer.message);
      else if (answer.data) {
        setItems(answer.data.collections ?? []);
        // A catalogue that failed to read is an empty array from the route, not an error: the
        // rest of this screen still works, and the picker says what it cannot do.
        setProducts(answer.data.products ?? []);
      }
      setLoading(false);
    })();

    return () => controller.abort();
  }, []);

  /** Every garment id the catalogue actually holds, for the counts and the picker. */
  const live = useMemo(() => new Set(products.map(product => product.id)), [products]);

  const patch = useCallback((id: string, change: Partial<Collection>) => {
    setItems(current => current.map(item => (item.id === id ? { ...item, ...change } : item)));
    setDirty(true);
  }, []);

  function move(from: number, to: number) {
    if (to < 0 || to >= items.length || from === to) return;
    setItems(current => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setDirty(true);
  }

  function add() {
    setItems(current => [
      ...current,
      {
        // Stable enough for a React key and for the id the server stores; the parser fills in
        // anything missing anyway. The slug is left blank on purpose — the server derives it
        // from the name on save, and `slugFor` below previews what it will be.
        id: `col-${Date.now().toString(36)}`,
        slug: '',
        name: '',
        blurb: '',
        image: '',
        productIds: [],
        visible: true,
      },
    ]);
    setDirty(true);
  }

  function remove(id: string) {
    setItems(current => current.filter(item => item.id !== id));
    setDirty(true);
  }

  async function save() {
    // The parser drops an entry with no name, which would silently delete a card the owner had
    // just added and not yet written. Better to say so and save nothing.
    const nameless = items.filter(item => item.name.trim() === '').length;
    if (nameless > 0) {
      setToast({
        tone: 'error',
        text:
          nameless === 1
            ? 'One collection has no name. Name it or remove the card, then save.'
            : `${nameless} collections have no name. Name them or remove the cards, then save.`,
      });
      return;
    }

    setSaving(true);
    const answer = await request<{ collections: Collection[] }>('/api/admin/collections', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collections: items }),
    });
    setSaving(false);

    if (!answer.ok) {
      setToast({ tone: 'error', text: answer.message });
      return;
    }
    // Adopt what was stored rather than what was sent: the server allocates the slugs and
    // de-duplicates them, so this is how the owner sees the URL their collection really has.
    if (answer.data?.collections) setItems(answer.data.collections);
    setDirty(false);

    const empty = items.filter(item => item.visible && countIn(item) === 0).length;
    setToast({
      tone: 'ok',
      text:
        empty === 0
          ? 'Saved. The homepage shows these within a minute.'
          : empty === 1
            ? 'Saved. One collection is shown on the homepage with no garments in it, so its page is empty.'
            : `Saved. ${empty} collections are shown on the homepage with no garments in them, so their pages are empty.`,
    });
  }

  /** How many of a collection's garments are still in the catalogue. */
  function countIn(collection: Collection): number {
    return collection.productIds.filter(id => live.has(id)).length;
  }

  /** The URL this collection has, or will have once it is saved. */
  function slugFor(collection: Collection): string {
    return collection.slug || slugify(collection.name);
  }

  const picked = picking ? items.find(item => item.id === picking) : undefined;
  const emptyVisible = items.filter(item => item.visible && countIn(item) === 0).length;

  return (
    <div className={SCREEN}>
      <ScreenHead
        title="Collections"
        note="The curated groups on the homepage. They appear in the order below, and a visitor clicking one lands on its own page."
        actions={
          <>
            <button type="button" onClick={add} className={ACTION_SOFT} disabled={notSetUp}>
              <Plus size={15} strokeWidth={1.75} aria-hidden="true" />
              Add collection
            </button>
            <button
              type="button"
              onClick={save}
              className={ACTION}
              disabled={!dirty || saving || notSetUp}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </>
        }
      />

      {notSetUp ? (
        <Notice label="Not set up yet">
          The settings table is not in this database yet, so collections cannot be stored. The
          homepage keeps showing the garment strip it has always shown.
        </Notice>
      ) : failure ? (
        <Notice label="Problem" tone="problem">
          {failure}
        </Notice>
      ) : loading ? (
        <Notice label="Loading" tone="working">
          Reading the collections.
        </Notice>
      ) : items.length === 0 ? (
        <Notice label="Nothing yet">
          There are no collections. Until there is one, the homepage&apos;s &ldquo;Explore our
          collection&rdquo; strip keeps showing individual garments exactly as it does today — add a
          collection and the strip starts showing collections instead.
        </Notice>
      ) : (
        <>
          {emptyVisible > 0 ? (
            <Notice label="Shown with nothing in them" className="mb-4">
              {emptyVisible === 1
                ? 'One collection is set to show on the homepage but has no garments in it. A visitor clicking its tile would land on an empty page — pick its garments, or hide it until you have.'
                : `${emptyVisible} collections are set to show on the homepage but have no garments in them. A visitor clicking their tiles would land on empty pages — pick their garments, or hide them until you have.`}
            </Notice>
          ) : null}

          <div className="space-y-4">
            {items.map((item, index) => {
              const count = countIn(item);
              const gone = item.productIds.length - count;
              const slug = slugFor(item);

              return (
                <div key={item.id} className={CARD}>
                  <div className={CARD_HEAD}>
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <h2 className={SECTION_TITLE}>
                        {item.name.trim() || `Collection ${index + 1}`}
                      </h2>
                      {/* Empty is only a warning when the public site is offering it. */}
                      <span className={badge(count === 0 && item.visible ? 'warn' : 'neutral')}>
                        {count === 0
                          ? 'No garments'
                          : `${count} ${count === 1 ? 'garment' : 'garments'}`}
                      </span>
                      {gone > 0 ? (
                        <span className={badge('warn')}>
                          {gone === 1 ? '1 garment gone' : `${gone} garments gone`}
                        </span>
                      ) : null}
                      {item.visible ? null : <span className={badge()}>Hidden</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      {item.slug ? (
                        <Link
                          href={`/collections/${item.slug}`}
                          target="_blank"
                          className={ACTION_QUIET}
                        >
                          View in shop
                          <ExternalLink size={14} strokeWidth={1.75} aria-hidden="true" />
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => move(index, index - 1)}
                        disabled={index === 0}
                        aria-label={`Move ${item.name.trim() || `collection ${index + 1}`} up`}
                        className={ACTION_QUIET}
                      >
                        <ArrowUp size={15} strokeWidth={1.75} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(index, index + 1)}
                        disabled={index === items.length - 1}
                        aria-label={`Move ${item.name.trim() || `collection ${index + 1}`} down`}
                        className={ACTION_QUIET}
                      >
                        <ArrowDown size={15} strokeWidth={1.75} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(item.id)}
                        className={ACTION_GRAVE}
                        aria-label={`Remove ${item.name.trim() || `collection ${index + 1}`}`}
                      >
                        <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className={cn(CARD_BODY, 'grid gap-4 lg:grid-cols-[220px_1fr]')}>
                    <div>
                      <p className={cn(META, 'mb-1.5')}>Photograph</p>
                      {item.image ? (
                        <div className="relative mb-2 aspect-[3/4] w-32 overflow-hidden rounded-md border border-[var(--ds-line)]">
                          <Image
                            src={item.image}
                            alt=""
                            fill
                            sizes="128px"
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <p className={cn(META, 'mb-2')}>No picture chosen.</p>
                      )}
                      <AssetPicker
                        value={item.image ? [item.image] : []}
                        onChange={urls => patch(item.id, { image: urls[0] ?? '' })}
                        label="collection photograph"
                      />
                    </div>

                    <div className="min-w-0 space-y-4">
                      <Field
                        id={`name-${item.id}`}
                        label="Name"
                        required
                        hint={
                          slug
                            ? `Its page will be /collections/${slug}${
                                item.slug
                                  ? ''
                                  : ' — fixed when you save, so later renames keep the same link.'
                              }`
                            : 'The name becomes the collection’s web address, so give it one before saving.'
                        }
                      >
                        <TextInput
                          id={`name-${item.id}`}
                          value={item.name}
                          onChange={event => patch(item.id, { name: event.target.value })}
                        />
                      </Field>

                      <Field
                        id={`blurb-${item.id}`}
                        label="Blurb"
                        hint="Optional. One or two sentences under the heading on the collection’s own page."
                      >
                        <textarea
                          id={`blurb-${item.id}`}
                          rows={3}
                          value={item.blurb}
                          onChange={event => patch(item.id, { blurb: event.target.value })}
                          className={cn(INPUT, 'resize-y')}
                        />
                      </Field>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPicking(item.id)}
                          className={ACTION_SOFT}
                        >
                          {count === 0 ? 'Pick garments' : 'Change garments'}
                        </button>
                        <p className={META}>
                          {count === 0
                            ? 'A collection shows exactly the garments picked here — there is no automatic query behind it.'
                            : `${count} ${count === 1 ? 'garment' : 'garments'}, in the order chosen.`}
                        </p>
                      </div>

                      <CheckboxField
                        id={`visible-${item.id}`}
                        label="Show this collection on the homepage"
                        checked={item.visible}
                        onChange={visible => patch(item.id, { visible })}
                        hint={
                          count === 0
                            ? 'Nothing is in this collection yet, so its tile would lead to an empty page.'
                            : 'Hiding it removes the tile. Its page stays reachable, so a link you have already shared keeps working.'
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

      {picked ? (
        <ProductPicker
          label={picked.name.trim() || 'this collection'}
          products={products}
          chosen={picked.productIds}
          onChange={productIds => patch(picked.id, { productIds })}
          onClose={() => setPicking(null)}
        />
      ) : null}

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
