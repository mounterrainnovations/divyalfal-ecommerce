'use client';

import { useEffect } from 'react';
import { CheckCircle2, TriangleAlert, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FOCUS } from './styles';

export interface ToastMessage {
  text: string;
  tone: 'ok' | 'error';
}

const DISMISS_AFTER = 6000;

/**
 * One message in the bottom-right corner: a white card, an icon, and the sentence. It replaces
 * the `alert()` calls the original dashboard used, which blocked the page and could not be
 * styled.
 *
 * WHERE IT SITS. Bottom-right rather than bottom-left: the sidebar owns the left edge at every
 * width, and a toast rising out of it looked like part of the navigation.
 *
 * An error is marked by a red icon *and* its own heading ("Problem"), so the difference is
 * never carried by colour alone. The region is a polite `role="status"`, so a screen reader
 * hears the result of a save without losing its place.
 *
 * It dismisses itself after six seconds, and can be dismissed sooner. An error stays: a failed
 * save is the one message that must not disappear before it is read.
 */
export default function Toast({
  message,
  onDismiss,
}: {
  message: ToastMessage | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!message || message.tone === 'error') return;
    const timer = setTimeout(onDismiss, DISMISS_AFTER);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  const failed = message?.tone === 'error';

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed right-0 bottom-0 z-[80] p-4"
    >
      {message ? (
        <div
          className={cn(
            'pointer-events-auto flex max-w-[min(90vw,420px)] items-start gap-3 rounded-lg border bg-[var(--ds-surface)] p-3',
            'shadow-[0_8px_24px_-8px_rgb(15_23_42/0.18)]',
            failed ? 'border-red-200' : 'border-[var(--ds-line)]',
            'animate-in duration-200 fade-in slide-in-from-bottom-2 motion-reduce:animate-none'
          )}
        >
          {failed ? (
            <TriangleAlert
              size={16}
              strokeWidth={1.75}
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-red-500"
            />
          ) : (
            <CheckCircle2
              size={16}
              strokeWidth={1.75}
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-emerald-600"
            />
          )}

          <div className="min-w-0 flex-1">
            <p
              className={cn(
                'text-[12px] leading-4 font-semibold',
                failed ? 'text-red-800' : 'text-[var(--ds-ink)]'
              )}
            >
              {failed ? 'Problem' : 'Done'}
            </p>
            <p className="mt-0.5 text-[13px] leading-5 text-[var(--ds-muted)]">{message.text}</p>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className={cn(
              '-mt-1 -mr-1 shrink-0 rounded-md p-1.5 text-[var(--ds-faint)] hover:bg-[var(--ds-surface-sunk)] hover:text-[var(--ds-ink)]',
              FOCUS
            )}
          >
            <X size={14} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
