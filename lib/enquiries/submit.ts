/**
 * The client side of `POST /api/enquiries`.
 *
 * Both public forms keep WhatsApp as their visible action — that is the owner's decision and it
 * is unchanged. What this adds is a copy of the same answers to the database, so an enquiry is
 * no longer lost when the visitor closes the WhatsApp tab without pressing send. The post is
 * deliberately **invisible and non-blocking**:
 *
 *  - it never throws, so a failed POST cannot stop the hand-over;
 *  - it prints nothing, because opening WhatsApp is still not an enquiry arriving and a
 *    confirmation here would be the same lie the forms were careful not to tell;
 *  - it runs after `handoverEnquiry`, so the new tab opens inside the submit gesture where no
 *    popup blocker touches it.
 *
 * This module lives under `lib/` rather than beside the forms because it is a data layer: the
 * forms hand it answers and read nothing back.
 */

export const ENQUIRY_ENDPOINT = '/api/enquiries';

export type EnquirySourceName = 'contact' | 'academy';

export interface Answer {
  /** The field's stored label, straight from `siteCopy`. */
  label: string;
  /** What the visitor typed or chose. */
  value: string;
}

/**
 * A stored label without its trailing required marker — the same rule as `bareLabel` in
 * `components/features/forms/whatsapp-enquiry.ts`, which spells one label `'Email *'`.
 */
const strip = (label: string) => label.replace(/\s*\*$/, '');

/**
 * The answers as the admin will read them: `Label: value`, one per line, unanswered fields left
 * out. No new prose — the stored labels and the visitor's own words, exactly as the WhatsApp
 * hand-over composes them. The `: ` and the newline are punctuation, not copy.
 */
export function transcript(answers: Answer[]): string {
  return answers
    .filter(answer => answer.value.trim() !== '')
    .map(answer => `${strip(answer.label)}: ${answer.value.trim()}`)
    .join('\n');
}

export interface EnquiryPost {
  name: string;
  email?: string;
  phone?: string;
  message: string;
  source: EnquirySourceName;
}

/**
 * Send one enquiry. Fire and forget: the returned promise always resolves, and a failure is
 * logged to the console and nowhere the visitor can see.
 */
export async function postEnquiry(input: EnquiryPost): Promise<boolean> {
  try {
    const response = await fetch(ENQUIRY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      // The visitor may navigate to the WhatsApp tab immediately; keepalive lets the request
      // finish regardless.
      keepalive: true,
    });
    if (!response.ok) {
      console.error(`[enquiries] POST ${ENQUIRY_ENDPOINT} answered ${response.status}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`[enquiries] POST ${ENQUIRY_ENDPOINT} could not be made`, error);
    return false;
  }
}
