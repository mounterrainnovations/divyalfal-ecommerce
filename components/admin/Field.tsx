'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { FOCUS, INPUT, LABEL, SELECT } from './styles';

/**
 * A labelled field: 11px uppercase label, the control, then its error or hint. The control
 * is a rule, not a box — the storefront's form language at portal density.
 *
 * The error is wired with `aria-describedby`/`aria-invalid` by the caller passing the same
 * `id`; `Field` renders the message with that id so the wiring is one line at each use.
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
      <label htmlFor={id} className={cn(LABEL, 'mb-1 block')}>
        {label}
        {required ? <span className="text-sale"> *</span> : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1 font-ui text-eyebrow uppercase text-sale">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 font-ui text-eyebrow text-ink-soft">
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
      className={cn(INPUT, invalid && 'border-sale', className)}
      {...rest}
    />
  );
}

/** A native select, on the same rule as an input. Native, so a phone gets its own picker. */
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
 * A checkbox and its label on one line. The box is a square outline that fills with ink when
 * checked — no radius, no accent colour, and the state is a mark rather than a hue.
 */
export function CheckboxField({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
        className={cn(
          'h-3.5 w-3.5 shrink-0 appearance-none rounded-none border border-ink bg-transparent',
          'checked:bg-ink',
          FOCUS
        )}
      />
      <label htmlFor={id} className={cn(LABEL, 'cursor-pointer')}>
        {label}
      </label>
    </div>
  );
}
