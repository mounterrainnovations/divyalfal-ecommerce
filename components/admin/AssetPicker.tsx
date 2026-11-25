'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Sheet from '@/components/admin/Sheet';
import { TextInput } from '@/components/admin/Field';
import {
  ACTION,
  ACTION_GRAVE,
  ACTION_QUIET,
  ACTION_SOFT,
  FOCUS,
  LABEL,
  META,
} from '@/components/admin/styles';
import { cn } from '@/lib/utils';
import { useAssetLibrary, usageLabel } from '@/lib/admin/media';
import { uploadAsset } from '@/lib/admin/upload';

/**
 * Choose files from the media library, or add one to it on the spot.
 *
 * This is the control the Content screen renders for an `IMAGE`, `IMAGE_LIST` or `VIDEO`
 * block, and it is why the library exists: a photograph on the homepage should be the same
 * object as the photograph in the library, with the same alt text and the same usage count,
 * rather than a URL someone pasted. So the value this writes is always an asset's own URL.
 *
 * It works in URLs rather than ids on purpose. Every consumer of a picture on this site —
 * `Product.photos`, a content block's JSON, the storefront's `<Image src>` — holds a URL, and
 * `countUsage` finds an asset's references by matching that string. An id here would need
 * resolving on every read and would make the usage count unanswerable.
 *
 * `value` is always a list, even where only one file is allowed: it keeps one code path for
 * both, and `multiple={false}` simply replaces rather than appends.
 */
export default function AssetPicker({
  value,
  onChange,
  kind = 'IMAGE',
  multiple = false,
  disabled,
  label,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  kind?: 'IMAGE' | 'VIDEO';
  /** A list block: several files, in an order the admin controls. */
  multiple?: boolean;
  disabled?: boolean;
  /** Names what is being chosen, for the sheet's heading and the buttons' labels. */
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const noun = label ?? (kind === 'VIDEO' ? 'film' : 'photograph');

  const chosen = value.filter(url => url.trim() !== '');

  function move(from: number, to: number) {
    if (to < 0 || to >= chosen.length) return;
    const next = [...chosen];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }

  return (
    <div>
      {chosen.length > 0 ? (
        <ul className="mb-2 divide-y divide-[var(--ds-line)] overflow-hidden rounded-md border border-[var(--ds-line)]">
          {chosen.map((url, index) => (
            <li
              key={`${url}-${index}`}
              className="flex items-center gap-3 px-2.5 py-2" 
            >
              <Thumb url={url} kind={kind} />
              <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--ds-faint)]">
                {fileName(url)}
              </span>
              {multiple && chosen.length > 1 ? (
                <>
                  <button
                    type="button"
                    disabled={disabled || index === 0}
                    onClick={() => move(index, index - 1)}
                    aria-label={`Move ${noun} ${index + 1} up`}
                    className={ACTION_QUIET}
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    disabled={disabled || index === chosen.length - 1}
                    onClick={() => move(index, index + 1)}
                    aria-label={`Move ${noun} ${index + 1} down`}
                    className={ACTION_QUIET}
                  >
                    Down
                  </button>
                </>
              ) : null}
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(chosen.filter((_, i) => i !== index))}
                aria-label={`Remove ${noun} ${index + 1}`}
                className={ACTION_GRAVE}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-2 text-[13px] text-[var(--ds-faint)]">No {noun} chosen.</p>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={ACTION_SOFT}
      >
        {chosen.length > 0 && !multiple ? `Change ${noun}` : `Choose a ${noun}`}
      </button>

      {open ? (
        <Browser
          kind={kind}
          noun={noun}
          onClose={() => setOpen(false)}
          onPick={url => {
            onChange(multiple ? [...chosen.filter(had => had !== url), url] : [url]);
            if (!multiple) setOpen(false);
          }}
          picked={chosen}
        />
      ) : null}
    </div>
  );
}

/** The library in a slide-over: search, upload, and a grid to pick from. */
function Browser({
  kind,
  noun,
  picked,
  onPick,
  onClose,
}: {
  kind: 'IMAGE' | 'VIDEO';
  noun: string;
  picked: string[];
  onPick: (url: string) => void;
  onClose: () => void;
}) {
  const library = useAssetLibrary({ kind });
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState('');
  const [problem, setProblem] = useState('');

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return library.assets;
    return library.assets.filter(asset =>
      [asset.alt, asset.url, ...asset.tags].join(' ').toLowerCase().includes(needle)
    );
  }, [library.assets, query]);

  async function add(file: File) {
    setBusy(file.name);
    setProblem('');
    const result = await uploadAsset(file, { tags: ['upload'] });
    setBusy('');
    if (!result.ok) {
      setProblem(result.message);
      return;
    }
    library.prepend(result.asset);
    onPick(result.asset.url);
  }

  return (
    <Sheet open onClose={onClose} eyebrow="Media library" title={`Choose a ${noun}`}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <div className="min-w-0 flex-1 basis-[180px]">
            <label htmlFor="asset-search" className={cn(LABEL, 'mb-1 block')}>
              Search
            </label>
            <TextInput
              id="asset-search"
              type="search"
              value={query}
              placeholder="Alt text, tag or file name"
              onChange={event => setQuery(event.target.value)}
            />
          </div>
          <label className={cn(ACTION, 'cursor-pointer')}>
            <input
              type="file"
              accept={kind === 'VIDEO' ? 'video/mp4,video/webm' : 'image/*'}
              className="sr-only"
              onChange={event => {
                const file = event.target.files?.[0];
                if (file) add(file);
                event.target.value = '';
              }}
            />
            {busy ? 'Uploading' : 'Upload a file'}
          </label>
        </div>

        {problem ? <p className="text-[13px] text-red-600">{problem}</p> : null}

        {library.notSetUp ? (
          <p className="text-[13px] text-[var(--ds-faint)]">
            The media library table is not in this database yet, so there is nothing to choose
            from. A file uploaded here cannot be listed until the migration has been applied.
          </p>
        ) : library.failure ? (
          <p className="text-[13px] text-red-600">{library.failure}</p>
        ) : shown.length === 0 ? (
          <p className="text-[13px] text-[var(--ds-faint)]">
            {library.loading
              ? 'Loading the library…'
              : query
                ? `Nothing in the library matches “${query}”.`
                : 'The library is empty. Upload a file to start it.'}
          </p>
        ) : (
          <>
            <ul
              className={cn(
                'grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3',
                library.loading && 'opacity-50'
              )}
            >
              {shown.map(asset => (
                <li key={asset.id}>
                  <button
                    type="button"
                    onClick={() => onPick(asset.url)}
                    aria-pressed={picked.includes(asset.url)}
                    className={cn(
                      'block w-full rounded-lg border bg-[var(--ds-surface)] p-2 text-left transition-colors',
                      FOCUS,
                      // The chosen file carries the accent ring; everything else is a plain
                      // card that darkens its border on hover.
                      picked.includes(asset.url)
                        ? 'border-[var(--ds-accent-solid)] ring-1 ring-gold'
                        : 'border-[var(--ds-line)] hover:border-[var(--ds-line-strong)] hover:bg-[var(--ds-surface-sunk)]'
                    )}
                  >
                    <Thumb url={asset.url} kind={asset.kind} large />
                    <span className="mt-2 block truncate text-[13px] font-medium text-[var(--ds-ink)]">
                      {asset.alt || fileName(asset.url)}
                    </span>
                    <span className={cn(META, 'mt-0.5 block truncate')}>
                      {usageLabel(library.usage[asset.id])}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            {library.nextCursor ? (
              <button
                type="button"
                disabled={library.loading}
                onClick={library.loadMore}
                className={ACTION_SOFT}
              >
                {library.loading ? 'Loading' : 'Show more'}
              </button>
            ) : null}
          </>
        )}
      </div>
    </Sheet>
  );
}

/** The last path segment, which is what a human recognises a file by. */
export function fileName(url: string): string {
  return decodeURIComponent(url.split('?')[0].split('/').pop() ?? url);
}

/**
 * A thumbnail, or an honest mark where one cannot be drawn.
 *
 * A film has no frame to show without decoding it, so it gets a labelled box rather than a
 * poster that might be of something else. `unoptimized` keeps the image optimiser out of the
 * portal: these are 36px and 96px crops of files the admin just uploaded, and routing them
 * through a CDN transform to save bytes nobody is paying for is work for no one.
 */
export function Thumb({
  url,
  kind,
  large,
}: {
  url: string;
  kind: 'IMAGE' | 'VIDEO';
  large?: boolean;
}) {
  const side = large ? 'h-[96px] w-full' : 'h-9 w-9 shrink-0';

  if (kind === 'VIDEO') {
    return (
      <span
        aria-hidden="true"
        className={cn(
          'flex items-center justify-center rounded-md border border-[var(--ds-line)] bg-[var(--ds-surface-sunk)]',
          'text-[11px] font-medium text-[var(--ds-faint)]',
          side
        )}
      >
        Film
      </span>
    );
  }

  return (
    <span
      className={cn('relative block overflow-hidden rounded-md border border-[var(--ds-line)] bg-[var(--ds-surface-sunk)]', side)}
    >
      <Image src={url} alt="" fill unoptimized sizes="160px" className="object-cover" />
    </span>
  );
}
