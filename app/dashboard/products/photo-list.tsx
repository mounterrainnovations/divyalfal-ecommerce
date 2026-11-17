'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { GripVertical } from 'lucide-react';
import { ACTION_GRAVE, ACTION_QUIET, FOCUS, INPUT, LABEL, RULE } from '@/components/admin/styles';
import { cn } from '@/lib/utils';

/**
 * The photographs of one product, in the order the shop shows them — the first is the
 * thumbnail everywhere, which is why order is editable at all.
 *
 * Reorder works two ways, and both are first-class: drag a row by its handle, or use the
 * row's Up/Down buttons. The buttons are not a fallback — drag-and-drop is unusable with a
 * keyboard and awkward on a touch screen, so the same operation exists as a control that
 * takes focus and announces what it does.
 *
 * Each row is a file picker and a URL field over the same slot. The picker posts to
 * `/api/upload` and writes the returned public URL into the field, so a photograph can come
 * from the disk or from an address already in storage.
 */
export default function PhotoList({
  photos,
  onChange,
  onError,
  disabled,
}: {
  photos: string[];
  onChange: (photos: string[]) => void;
  /** An upload failure: reported upwards so it lands in the screen's toast. */
  onError: (message: string) => void;
  disabled?: boolean;
}) {
  const [uploading, setUploading] = useState<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const dragFrom = useRef<number | null>(null);

  function move(from: number, to: number) {
    if (to < 0 || to >= photos.length || from === to) return;
    const next = [...photos];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }

  function set(index: number, value: string) {
    onChange(photos.map((photo, i) => (i === index ? value : photo)));
  }

  async function upload(file: File, index: number) {
    setUploading(index);
    try {
      const body = new FormData();
      body.append('file', file);
      const response = await fetch('/api/upload', { method: 'POST', body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        onError(data.error || 'The photograph could not be uploaded.');
        return;
      }
      set(index, data.url);
    } catch {
      onError('The upload request could not be sent.');
    } finally {
      setUploading(null);
    }
  }

  return (
    <div>
      <p className={cn(LABEL, 'mb-1')}>
        Photographs<span className="text-sale"> *</span>
      </p>
      <p className="mb-2 font-ui text-eyebrow text-ink-soft">
        The first is the thumbnail. Drag the handle, or use Up and Down.
      </p>

      <ul className={cn('border-t', RULE)}>
        {photos.map((photo, index) => (
          <li
            key={index}
            draggable={!disabled}
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
            className={cn('border-b py-2.5', RULE, dragging === index && 'bg-paper-deep')}
          >
            <div className="flex items-center gap-2.5">
              <GripVertical
                size={14}
                strokeWidth={1.5}
                aria-hidden="true"
                className="shrink-0 cursor-grab text-ink-soft"
              />
              <span className={cn(LABEL, 'w-4 shrink-0 tabular-nums')}>{index + 1}</span>

              {photo ? (
                <Image
                  src={photo}
                  alt=""
                  width={36}
                  height={36}
                  unoptimized
                  className="h-9 w-9 shrink-0 object-cover"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className={cn('h-9 w-9 shrink-0 border bg-paper-deep', RULE)}
                />
              )}

              <input
                type="url"
                aria-label={`Photograph ${index + 1} address`}
                value={photo}
                disabled={disabled || uploading === index}
                onChange={event => set(index, event.target.value)}
                placeholder="https://…"
                className={cn(INPUT, 'min-w-0 flex-1')}
              />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 pl-[26px]">
              <button
                type="button"
                disabled={disabled || index === 0}
                onClick={() => move(index, index - 1)}
                aria-label={`Move photograph ${index + 1} up`}
                className={ACTION_QUIET}
              >
                Up
              </button>
              <button
                type="button"
                disabled={disabled || index === photos.length - 1}
                onClick={() => move(index, index + 1)}
                aria-label={`Move photograph ${index + 1} down`}
                className={ACTION_QUIET}
              >
                Down
              </button>

              <label className={cn(ACTION_QUIET, 'cursor-pointer')}>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={disabled || uploading === index}
                  onChange={event => {
                    const file = event.target.files?.[0];
                    if (file) upload(file, index);
                    event.target.value = '';
                  }}
                />
                {uploading === index ? 'Uploading' : 'Upload file'}
              </label>

              {photos.length > 1 ? (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(photos.filter((_, i) => i !== index))}
                  aria-label={`Remove photograph ${index + 1}`}
                  className={ACTION_GRAVE}
                >
                  Remove
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange([...photos, ''])}
        className={cn(ACTION_QUIET, FOCUS, 'mt-3')}
      >
        Add another photograph
      </button>
    </div>
  );
}
