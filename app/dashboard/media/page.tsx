'use client';

import { useMemo, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import ScreenHead from '@/components/admin/ScreenHead';
import Notice from '@/components/admin/Notice';
import Toast, { type ToastMessage } from '@/components/admin/Toast';
import { SelectInput, TextInput } from '@/components/admin/Field';
import { Thumb, fileName } from '@/components/admin/AssetPicker';
import {
  ACTION,
  ACTION_SOFT,
  CARD,
  FOCUS,
  LABEL,
  META,
  SCREEN,
  badge,
} from '@/components/admin/styles';
import { cn } from '@/lib/utils';
import {
  SIZE_LABEL,
  useAssetLibrary,
  usageLabel,
  type AdminAsset,
} from '@/lib/admin/media';
import { describeRejection, uploadAsset } from '@/lib/admin/upload';
import AssetSheet from './asset-sheet';

/**
 * Media: every photograph and film the site uses, in one grid.
 *
 * **Why a grid and not a table.** Everything else in the portal is a dense table, because
 * everything else is text. These rows are pictures, and the thing an admin needs to find is
 * "the one of the gold saree" — which a 36px row cannot show. So this screen is the one
 * exception to the table idiom, with the portal's density kept in everything around the
 * pictures: 11px labels, hairlines, no cards.
 *
 * **Uploading.** Drop files anywhere on the grid, or use the file picker, and they go up one
 * at a time with a count. Sequential rather than parallel on purpose: a drop of twenty
 * photographs would otherwise open twenty connections, and a failure in the middle of a
 * parallel batch is far harder to report than "three of twenty did not go, and here is why".
 * Large files and every film take the signed browser-to-storage path, because a route handler
 * cannot receive a body much over 4.5MB — `lib/admin/upload.ts` decides, not this screen.
 *
 * **The empty database.** The CMS migration has not been applied yet, so `GET /api/admin/media`
 * answers 503 `setup: pending`, and that is a state this screen renders as one plain line
 * rather than as a failure. Nothing spins forever and nothing claims the library is empty when
 * the truth is that the table is missing.
 */

const KINDS = [
  { value: '', label: 'Everything' },
  { value: 'IMAGE', label: 'Photographs' },
  { value: 'VIDEO', label: 'Films' },
] as const;

interface Progress {
  total: number;
  done: number;
  current: string;
  failures: string[];
}

export default function MediaPage() {
  const [kind, setKind] = useState<'' | 'IMAGE' | 'VIDEO'>('');
  const [tag, setTag] = useState('');
  const [query, setQuery] = useState('');
  const library = useAssetLibrary({ kind: kind || undefined, tag: tag || undefined });

  const [progress, setProgress] = useState<Progress | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const [open, setOpen] = useState<AdminAsset | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const say = (text: string, tone: 'ok' | 'error') => setToast({ text, tone });

  /** Every tag in the loaded page, so the filter offers what is actually there. */
  const tags = useMemo(
    () => [...new Set(library.assets.flatMap(asset => asset.tags))].sort(),
    [library.assets]
  );

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return library.assets;
    return library.assets.filter(asset =>
      [asset.alt, asset.url, ...asset.tags].join(' ').toLowerCase().includes(needle)
    );
  }, [library.assets, query]);

  const withoutAlt = library.assets.filter(
    asset => asset.kind === 'IMAGE' && asset.alt.trim() === ''
  ).length;

  async function upload(files: File[]) {
    if (files.length === 0) return;

    // Refused before anything is sent: a wrong type or an oversized file is the admin's
    // mistake to see at once, not a 400 four files later.
    const failures = files.map(describeRejection).filter((note): note is string => note !== null);
    const sendable = files.filter(file => describeRejection(file) === null);

    setProgress({ total: sendable.length, done: 0, current: '', failures });

    let added = 0;
    for (const file of sendable) {
      setProgress(current =>
        current ? { ...current, current: file.name } : current
      );
      const result = await uploadAsset(file, { tags: ['upload'] });
      if (result.ok) {
        library.prepend(result.asset);
        added += 1;
      } else {
        failures.push(result.message);
      }
      setProgress(current =>
        current ? { ...current, done: current.done + 1, failures: [...failures] } : current
      );
    }

    setProgress(null);

    if (added > 0) {
      say(
        added === 1
          ? 'One file was added to the library.'
          : `${added} files were added to the library.`,
        'ok'
      );
    }
    if (failures.length > 0) {
      say(
        failures.length === 1
          ? failures[0]
          : `${failures.length} files did not go up. ${failures[0]}`,
        'error'
      );
    }
  }

  return (
    <div className={SCREEN}>
      <ScreenHead
        title="Media"
        note="Upload once, use anywhere. A file that is still on the site cannot be deleted."
        actions={
          <label className={cn(ACTION, 'cursor-pointer')}>
            <input
              type="file"
              multiple
              accept="image/*,video/mp4,video/webm"
              className="sr-only"
              disabled={progress !== null}
              onChange={event => {
                upload([...(event.target.files ?? [])]);
                event.target.value = '';
              }}
            />
            <Upload size={15} strokeWidth={1.75} aria-hidden="true" />
            {progress ? 'Uploading' : 'Upload files'}
          </label>
        }
      />

      <div className={cn(CARD, 'mb-4 flex flex-wrap items-end gap-x-4 gap-y-3 px-3 py-3')}>
        <div className="min-w-0 max-w-[280px] flex-1 basis-[180px]">
          <label htmlFor="media-search" className={cn(LABEL, 'mb-1 block')}>
            Search
          </label>
          <TextInput
            id="media-search"
            type="search"
            value={query}
            placeholder="Alt text, tag or file name"
            onChange={event => setQuery(event.target.value)}
          />
        </div>

        <div className="w-[140px]">
          <label htmlFor="media-kind" className={cn(LABEL, 'mb-1 block')}>
            Kind
          </label>
          <SelectInput
            id="media-kind"
            value={kind}
            onChange={event => setKind(event.target.value as '' | 'IMAGE' | 'VIDEO')}
          >
            {KINDS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectInput>
        </div>

        {tags.length > 0 ? (
          <div className="w-[140px]">
            <label htmlFor="media-tag" className={cn(LABEL, 'mb-1 block')}>
              Tag
            </label>
            <SelectInput id="media-tag" value={tag} onChange={event => setTag(event.target.value)}>
              <option value="">Any</option>
              {tags.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </SelectInput>
          </div>
        ) : null}
      </div>

      {progress ? (
        <p
          role="status"
          className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-[13px] text-sky-900"
        >
          Uploading {progress.done + 1} of {progress.total}
          {progress.current ? ` — ${progress.current}` : ''}
        </p>
      ) : null}

      {library.notSetUp ? (
        <Notice label="Not set up yet">
          The media library table is not in this database yet, so there is nothing to list. Once
          the CMS migration has been applied, every photograph the site uses appears here.
        </Notice>
      ) : library.failure ? (
        <Notice label="Problem" tone="problem">
          {library.failure}
        </Notice>
      ) : (
        <div
          onDragEnter={event => {
            event.preventDefault();
            dragDepth.current += 1;
            setDragging(true);
          }}
          onDragOver={event => event.preventDefault()}
          onDragLeave={event => {
            event.preventDefault();
            // Counted rather than tested: dragging over a child fires `dragleave` on the
            // parent, and a naive handler would flicker the whole grid on every tile.
            dragDepth.current -= 1;
            if (dragDepth.current <= 0) setDragging(false);
          }}
          onDrop={event => {
            event.preventDefault();
            dragDepth.current = 0;
            setDragging(false);
            upload([...(event.dataTransfer?.files ?? [])]);
          }}
          className={cn(
            CARD,
            'p-4 transition-colors motion-reduce:transition-none',
            // The whole card is the drop target, and it says so while something is over it.
            // A dashed outline only while dragging: a permanent one reads as an empty state.
            dragging && 'border-dashed border-[var(--ds-accent-solid)] bg-[var(--ds-accent-wash)]'
          )}
        >
          <p className={cn(LABEL, 'mb-3 flex flex-wrap items-center gap-2')}>
            {dragging ? (
              'Drop the files here'
            ) : shown.length === 0 ? (
              ''
            ) : (
              <>
                <span>
                  {shown.length} file{shown.length === 1 ? '' : 's'}
                </span>
                {withoutAlt > 0 ? (
                  <span className={badge('warn')}>{withoutAlt} without alt text</span>
                ) : null}
                <span className={META}>drop files anywhere here to add more</span>
              </>
            )}
          </p>

          {shown.length === 0 ? (
            <p className="text-[13px] text-[var(--ds-faint)]">
              {library.loading
                ? 'Loading the library…'
                : query || kind || tag
                  ? 'Nothing matches that filter.'
                  : 'The library is empty. Drop files here, or use Upload files.'}
            </p>
          ) : (
            <ul
              className={cn(
                'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
                library.loading && 'opacity-50 transition-opacity motion-reduce:transition-none'
              )}
            >
              {shown.map(asset => (
                <li key={asset.id}>
                  <button
                    type="button"
                    onClick={() => setOpen(asset)}
                    className={cn(
                      'block w-full rounded-lg border border-[var(--ds-line)] bg-[var(--ds-surface)] p-2 text-left',
                      'transition-colors hover:border-[var(--ds-line-strong)] hover:bg-[var(--ds-surface-sunk)]',
                      FOCUS
                    )}
                  >
                    <Thumb url={asset.url} kind={asset.kind} large />
                    <span className="mt-2 block truncate text-[13px] font-medium text-[var(--ds-ink)]">
                      {asset.alt || fileName(asset.url)}
                    </span>
                    <span className={cn(META, 'mt-0.5 block truncate')}>
                      {usageLabel(library.usage[asset.id])}
                    </span>
                    <span className={cn(META, 'mt-1 flex flex-wrap items-center gap-1.5')}>
                      <span>
                        {asset.kind === 'VIDEO' ? 'Film · ' : ''}
                        {SIZE_LABEL(asset.bytes)}
                      </span>
                      {asset.kind === 'IMAGE' && asset.alt.trim() === '' ? (
                        <span className={badge('warn')}>no alt text</span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {library.nextCursor ? (
            <button
              type="button"
              disabled={library.loading}
              onClick={library.loadMore}
              className={cn(ACTION_SOFT, 'mt-4')}
            >
              {library.loading ? 'Loading' : 'Show more'}
            </button>
          ) : null}
        </div>
      )}

      {/* Keyed on the id so each file's sheet carries its own fields. */}
      {open ? (
        <AssetSheet
          key={open.id}
          asset={open}
          usage={library.usage[open.id]}
          onClose={() => setOpen(null)}
          onSaved={asset => {
            library.replace(asset);
            setOpen(asset);
          }}
          onDeleted={id => {
            library.remove(id);
            setOpen(null);
          }}
          onToast={say}
        />
      ) : null}

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
