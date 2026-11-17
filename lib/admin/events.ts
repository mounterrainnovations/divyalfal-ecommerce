'use client';

/**
 * The one cross-screen signal in the portal.
 *
 * The rail shows the unread enquiry count, and the Enquiries screen is what changes it. They
 * are in different parts of the tree with the route's `children` between them, so the count
 * would otherwise go stale the moment an enquiry was marked read — the number beside the rail
 * item contradicting the row the admin just changed.
 *
 * A browser event rather than a store: there is exactly one fact to share, in one direction,
 * and a state library (or lifting this into a context around the whole portal) would be more
 * machinery than the fact deserves. The rail also refetches on navigation, so this only has
 * to cover staying on the screen.
 */

export const ENQUIRIES_CHANGED = 'divyafal:enquiries-changed';

export function announceEnquiriesChanged(unread: number) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<number>(ENQUIRIES_CHANGED, { detail: unread }));
}
