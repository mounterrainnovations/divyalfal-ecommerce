import type { ReactNode } from 'react';
import { SUBTITLE, TITLE } from './styles';

/**
 * The head of every portal screen: the screen's name, one line of context, and whatever primary
 * action the screen owns on the right.
 *
 * WHAT CHANGED. It used to carry an `eyebrow` ("Portal") above a display-face title and a
 * gold hairline under both. The eyebrow is gone because the sidebar's highlighted row already
 * says where you are, and saying it twice on every screen is noise; the hairline is gone
 * because the content below is in cards, which draw their own edges. What is left is a 24px
 * heading, a sentence and the one button — which is the reference admin's header exactly, and
 * all a page header in a working tool has ever needed.
 *
 * `actions` is a flex row, so a screen with two controls (a filter and a save) gets them laid
 * out without inventing its own toolbar.
 */
export default function ScreenHead({
  title,
  note,
  actions,
}: {
  title: string;
  /** One line of context under the title; kept to a line on purpose. */
  note?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className={TITLE}>{title}</h1>
        {note ? <p className={`mt-1 max-w-[68ch] ${SUBTITLE}`}>{note}</p> : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
