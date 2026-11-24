'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FOCUS, LABEL, TITLE } from './styles';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [contenteditable="true"], [tabindex]:not([tabindex="-1"])';

/**
 * A right-hand slide-over: where every edit in the portal happens. A modal over the middle
 * of the screen hides the row you are editing; a sheet keeps the table beside it.
 *
 * It is rendered only while open, so nothing sits off-canvas widening the page and no hidden
 * control stays in the tab order. While open it takes focus, traps Tab inside itself, closes
 * on Escape or on the scrim, locks body scroll and restores both the scroll style and the
 * element that had focus when it opened. The behaviour is the one
 * `components/layout/navbar.tsx` already proves for the mobile menu.
 *
 * `onClose` is called for Escape, the close button and the scrim alike, so a caller that
 * must not lose work (an in-flight save) simply ignores the call.
 */
export default function Sheet({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  width = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Small uppercase line above the title, e.g. the section name. */
  eyebrow?: string;
  children: ReactNode;
  /** Pinned to the bottom edge, out of the scroll: the save and cancel actions. */
  footer?: ReactNode;
  /** `sm` for a confirmation, `md` for a form. */
  width?: 'sm' | 'md';
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  /**
   * `onClose` is almost always an inline arrow, so its identity changes on every parent
   * render. The effect below must not re-run when it does — it would take focus back from
   * whatever the admin was typing in — so the effect keys on `open` alone and reaches the
   * current handler through this ref.
   */
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const close = useCallback(() => onCloseRef.current(), []);

  useEffect(() => {
    if (!open) return;

    // Read before focus moves into the panel: whatever opened the sheet still has it, and
    // the cleanup below hands it back. Restoring on cleanup also covers an unmount.
    const returnTo = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        item => item.offsetParent !== null || item === document.activeElement
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (!panel.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      returnTo?.focus?.();
    };
  }, [open, close]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      {/* The scrim: slate rather than pure black, so the dimmed screen behind it still reads
          as the page it is and not as a photograph being lit. */}
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={close}
        className="absolute inset-0 cursor-default bg-slate-900/40"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative flex h-full w-full flex-col border-l border-slate-200 bg-white shadow-xl',
          'animate-in duration-200 slide-in-from-right motion-reduce:animate-none',
          width === 'sm' ? 'sm:w-[400px]' : 'sm:w-[560px]'
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-3.5">
          <div className="min-w-0">
            {eyebrow ? <p className={cn(LABEL, 'mb-0.5')}>{eyebrow}</p> : null}
            <h2 className={cn(TITLE, 'truncate')}>{title}</h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close panel"
            onClick={close}
            className={cn(
              '-mt-0.5 -mr-2 shrink-0 rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-ink',
              FOCUS
            )}
          >
            <X size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        <div className="ds-scroll min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>

        {/* The footer is a surface of its own: on a long form the save button is the thing you
            scroll looking for, and a white strip on white is nowhere. */}
        {footer ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
