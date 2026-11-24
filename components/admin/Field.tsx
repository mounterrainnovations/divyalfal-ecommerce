'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { FOCUS, INPUT, LABEL, META, SELECT } from './styles';

/**
 * A labelled field: a 12px label, the control, then its error or its hint.
 *
 * WHAT CHANGED. The label was 11px uppercase at 0.18em and the control was a bare underline.
 * Both are now ordinary: a sentence-case label and a real bordered input. A form is read, not
 * admired, and an admin filling in eleven settings should be able to see where each box is.
 *
 * The error is wired with `aria-describedby`/`aria-invalid` by the caller passing the same
 * `id`; `Field` renders the message with that id, so the wiring is one line at each use. The
 * message carries a red dot *and* red type *and* the words, so it is never colour alone.
 */
export default function Field({
  id,
  label,
  error,
  hint,
  required,
  children,
  className,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <label htmlFor={id} className={cn(LABEL, 'mb-1.5 block')}>
        {label}
        {required ? (
          <span className="text-red-600" title="Required">
            {' '}
            *
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-[11px] leading-4 font-medium text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className={cn(META, 'mt-1.5')}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** The portal's text input. `type` covers text, url, number and password alike. */
export function TextInput({
  id,
  invalid,
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { id: string; invalid?: boolean }) {
  return (
    <input
      id={id}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid ? `${id}-error` : undefined}
      className={cn(INPUT, className)}
      {...rest}
    />
  );
}

/** A native select, on the same box as an input. Native, so a phone gets its own picker. */
export function SelectInput({
  id,
  className,
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { id: string }) {
  return (
    <select id={id} className={cn(SELECT, className)} {...rest}>
      {children}
    </select>
  );
}

/**
 * A checkbox and its label on one line.
 *
 * The box is drawn rather than left native: a native checkbox is 13px and a different shape on
 * every platform, which in a dense form reads as a rendering fault. This one is a 16px rounded
 * square that fills with ink and shows a white tick (an inline SVG as the mask, so there is no
 * icon import and nothing to load). The whole control is one `<input>` with a real `<label>`,
 * so clicking the words still toggles it and a screen reader still announces a checkbox.
 */
export function CheckboxField({
  id,
  label,
  checked,
  onChange,
  disabled,
  hint,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={event => onChange(event.target.checked)}
        className={cn(
          // `ds-check` is what draws the tick; see `dashboard.css`. The mark is a background
          // image in real CSS rather than a Tailwind arbitrary value, because a `data:` URI
          // inside a class name is a parser hazard (slashes read as opacity modifiers).
          'ds-check mt-px h-4 w-4 shrink-0 appearance-none rounded border border-slate-300 bg-white',
          'checked:border-ink checked:bg-ink',
          'hover:border-slate-400 checked:hover:border-ink-soft checked:hover:bg-ink-soft',
          'disabled:cursor-not-allowed disabled:bg-slate-100',
          FOCUS
        )}
      />
      <span className="min-w-0">
        <label htmlFor={id} className={cn(LABEL, 'cursor-pointer select-none')}>
          {label}
        </label>
        {hint ? <span className={cn(META, 'mt-0.5 block')}>{hint}</span> : null}
      </span>
    </div>
  );
}
