'use client';

import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { FOCUS, LABEL, RULE } from './styles';

export interface ToastMessage {
  text: string;
  tone: 'ok' | 'error';
}

const DISMISS_AFTER = 6000;

/**
 * One message at the bottom-left corner: paper, a hairline, 11px uppercase. It replaces the
 * `alert()` calls the old dashboard used, which blocked the page and could not be styled.
 *
 * An error is marked by the `--accent-sale` token *and* by its own word ("Problem"), so the
 * difference is never carried by colour alone. The region is `role="status"` with a polite
 * live region, so a screen reader hears the result of a save without losing its place.
 *
 * It dismisses itself after six seconds, and can be dismissed sooner. An error stays: a
 * failed save is the one message that must not disappear before it is read.
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

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-0 left-0 z-[80] p-[var(--gutter)]"
    >
      {message ? (
        <div
          className={cn(
            'pointer-events-auto flex max-w-[min(90vw,420px)] items-start gap-4 border bg-paper px-4 py-3',
            RULE,
            'animate-in duration-200 fade-in motion-reduce:animate-none'
          )}
        >
          <p className="font-ui text-caption text-ink">
            <span className={cn(LABEL, 'mr-2', message.tone === 'error' && 'text-sale')}>
              {message.tone === 'error' ? 'Problem' : 'Done'}
            </span>
            {message.text}
          </p>
          <button
            type="button"
            onClick={onDismiss}
            className={cn(LABEL, FOCUS, 'shrink-0 pt-0.5 hover:text-ink')}
          >
            Dismiss
          </button>
        </div>
      ) : null}
    </div>
  );
}
