import { siteCopy } from '@/lib/content/site-copy';

/**
 * Where the two forms send what a visitor types, until there is somewhere to post it.
 *
 * **This is an interim hand-over, and Phase 2 Task 8 replaces it with a real enquiry
 * endpoint** (`POST /api/enquiries`, spec §11, writing an `Enquiry` row the admin portal's
 * seventh rail section reads). When that exists, both forms post there and this module goes.
 *
 * The state it replaces was worse than interim: `app/virasat-academy/page.tsx` submitted with
 * `preventDefault()` and nothing else, and `contact-form.tsx` with `preventDefault()` plus a
 * `TODO`. A visitor filled in eight fields, including a date of birth, pressed Submit, and
 * every answer was discarded without a word. The owner's decision, taken explicitly: Submit
 * opens WhatsApp with the answers pre-filled, on the number the footer already prints.
 *
 * Three rules the decision came with:
 *
 *  1. **No new prose.** The message is the stored field labels and the visitor's own values,
 *     nothing else. No greeting, no "I would like to enquire", no sign-off — the boutique does
 *     not get words put in a customer's mouth, and `siteCopy` is the only place storefront
 *     words live. The `: ` between a label and a value and the newline between lines are
 *     punctuation, not copy.
 *  2. **Nothing may claim success.** Opening WhatsApp is not an enquiry arriving: the visitor
 *     may never press send, and the page cannot know. So neither form prints a confirmation
 *     and neither has an `aria-live` region to announce one.
 *  3. **Validation still gates it.** The browser's own constraint validation blocks a real
 *     submit before `onSubmit` runs; `handoverEnquiry` re-checks, so a programmatic submit
 *     cannot hand over a half-finished enquiry either.
 */

/** The boutique's WhatsApp number, from the same contact details the footer prints. */
const WHATSAPP_NUMBER = siteCopy.footer.contact.phone.replace(/\D/g, '');

/**
 * A stored label without its trailing required marker. `siteCopy.contact.form` spells one
 * label `'Email *'`; the asterisk is how the form marks the field on screen, not part of what
 * the field is called.
 */
export const bareLabel = (label: string): string => label.replace(/\s*\*$/, '');

export interface EnquiryAnswer {
  /** The field's stored label, straight from `siteCopy`. */
  label: string;
  /** What the visitor typed or chose, as they would read it back. */
  value: string;
}

/**
 * The `wa.me` link for a set of answers. Unanswered fields are left out rather than sent as
 * empty lines — an optional field nobody filled in is not information.
 *
 * `encodeURIComponent` rather than `URLSearchParams`: the latter encodes a space as `+`, and
 * every phone number here starts with one, so `+91…` would arrive as ` 91…`.
 */
export function enquiryHref(answers: EnquiryAnswer[]): string {
  const message = answers
    .filter(answer => answer.value.trim() !== '')
    .map(answer => `${bareLabel(answer.label)}: ${answer.value.trim()}`)
    .join('\n');

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

/**
 * Opens a link in a new tab by clicking a real anchor rather than calling `window.open`.
 *
 * `window.open(url, '_blank', 'noopener')` returns `null` by specification even when it
 * succeeds, so there is no way to tell a blocked popup from a working one and no honest
 * fallback to write. A link click inside a submit gesture is also not the thing popup blockers
 * block. The anchor is removed immediately; nothing is left in the document.
 *
 * A new tab rather than a navigation, so the filled-in form stays exactly as the visitor left
 * it: if WhatsApp is not where they want to finish, nothing of theirs has been lost.
 */
function openInNewTab(href: string): void {
  const link = document.createElement('a');
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.style.display = 'none';
  document.body.append(link);
  link.click();
  link.remove();
}

/**
 * The submit handler both forms share: stop the navigation, re-check validity, hand the
 * answers over.
 *
 * `preventDefault` is the one thing that must always happen. A form with no `action` otherwise
 * navigates on submit and writes every answer — the date of birth and the phone number
 * included — into the URL and the browser history.
 */
export function handoverEnquiry(event: React.FormEvent<HTMLFormElement>, answers: EnquiryAnswer[]): void {
  event.preventDefault();

  const form = event.currentTarget;
  // The browser has already enforced this on a real submit and reported which field is
  // missing; this is the same check made explicit so nothing can route around it.
  if (typeof form.reportValidity === 'function' && !form.reportValidity()) return;

  openInNewTab(enquiryHref(answers));
}
