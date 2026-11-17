'use client';

import AssetPicker from '@/components/admin/AssetPicker';
import SpecEditor from '@/components/admin/SpecEditor';
import { TextInput } from '@/components/admin/Field';
import { ACTION_QUIET, INPUT, LABEL, RULE } from '@/components/admin/styles';
import { cn } from '@/lib/utils';

/** The seven kinds a `ContentBlock` can be. The editor is chosen by this and nothing else. */
export type BlockKind = 'TEXT' | 'RICH_TEXT' | 'IMAGE' | 'IMAGE_LIST' | 'VIDEO' | 'NUMBER' | 'LINK';

export interface Block {
  key: string;
  page: string;
  section: string;
  label: string;
  kind: BlockKind;
  draft: unknown;
  published: unknown;
  updatedAt: string;
}

/** Idle, in flight, written, or refused — the autosave's state for one block. */
export type SaveState = { state: 'idle' | 'saving' | 'saved' } | { state: 'error'; message: string };

/** A list block's value is an array; everything else is one string or number. */
export const asList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

export const asText = (value: unknown): string =>
  typeof value === 'string' ? value : typeof value === 'number' ? String(value) : '';

/**
 * Whether the draft and the published value differ — the one test behind the "unpublished
 * changes" badge.
 *
 * Compared as JSON rather than by identity: these are `Json` columns, so a list's value is a
 * new array on every read and `!==` would mark every block on the page as changed. A block
 * that has never been published (`published` is null, which the API sends as `null`) counts as
 * changed, because its words are not on the site yet — and the badge says which of the two it
 * is, since "never published" and "edited since publishing" need different actions.
 */
export function differs(draft: unknown, published: unknown): boolean {
  return JSON.stringify(draft ?? null) !== JSON.stringify(published ?? null);
}

/** The last segment of the key — the field's own name, without its page and section. */
export function fieldName(block: Block): string {
  const parts = block.label.split(' / ');
  return parts[parts.length - 1] || block.key;
}

/**
 * One block, labelled, with the editor its kind calls for.
 *
 * Every edit writes `draft` only — autosaved by the screen, debounced — so nothing typed here
 * reaches the storefront until Publish is pressed. That is the whole point of the pair of
 * columns, and it is why this component has no save button: a save that happens by itself and
 * a publish that never does is the honest arrangement for a shop someone else owns.
 *
 * `TEXT` gets a textarea once its value is long or has a line break in it, and a single-line
 * field otherwise. A product name and a 400-word atelier paragraph are both TEXT, and one
 * field shape cannot serve both.
 */
export default function BlockEditor({
  block,
  value,
  onChange,
  save,
  onPublish,
  publishing,
}: {
  block: Block;
  value: unknown;
  onChange: (value: unknown) => void;
  save: SaveState;
  onPublish: () => void;
  publishing: boolean;
}) {
  const unpublished = differs(value, block.published);
  const neverPublished = block.published === null || block.published === undefined;
  const id = `block-${block.key.replace(/[^a-zA-Z0-9]/g, '-')}`;

  return (
    <div className={cn('border-b py-3', RULE)}>
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <label htmlFor={id} className={cn(LABEL, 'text-ink')}>
          {fieldName(block)}
        </label>

        <div className="flex shrink-0 items-center gap-4">
          <span className={cn(LABEL, 'tabular-nums')}>
            {save.state === 'saving'
              ? 'Saving'
              : save.state === 'error'
                ? <span className="text-sale">Not saved</span>
                : save.state === 'saved'
                  ? 'Saved'
                  : ''}
          </span>

          {unpublished ? (
            <span className={cn(LABEL, 'border-b border-gold pb-px text-ink')}>
              {neverPublished ? 'Not published yet' : 'Unpublished changes'}
            </span>
          ) : null}

          <button
            type="button"
            disabled={publishing || !unpublished}
            onClick={onPublish}
            className={ACTION_QUIET}
          >
            {publishing ? 'Publishing' : 'Publish'}
          </button>
        </div>
      </div>

      {save.state === 'error' ? (
        <p className="mb-1.5 font-ui text-eyebrow uppercase text-sale">{save.message}</p>
      ) : null}

      <Editor id={id} block={block} value={value} onChange={onChange} />

      <p className="mt-1 font-ui text-eyebrow text-ink-soft">{block.key}</p>
    </div>
  );
}

function Editor({
  id,
  block,
  value,
  onChange,
}: {
  id: string;
  block: Block;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  switch (block.kind) {
    case 'NUMBER':
      return (
        <TextInput
          id={id}
          type="number"
          inputMode="decimal"
          value={asText(value)}
          className="max-w-[160px]"
          onChange={event => {
            const raw = event.target.value;
            // An empty field is not zero. It stays a string until it is a number again, so a
            // half-typed "-" or "" does not autosave 0 over the real figure.
            onChange(raw === '' ? '' : Number.isNaN(Number(raw)) ? raw : Number(raw));
          }}
        />
      );

    case 'LINK':
      return (
        <TextInput
          id={id}
          type="text"
          value={asText(value)}
          placeholder="/products or https://…"
          onChange={event => onChange(event.target.value)}
        />
      );

    case 'IMAGE':
    case 'VIDEO':
      return (
        <AssetPicker
          kind={block.kind === 'VIDEO' ? 'VIDEO' : 'IMAGE'}
          value={asText(value) ? [asText(value)] : []}
          onChange={urls => onChange(urls[0] ?? '')}
        />
      );

    case 'IMAGE_LIST':
      return <AssetPicker kind="IMAGE" multiple value={asList(value)} onChange={onChange} />;

    case 'RICH_TEXT':
      return (
        <SpecEditor
          value={asText(value)}
          onChange={html => onChange(html)}
          placeholder="Write the copy for this block…"
        />
      );

    case 'TEXT':
    default: {
      const text = asText(value);
      const long = text.length > 70 || text.includes('\n');
      return long ? (
        <textarea
          id={id}
          rows={Math.min(10, Math.max(2, Math.ceil(text.length / 70) + text.split('\n').length))}
          value={text}
          onChange={event => onChange(event.target.value)}
          className={cn(INPUT, 'resize-y leading-relaxed')}
        />
      ) : (
        <TextInput id={id} type="text" value={text} onChange={event => onChange(event.target.value)} />
      );
    }
  }
}
