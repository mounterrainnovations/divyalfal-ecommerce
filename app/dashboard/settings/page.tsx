'use client';

import { useEffect, useState } from 'react';
import ScreenHead from '@/components/admin/ScreenHead';
import Notice from '@/components/admin/Notice';
import Toast, { type ToastMessage } from '@/components/admin/Toast';
import Field, { TextInput } from '@/components/admin/Field';
import AssetPicker from '@/components/admin/AssetPicker';
import {
  ACTION,
  CARD,
  CARD_BODY,
  INPUT,
  LABEL,
  META,
  SCREEN,
  SECTION_TITLE,
} from '@/components/admin/styles';
import { cn } from '@/lib/utils';
import { request, send } from '@/lib/admin/api';

/**
 * Settings: the shop's own details — how to reach it, where it is, and what a search engine
 * and a shared link show.
 *
 * **`seed.gallery` is not here, and must not be.** `SiteSetting` is a key/value table, so a
 * screen that listed whatever it found would list that row too — and it is not a setting. It
 * is the seed's marker that the slideshow has been seeded once, and it is the only thing
 * stopping a later seed run from reviving a gallery the client deliberately emptied. Deleting
 * it would re-arm a side effect nobody would connect to the deletion. The repository filters
 * it from every read and refuses every write to it; this screen renders the twelve keys it
 * knows by name and nothing else, so the row cannot appear here even if that changed.
 *
 * **Four of those keys have no row yet.** The social addresses and the Open Graph image were
 * never supplied — `siteCopy.footer.social` is an empty array for exactly that reason — so
 * they are offered as empty fields rather than invented. See `EDITABLE_SETTING_KEYS`.
 *
 * **What reads these today.** Nothing on the storefront does: Phase 1 holds the phone number,
 * the address and the page title as constants, and the switch-over is Task 14. Saving here is
 * real and the values are stored, but the shop will not change until that lands, and the
 * notice at the top says so rather than letting a client wonder why their new phone number is
 * not in the footer.
 */

type Values = Record<string, string>;

interface Row {
  key: string;
  label: string;
  hint?: string;
  kind: 'text' | 'lines' | 'url' | 'phone' | 'email' | 'image';
  placeholder?: string;
}

const GROUPS: { title: string; note?: string; rows: Row[] }[] = [
  {
    title: 'Contact',
    rows: [
      {
        key: 'contact.phoneDisplay',
        label: 'Phone, as written',
        kind: 'text',
        hint: 'How the number is printed on the site.',
      },
      {
        key: 'contact.phone',
        label: 'Phone, dialable',
        kind: 'phone',
        hint: 'What a tap on the number dials.',
      },
      { key: 'contact.email', label: 'Email', kind: 'email' },
      { key: 'contact.address', label: 'Address', kind: 'text' },
      {
        key: 'contact.hours',
        label: 'Opening hours',
        kind: 'lines',
        hint: 'One line per line of the page.',
      },
    ],
  },
  {
    title: 'WhatsApp',
    note: 'Where both public forms hand their enquiries over. Digits only, with the country code and no plus sign.',
    rows: [{ key: 'whatsapp', label: 'WhatsApp number', kind: 'phone', placeholder: '919876543210' }],
  },
  {
    title: 'Social',
    note: 'The shop has never published these, so the footer renders no social links at all. Fill one in and it is ready for the footer to use.',
    rows: [
      { key: 'social.instagram', label: 'Instagram', kind: 'url', placeholder: 'https://instagram.com/…' },
      { key: 'social.facebook', label: 'Facebook', kind: 'url', placeholder: 'https://facebook.com/…' },
      { key: 'social.youtube', label: 'YouTube', kind: 'url', placeholder: 'https://youtube.com/…' },
    ],
  },
  {
    title: 'Search and sharing',
    rows: [
      { key: 'seo.title', label: 'Page title', kind: 'text' },
      {
        key: 'seo.description',
        label: 'Description',
        kind: 'lines',
        hint: 'One or two sentences. Search engines show about 155 characters.',
      },
      {
        key: 'seo.ogImage',
        label: 'Sharing image',
        kind: 'image',
        hint: 'Shown when a link to the shop is pasted into a message. Landscape, at least 1200×630.',
      },
    ],
  },
];

const ALL_ROWS = GROUPS.flatMap(group => group.rows);

/** A value as the field edits it: a list becomes one line per item, everything else a string. */
function toField(value: unknown): string {
  if (Array.isArray(value)) return value.filter(item => typeof item === 'string').join('\n');
  if (value === null || value === undefined) return '';
  return typeof value === 'string' ? value : String(value);
}

/** And back: `contact.hours` is stored as an array, so it is sent as one. */
function toStored(row: Row, text: string): unknown {
  if (row.key === 'contact.hours') {
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);
  }
  return text.trim();
}

function problemWith(row: Row, text: string): string {
  const value = text.trim();
  if (!value) return ''; // Empty is allowed everywhere: a shop may not have a YouTube channel.

  if (row.kind === 'url' || row.kind === 'image') {
    if (row.kind === 'image' && value.startsWith('/')) return '';
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        return 'Use a web address beginning with https://';
      }
    } catch {
      return 'That is not a complete web address. It should begin with https://';
    }
  }

  if (row.kind === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return 'That email address does not look right.';
  }

  if (row.key === 'whatsapp' && !/^\d{10,15}$/.test(value)) {
    return 'Digits only, 10 to 15 of them, including the country code.';
  }

  if (row.kind === 'phone' && row.key !== 'whatsapp' && !/^[\d+][\d\s-]{6,}$/.test(value)) {
    return 'That does not look like a number a phone can dial.';
  }

  return '';
}

export default function SettingsPage() {
  const [values, setValues] = useState<Values>({});
  const [original, setOriginal] = useState<Values>({});
  const [loading, setLoading] = useState(true);
  const [notSetUp, setNotSetUp] = useState(false);
  const [failure, setFailure] = useState('');
  const [saving, setSaving] = useState(false);
  const [problems, setProblems] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      const answer = await request<{ settings: Record<string, unknown> }>('/api/admin/settings', {
        signal: controller.signal,
      });
      if (answer.aborted) return;

      if (answer.ok && answer.data) {
        const fields: Values = {};
        for (const row of ALL_ROWS) fields[row.key] = toField(answer.data.settings[row.key]);
        setValues(fields);
        setOriginal(fields);
        setFailure('');
        setNotSetUp(false);
      } else {
        setNotSetUp(answer.notSetUp);
        setFailure(answer.notSetUp ? '' : answer.message);
      }
      setLoading(false);
    };

    load();
    return () => controller.abort();
  }, []);

  const changed = ALL_ROWS.filter(row => (values[row.key] ?? '') !== (original[row.key] ?? ''));

  async function save() {
    const found: Record<string, string> = {};
    for (const row of ALL_ROWS) {
      const problem = problemWith(row, values[row.key] ?? '');
      if (problem) found[row.key] = problem;
    }
    setProblems(found);
    if (Object.keys(found).length > 0) {
      setToast({ text: 'Nothing was saved: check the fields marked below.', tone: 'error' });
      return;
    }

    setSaving(true);
    // Only what changed is sent. The endpoint refuses a patch whole if any key is not
    // editable, so a narrower patch is also a smaller thing to have refused.
    const patch = Object.fromEntries(
      changed.map(row => [row.key, toStored(row, values[row.key] ?? '')])
    );
    const answer = await send<{ settings: Record<string, unknown> }>(
      '/api/admin/settings',
      'PUT',
      patch
    );
    setSaving(false);

    if (!answer.ok) {
      setToast({ text: answer.message, tone: 'error' });
      return;
    }

    setOriginal(values);
    setToast({
      text:
        changed.length === 1
          ? 'One detail was saved.'
          : `${changed.length} details were saved.`,
      tone: 'ok',
    });
  }

  return (
    <div className={SCREEN}>
      <ScreenHead
        title="Settings"
        note="The shop's own details, in one place."
        actions={
          <button
            type="button"
            disabled={saving || changed.length === 0 || loading || notSetUp}
            onClick={save}
            className={ACTION}
          >
            {saving
              ? 'Saving'
              : changed.length === 0
                ? 'Saved'
                : `Save ${changed.length} change${changed.length === 1 ? '' : 's'}`}
          </button>
        }
      />

      {notSetUp ? (
        <Notice label="Not set up yet">
          The settings table is not in this database yet, so there is nothing to edit. The shop
          meanwhile shows the contact details it was built with.
        </Notice>
      ) : failure ? (
        <Notice label="Problem" tone="problem">
          {failure}
        </Notice>
      ) : loading ? (
        <Notice label="Loading" tone="working">
          Reading the shop’s details…
        </Notice>
      ) : (
        <>
          <Notice label="What the shop reads today" className="mb-4">
            These values are stored, and nothing on the public pages reads them yet — the phone
            number, the address and the page title are still the ones the site was built with.
            Changing them here is safe and will take effect when the storefront is switched over
            to the content system.
          </Notice>

          {/* One card per group of settings. The group's note lives in the card's header
              rather than above the whole form, so the warning about a key nobody reads yet
              sits on the fields it is about. */}
          <div className="space-y-4">
            {GROUPS.map(group => (
              <section key={group.title} className={CARD}>
                <div className="border-b border-slate-200 px-4 py-3">
                  <h2 className={SECTION_TITLE}>{group.title}</h2>
                  {group.note ? (
                    <p className={cn(META, 'mt-1 max-w-[68ch]')}>{group.note}</p>
                  ) : null}
                </div>

                <div className={cn(CARD_BODY, 'grid max-w-[640px] gap-5')}>
                  {group.rows.map(row => {
                    const id = `setting-${row.key.replace(/\./g, '-')}`;
                    const value = values[row.key] ?? '';

                    if (row.kind === 'image') {
                      return (
                        <div key={row.key}>
                          <p className={cn(LABEL, 'mb-1.5')}>{row.label}</p>
                          <AssetPicker
                            kind="IMAGE"
                            label="sharing image"
                            value={value ? [value] : []}
                            onChange={urls =>
                              setValues(current => ({ ...current, [row.key]: urls[0] ?? '' }))
                            }
                          />
                          {row.hint ? <p className={cn(META, 'mt-1.5')}>{row.hint}</p> : null}
                        </div>
                      );
                    }

                    return (
                      <Field
                        key={row.key}
                        id={id}
                        label={row.label}
                        hint={row.hint}
                        error={problems[row.key]}
                      >
                        {row.kind === 'lines' ? (
                          <textarea
                            id={id}
                            rows={3}
                            value={value}
                            aria-invalid={problems[row.key] ? true : undefined}
                            onChange={event =>
                              setValues(current => ({ ...current, [row.key]: event.target.value }))
                            }
                            className={cn(INPUT, 'resize-y leading-relaxed')}
                          />
                        ) : (
                          <TextInput
                            id={id}
                            type={row.kind === 'url' ? 'url' : row.kind === 'email' ? 'email' : 'text'}
                            inputMode={row.kind === 'phone' ? 'tel' : undefined}
                            value={value}
                            placeholder={row.placeholder}
                            invalid={Boolean(problems[row.key])}
                            onChange={event =>
                              setValues(current => ({ ...current, [row.key]: event.target.value }))
                            }
                          />
                        )}
                      </Field>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </>
      )}

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
