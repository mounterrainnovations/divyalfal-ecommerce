'use client';

import { useEffect, useRef, useState } from 'react';
import { GripVertical } from 'lucide-react';
import ScreenHead from '@/components/admin/ScreenHead';
import Notice from '@/components/admin/Notice';
import Toast, { type ToastMessage } from '@/components/admin/Toast';
import { CheckboxField } from '@/components/admin/Field';
import { ACTION, ACTION_QUIET, LABEL, RULE } from '@/components/admin/styles';
import { cn } from '@/lib/utils';
import { request, send } from '@/lib/admin/api';
import type { Product } from '@/types';
import ProductPicker from './product-picker';

/**
 * Homepage: the order of the seven movements, which of them are shown, and the garments
 * hand-picked into the two that carry products.
 *
 * **What the storefront reads today, stated on the screen.** `app/page.tsx` renders the seven
 * movements as seven components in source order, and `/api/homepage-sections` deliberately
 * ignores `visible` — an empty product array makes the storefront fall back to placeholder
 * garments, so hiding a movement there would replace it with fake stock rather than with
 * nothing. Of what this screen saves, only the hand-picked garments reach the public site now;
 * order and visibility are stored for the storefront flip (Task 14).
 *
 * That is an awkward thing to admit in a UI, and the alternative is worse: a toggle that
 * reports success and changes nothing is how a client finds out six weeks later that their
 * homepage never obeyed them. So the notice is the first thing on the screen and the
 * visibility control says what it currently does.
 *
 * **Reordering works two ways.** Drag a row by its handle, or use its Up and Down buttons.
 * The buttons are not a fallback: drag-and-drop cannot be done with a keyboard and is
 * miserable on a touch screen, so the same operation exists as a control that takes focus.
 *
 * **Nothing saves itself here.** Unlike Content, this screen is one Save for the whole
 * arrangement: a half-applied reorder is not a state worth having, and `PUT /api/admin/homepage`
 * writes all seven rows in one transaction.
 */

interface Section {
  key: string;
  label: string;
  order: number;
  visible: boolean;
  productIds: string[];
}

/** What a movement shows when nothing is hand-picked — the queries in `lib/repositories/homepage.ts`. */
const AUTOMATIC: Record<string, string> = {
  collection: 'the four newest garments',
  shopByStyle: 'the newest garment in each category',
  bestSellers: 'four garments priced between ₹5,000 and ₹10,000',
};

export default function HomepagePage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [notSetUp, setNotSetUp] = useState(false);
  const [failure, setFailure] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState<string | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const dragFrom = useRef<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      const [answer, catalogue] = await Promise.all([
        request<{ sections: Section[] }>('/api/admin/homepage', { signal: controller.signal }),
        request<{ products: Product[] }>('/api/products?limit=100', {
          signal: controller.signal,
        }),
      ]);
      if (answer.aborted) return;

      if (answer.ok && answer.data) {
        setSections(answer.data.sections);
        setFailure('');
        setNotSetUp(false);
      } else {
        setNotSetUp(answer.notSetUp);
        setFailure(answer.notSetUp ? '' : answer.message);
      }
      // The catalogue is only needed for the two curated movements; a failure there is not a
      // failure of this screen, it just means nothing can be picked.
      if (catalogue.ok && catalogue.data) setProducts(catalogue.data.products ?? []);
      setLoading(false);
    };

    load();
    return () => controller.abort();
  }, []);

  function update(key: string, change: Partial<Section>) {
    setSections(current =>
      current.map(section => (section.key === key ? { ...section, ...change } : section))
    );
    setDirty(true);
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= sections.length || from === to) return;
    setSections(current => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    const answer = await send<{ saved: string[]; unknown: string[]; revalidated: boolean }>(
      '/api/admin/homepage',
      'PUT',
      {
        // The order is the order on screen; the stored `order` numbers are rewritten from it.
        sections: sections.map((section, index) => ({
          key: section.key,
          order: index,
          visible: section.visible,
          productIds: section.productIds,
        })),
      }
    );
    setSaving(false);

    if (!answer.ok || !answer.data) {
      setToast({ text: answer.message, tone: 'error' });
      return;
    }

    setDirty(false);
    const { unknown, revalidated } = answer.data;

    if (unknown.length > 0) {
      setToast({
        text: `Saved, except ${unknown.join(', ')} — the server has no such movement.`,
        tone: 'error',
      });
      return;
    }

    setToast({
      text: revalidated
        ? 'The homepage arrangement is saved. The hand-picked garments are live now.'
        : 'The homepage arrangement is saved, but the cached pages could not be refreshed — hand-picked garments may take a few minutes to appear.',
      tone: 'ok',
    });
  }

  return (
    <div className="max-w-[1120px] px-[var(--gutter)] py-6">
      <ScreenHead
        eyebrow="Portal"
        title="Homepage"
        note="The seven movements of the homepage, top to bottom."
        actions={
          <button type="button" disabled={!dirty || saving} onClick={save} className={ACTION}>
            {saving ? 'Saving' : dirty ? 'Save arrangement' : 'Saved'}
          </button>
        }
      />

      {notSetUp ? (
        <Notice label="Not set up yet">
          The homepage table is not in this database yet, so there is nothing to arrange. The
          shop meanwhile shows the seven movements in their built-in order, which is what it has
          always done.
        </Notice>
      ) : failure ? (
        <Notice label="Problem" tone="problem">
          {failure}
        </Notice>
      ) : loading ? (
        <Notice label="Loading">Reading the homepage arrangement…</Notice>
      ) : sections.length === 0 ? (
        <Notice label="Nothing yet">
          The homepage table exists but holds no movements. Run the CMS seed to create the seven.
        </Notice>
      ) : (
        <>
          <Notice label="What the shop reads today" className="mb-6">
            Hand-picked garments are live: the shop uses them the moment they are saved. The{' '}
            <strong className="font-normal text-ink">order</strong> and the{' '}
            <strong className="font-normal text-ink">shown/hidden</strong> switch are saved here
            but are not read by the public homepage yet — it renders all seven movements in their
            built-in order. Hiding a movement by emptying it is worse than leaving it: an empty
            product band falls back to placeholder garments rather than disappearing.
          </Notice>

          <ul className={cn('border-t', RULE)}>
            {sections.map((section, index) => {
              const automatic = AUTOMATIC[section.key];
              return (
                <li
                  key={section.key}
                  draggable
                  onDragStart={() => {
                    dragFrom.current = index;
                    setDragging(index);
                  }}
                  onDragEnd={() => {
                    dragFrom.current = null;
                    setDragging(null);
                  }}
                  onDragOver={event => event.preventDefault()}
                  onDrop={event => {
                    event.preventDefault();
                    if (dragFrom.current !== null) move(dragFrom.current, index);
                    dragFrom.current = null;
                    setDragging(null);
                  }}
                  className={cn('border-b py-3', RULE, dragging === index && 'bg-paper-deep')}
                >
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    <GripVertical
                      size={14}
                      strokeWidth={1.5}
                      aria-hidden="true"
                      className="shrink-0 cursor-grab text-ink-soft"
                    />
                    <span className={cn(LABEL, 'w-4 shrink-0 tabular-nums')}>{index + 1}</span>
                    <span className="min-w-0 flex-1 basis-[120px] font-ui text-caption text-ink">
                      {section.label}
                    </span>

                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => move(index, index - 1)}
                      aria-label={`Move ${section.label} up`}
                      className={ACTION_QUIET}
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      disabled={index === sections.length - 1}
                      onClick={() => move(index, index + 1)}
                      aria-label={`Move ${section.label} down`}
                      className={ACTION_QUIET}
                    >
                      Down
                    </button>

                    <CheckboxField
                      id={`visible-${section.key}`}
                      label="Shown"
                      checked={section.visible}
                      onChange={checked => update(section.key, { visible: checked })}
                    />

                    {automatic ? (
                      <button
                        type="button"
                        onClick={() => setPicking(section.key)}
                        className={ACTION_QUIET}
                      >
                        {section.productIds.length > 0
                          ? `${section.productIds.length} garments chosen`
                          : 'Choose garments'}
                      </button>
                    ) : null}
                  </div>

                  {automatic ? (
                    <p className="mt-1.5 pl-[52px] font-ui text-eyebrow text-ink-soft">
                      {section.productIds.length > 0
                        ? `Hand-picked, in the chosen order.`
                        : `Automatic: ${automatic}.`}
                    </p>
                  ) : (
                    <p className="mt-1.5 pl-[52px] font-ui text-eyebrow text-ink-soft">
                      Copy and photography only — no garments. Its words are in Content.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>

          {picking ? (
            <ProductPicker
              label={sections.find(section => section.key === picking)?.label ?? picking}
              automatic={AUTOMATIC[picking] ?? 'the automatic selection'}
              products={products}
              chosen={sections.find(section => section.key === picking)?.productIds ?? []}
              onChange={productIds => update(picking, { productIds })}
              onClose={() => setPicking(null)}
            />
          ) : null}
        </>
      )}

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
