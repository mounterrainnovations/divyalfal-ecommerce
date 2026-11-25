'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { ArrowDown, ArrowUp, Plus, Star, Trash2 } from 'lucide-react';
import ScreenHead from '@/components/admin/ScreenHead';
import Notice from '@/components/admin/Notice';
import Toast, { type ToastMessage } from '@/components/admin/Toast';
import Field, { SelectInput, TextInput } from '@/components/admin/Field';
import AssetPicker from '@/components/admin/AssetPicker';
import { request } from '@/lib/admin/api';
import type { Testimonial } from '@/lib/repositories/showcase';
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
} from '@/components/admin/styles';
import { cn } from '@/lib/utils';

/**
 * Testimonials: the client quotes on the homepage.
 *
 * WHY THIS SCREEN EXISTS. The five quotes were an array in
 * `components/sections/testimonials.tsx`. They are on the public homepage, they are exactly the
 * kind of thing a couture shop updates after a good wedding season, and changing one meant a
 * developer, a commit and a deploy. Now it is a form.
 *
 * NOTHING IS INVENTED HERE. The five quotes that load the first time are the five that are
 * live on the site, word for word, and their name fields are blank because they are blank in
 * the source — no client has ever been named beside them. The screen offers the field; it does
 * not fill it in with a plausible-sounding person.
 *
 * SAVING IS WHOLESALE. The list is short and ordered, so the screen sends what the owner is
 * looking at and the server replaces the row. There is no per-item save to leave half a list
 * written, and no merge to get wrong.
 */
export default function TestimonialsPage() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState('');
  const [notSetUp, setNotSetUp] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      const answer = await request<{ testimonials: Testimonial[] }>('/api/admin/showcase', {
        signal: controller.signal,
      });
      if (answer.aborted) return;
      if (answer.notSetUp) setNotSetUp(true);
      else if (!answer.ok) setFailure(answer.message);
      else if (answer.data) setItems(answer.data.testimonials);
      setLoading(false);
    })();

    return () => controller.abort();
  }, []);

  const patch = useCallback((id: string, change: Partial<Testimonial>) => {
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
        // Stable enough for a list key and for the id the server stores; the server re-derives
        // anything missing anyway.
        id: `t-${Date.now().toString(36)}`,
        name: '',
        message: '',
        image: '',
        rating: 5,
      },
    ]);
    setDirty(true);
  }

  function remove(id: string) {
    setItems(current => current.filter(item => item.id !== id));
    setDirty(true);
  }

  async function save() {
    // The server drops an entry with no quote, which would silently delete a card the owner
    // had just added and not yet written. Better to say so and save nothing.
    const blank = items.filter(item => item.message.trim() === '').length;
    if (blank > 0) {
      setToast({
        tone: 'error',
        text:
          blank === 1
            ? 'One testimonial has no quote in it. Write it or remove the card, then save.'
            : `${blank} testimonials have no quote in them. Write them or remove the cards, then save.`,
      });
      return;
    }

    setSaving(true);
    const answer = await request<{ testimonials: Testimonial[] }>('/api/admin/showcase', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testimonials: items }),
    });
    setSaving(false);

    if (!answer.ok) {
      setToast({ tone: 'error', text: answer.message });
      return;
    }
    if (answer.data) setItems(answer.data.testimonials);
    setDirty(false);
    setToast({ tone: 'ok', text: 'Saved. The homepage shows these within a minute.' });
  }

  return (
    <div className={SCREEN}>
      <ScreenHead
        title="Testimonials"
        note="The client quotes on the homepage. They appear in the order below."
        actions={
          <>
            <button type="button" onClick={add} className={ACTION_SOFT} disabled={notSetUp}>
              <Plus size={15} strokeWidth={1.75} aria-hidden="true" />
              Add testimonial
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
          The settings table is not in this database yet, so testimonials cannot be stored. The
          homepage keeps showing the five quotes it has always shown.
        </Notice>
      ) : failure ? (
        <Notice label="Problem" tone="problem">
          {failure}
        </Notice>
      ) : loading ? (
        <Notice label="Loading" tone="working">
          Reading the testimonials.
        </Notice>
      ) : items.length === 0 ? (
        <Notice label="Nothing yet">
          There are no testimonials. Add one and the homepage section fills itself; leave it
          empty and the section shows nothing at all.
        </Notice>
      ) : (
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={item.id} className={CARD}>
              <div className={CARD_HEAD}>
                <h2 className={SECTION_TITLE}>
                  {item.name.trim() || `Testimonial ${index + 1}`}
                </h2>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, index - 1)}
                    disabled={index === 0}
                    aria-label={`Move testimonial ${index + 1} up`}
                    className={ACTION_QUIET}
                  >
                    <ArrowUp size={15} strokeWidth={1.75} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, index + 1)}
                    disabled={index === items.length - 1}
                    aria-label={`Move testimonial ${index + 1} down`}
                    className={ACTION_QUIET}
                  >
                    <ArrowDown size={15} strokeWidth={1.75} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    className={ACTION_GRAVE}
                    aria-label={`Remove testimonial ${index + 1}`}
                  >
                    <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
                    Remove
                  </button>
                </div>
              </div>

              <div className={cn(CARD_BODY, 'grid gap-4 lg:grid-cols-[220px_1fr]')}>
                <div>
                  <p className={cn(META, 'mb-1.5')}>Portrait</p>
                  {item.image ? (
                    <div className="relative mb-2 h-28 w-28 overflow-hidden rounded-md border border-[var(--ds-line)]">
                      <Image
                        src={item.image}
                        alt=""
                        fill
                        sizes="112px"
                        className="object-cover"
                      />
                    </div>
                  ) : null}
                  <AssetPicker
                    value={item.image ? [item.image] : []}
                    onChange={urls => patch(item.id, { image: urls[0] ?? '' })}
                    label="portrait"
                  />
                </div>

                <div className="min-w-0 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
                    <Field
                      id={`name-${item.id}`}
                      label="Client name"
                      hint="Optional. Leave blank to show the quote on its own."
                    >
                      <TextInput
                        id={`name-${item.id}`}
                        value={item.name}
                        onChange={event => patch(item.id, { name: event.target.value })}
                      />
                    </Field>

                    <Field id={`rating-${item.id}`} label="Rating">
                      <SelectInput
                        id={`rating-${item.id}`}
                        value={String(item.rating)}
                        onChange={event =>
                          patch(item.id, { rating: Number(event.target.value) })
                        }
                      >
                        {[5, 4, 3, 2, 1].map(value => (
                          <option key={value} value={value}>
                            {value} {value === 1 ? 'star' : 'stars'}
                          </option>
                        ))}
                      </SelectInput>
                    </Field>
                  </div>

                  <Field id={`message-${item.id}`} label="Quote" required>
                    <textarea
                      id={`message-${item.id}`}
                      rows={4}
                      value={item.message}
                      onChange={event => patch(item.id, { message: event.target.value })}
                      className={cn(INPUT, 'resize-y')}
                    />
                  </Field>

                  <p className={cn(META, 'flex items-center gap-1')}>
                    <Star size={13} strokeWidth={1.75} aria-hidden="true" />
                    Shows as {item.rating} of 5 on the homepage card.
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
