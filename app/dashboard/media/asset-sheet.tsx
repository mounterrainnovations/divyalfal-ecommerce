'use client';

import { useState } from 'react';
import Sheet from '@/components/admin/Sheet';
import Field, { TextInput } from '@/components/admin/Field';
import { Thumb, fileName } from '@/components/admin/AssetPicker';
import {
  ACTION,
  ACTION_DANGER,
  ACTION_GRAVE,
  ACTION_SOFT,
  LABEL,
} from '@/components/admin/styles';
import { cn } from '@/lib/utils';
import { send } from '@/lib/admin/api';
import { SIZE_LABEL, usageSentence, type AdminAsset, type AssetUsage } from '@/lib/admin/media';
import { replaceAsset } from '@/lib/admin/upload';

/**
 * One asset, open for editing: its alt text, its tags, a replacement file, and deletion.
 *
 * **Alt text is the first field and the only one with a warning.** The storefront is
 * accessibility-gated, so a photograph with no alt text is a defect waiting on a page, not a
 * tidying job — and the library is the only place it can be written once for every use.
 *
 * **Deletion is the interesting case.** `DELETE /api/admin/media/[id]` answers 409 with a
 * usage breakdown when the file is still on the site, and that refusal is the feature: the
 * sheet says where it is used, by kind and count, and leaves the file alone. The usage count
 * is also shown before anyone presses Delete, so the refusal is rarely a surprise.
 *
 * The caller mounts this **keyed on the asset id**, so opening a different file gets its own
 * fields rather than an effect copying props into state — the fields are initialised once,
 * from the row, and belong to that row for as long as it is open.
 */
export default function AssetSheet({
  asset,
  usage,
  onClose,
  onSaved,
  onDeleted,
  onToast,
}: {
  asset: AdminAsset;
  usage: AssetUsage | undefined;
  onClose: () => void;
  onSaved: (asset: AdminAsset) => void;
  onDeleted: (id: string) => void;
  onToast: (text: string, tone: 'ok' | 'error') => void;
}) {
  const [alt, setAlt] = useState(asset.alt);
  const [tags, setTags] = useState(asset.tags.join(', '));
  const [busy, setBusy] = useState<'' | 'saving' | 'replacing' | 'deleting'>('');
  const [refusal, setRefusal] = useState('');
  const [confirming, setConfirming] = useState(false);

  const splitTags = () =>
    tags
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean);

  async function save() {
    setBusy('saving');
    const answer = await send<AdminAsset>(`/api/admin/media/${asset.id}`, 'PATCH', {
      alt,
      tags: splitTags(),
    });
    setBusy('');
    if (!answer.ok || !answer.data) {
      onToast(answer.message, 'error');
      return;
    }
    onSaved(answer.data);
    onToast('The file’s details were saved.', 'ok');
  }

  async function replace(file: File) {
    setBusy('replacing');
    const result = await replaceAsset(asset.id, file);
    setBusy('');
    if (!result.ok) {
      onToast(result.message, 'error');
      return;
    }
    onSaved(result.asset);
    onToast(
      'The file was replaced. Everything that shows it now shows the new one — though a browser or cache that already has the old file may keep it for up to an hour.',
      'ok'
    );
  }

  async function remove() {
    setBusy('deleting');
    setRefusal('');
    const answer = await send<{ usage?: AssetUsage }>(
      `/api/admin/media/${asset.id}`,
      'DELETE'
    );
    setBusy('');

    if (answer.ok) {
      onDeleted(asset.id);
      onToast('The file was deleted.', 'ok');
      return;
    }

    // 409: still referenced. The breakdown comes back with the refusal, so say where.
    if (answer.status === 409 && answer.data?.usage) {
      setRefusal(
        `This file was not deleted: it is still used by ${usageSentence(answer.data.usage)}. Change those first, then delete it.`
      );
      setConfirming(false);
      return;
    }
    onToast(answer.message, 'error');
  }

  const working = busy !== '';
  /** A seeded file served from `public/`, not an object in the storage bucket. */
  const shipsWithTheSite = asset.url.startsWith('/');

  return (
    <Sheet
      open
      onClose={() => {
        if (working) return;
        onClose();
      }}
      eyebrow="Media"
      title={asset.alt || fileName(asset.url)}
      footer={
        <>
          <button type="button" disabled={working} onClick={save} className={ACTION}>
            {busy === 'saving' ? 'Saving' : 'Save details'}
          </button>
          <button type="button" disabled={working} onClick={onClose} className={ACTION_SOFT}>
            Close
          </button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <span className="block w-[120px] shrink-0">
            <Thumb url={asset.url} kind={asset.kind} large />
          </span>
          <dl className="min-w-0 flex-1 space-y-1.5 text-[13px] text-slate-600">
            <div className="flex gap-2">
              <dt className={LABEL}>Kind</dt>
              <dd>{asset.kind === 'VIDEO' ? 'Film' : 'Photograph'}</dd>
            </div>
            <div className="flex gap-2">
              <dt className={LABEL}>Size</dt>
              <dd>
                {SIZE_LABEL(asset.bytes)}
                {asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : ''}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className={LABEL}>Used</dt>
              <dd>{usage ? (usage.total === 0 ? 'nowhere yet' : `by ${usageSentence(usage)}`) : 'unknown'}</dd>
            </div>
          </dl>
        </div>

        <Field
          id="asset-alt"
          label="Alt text"
          hint={
            alt.trim()
              ? 'What the photograph shows, for a reader who cannot see it.'
              : 'Empty. Every photograph on the shop needs one line describing it.'
          }
        >
          <TextInput
            id="asset-alt"
            value={alt}
            disabled={working}
            placeholder="A gold silk saree on a wooden hanger"
            onChange={event => setAlt(event.target.value)}
          />
        </Field>

        <Field id="asset-tags" label="Tags" hint="Comma separated. Used to filter the library.">
          <TextInput
            id="asset-tags"
            value={tags}
            disabled={working}
            placeholder="sample, atelier"
            onChange={event => setTags(event.target.value)}
          />
        </Field>

        <div className="border-t border-slate-200 pt-4">
          <p className={cn(LABEL, 'mb-2')}>The file itself</p>
          {shipsWithTheSite ? (
            // A seeded asset's bytes are a file in `public/`, under source control, not an
            // object in storage. The API refuses to replace one, so the button is not offered:
            // a control that always fails is worse than a sentence explaining why.
            <p className="max-w-[68ch] text-[13px] text-slate-500">
              This file ships with the site rather than living in storage, so its bytes cannot be
              replaced here. Upload the new photograph as its own file and use that instead. The
              address is <span className="break-all">{asset.url}</span>
            </p>
          ) : (
            <>
              <p className="max-w-[68ch] mb-3 text-[13px] text-slate-500">
                A replacement keeps this address, so every product, page and slide that shows
                this file shows the new one. The address is{' '}
                <span className="break-all">{asset.url}</span>
              </p>
              <label className={cn(ACTION_SOFT, 'cursor-pointer')}>
                <input
                  type="file"
                  accept={asset.kind === 'VIDEO' ? 'video/mp4,video/webm' : 'image/*'}
                  className="sr-only"
                  disabled={working}
                  onChange={event => {
                    const file = event.target.files?.[0];
                    if (file) replace(file);
                    event.target.value = '';
                  }}
                />
                {busy === 'replacing' ? 'Replacing' : 'Replace this file'}
              </label>
            </>
          )}
        </div>

        <div className="border-t border-slate-200 pt-4">
          <p className={cn(LABEL, 'mb-2')}>Delete</p>
          {refusal ? (
            <p className="max-w-[68ch] mb-3 text-[13px] text-red-600">{refusal}</p>
          ) : (
            <p className="max-w-[68ch] mb-3 text-[13px] text-slate-500">
              {usage && usage.total > 0
                ? `This file is used by ${usageSentence(usage)}, so deleting it will be refused until those are changed.`
                : 'This file is used nowhere, so it can be deleted. The file itself goes too.'}
            </p>
          )}

          {confirming ? (
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" disabled={working} onClick={remove} className={ACTION_DANGER}>
                {busy === 'deleting' ? 'Deleting' : 'Yes, delete it'}
              </button>
              <button
                type="button"
                disabled={working}
                onClick={() => setConfirming(false)}
                className={ACTION_SOFT}
              >
                Keep it
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={working}
              onClick={() => setConfirming(true)}
              className={ACTION_GRAVE}
            >
              Delete this file
            </button>
          )}
        </div>
      </div>
    </Sheet>
  );
}
