/**
 * The admin portal's type and density, as one file so no screen invents its own.
 *
 * The portal is the same house as the storefront — bone paper, near-black ink, one gold
 * hairline, Fraunces against Jost — set at working-tool density rather than editorial
 * pacing. Everything here composes the Phase 1 tokens in `app/globals.css`; nothing new is
 * invented, and none of the banned vocabulary (pill/oversized radius, gradients, grey-scale
 * utilities, shadows, slash-opacity on type) appears in any admin file.
 *
 * Two deliberate departures from the storefront, both documented rather than silent:
 *
 *  1. SIZE. The type scale jumps from the 11px eyebrow to the 28px display-3, with nothing
 *     between. A dense table needs a heading around 20-22px, so `TITLE` sets an arbitrary
 *     size — exactly as `components/layout/navbar.tsx` does for the wordmark, and for the
 *     same reason. It is written once, here.
 *
 *  2. HAIRLINES. The storefront's rules are `border-gold` (an accent) or `border-ink`
 *     (a field underline). A table with a rule under every row needs something quieter than
 *     either, so structural rules are ink at 10-12% — the same ink token the page is set in,
 *     the same shape as the storefront's `bg-ink/35` scrim. Gold stays what it is on the
 *     storefront: one accent, on the current rail item and under a section heading.
 */

/** Ink at a whisper: every structural rule in the portal. Never a box, always a line. */
export const RULE = 'border-ink/12';

/** 13px Jost, the portal's body size. `text-caption` is exactly that token. */
export const BODY = 'font-ui text-caption text-ink';

/** 11px Jost, uppercase, 0.18em — column heads, field labels, rail items, metric labels. */
export const LABEL = 'font-ui text-eyebrow uppercase text-ink-soft';

/** Fraunces, light, at working size. See note 1 above. */
export const TITLE = 'font-display text-[20px] font-light leading-tight text-ink md:text-[22px]';

/** A figure on the Overview screen: Fraunces at the one step above the title. */
export const FIGURE = 'font-display text-[30px] font-light leading-none text-ink';

/** Keyboard focus, everywhere in the portal: a 2px ink ring, never colour alone. */
export const FOCUS =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink';

/**
 * A field: a label above a rule, no box and no radius — the storefront's
 * `components/features/forms/field-styles.ts`, at 13px with a 28px row instead of 17px
 * with a 48px one.
 */
export const INPUT =
  'block w-full rounded-none border-0 border-b border-ink bg-transparent px-0 py-1.5 ' +
  'font-ui text-caption text-ink placeholder:text-ink-soft ' +
  'disabled:text-ink-soft ' +
  FOCUS;

/** A select is a field with the same rule under it, plus room for the native arrow. */
export const SELECT =
  'block w-full rounded-none border-0 border-b border-ink bg-transparent py-1.5 pr-6 pl-0 ' +
  'font-ui text-caption text-ink ' +
  FOCUS;

/**
 * An action: text above a rule that darkens, never a pill and never a fill — the storefront
 * `Button`, shrunk. `ACTION` is the ordinary one, `ACTION_QUIET` a secondary, `ACTION_GRAVE`
 * the destructive one (the `--accent-sale` token, the only other colour the system has).
 */
const ACTION_BASE =
  'inline-flex items-center gap-1.5 border-b pb-0.5 font-ui text-eyebrow uppercase ' +
  'transition-colors duration-200 motion-reduce:transition-none ' +
  'disabled:pointer-events-none disabled:opacity-50 ' +
  FOCUS;

export const ACTION = `${ACTION_BASE} border-gold text-ink hover:border-ink`;
export const ACTION_QUIET = `${ACTION_BASE} border-transparent text-ink-soft hover:border-gold hover:text-ink`;
export const ACTION_GRAVE = `${ACTION_BASE} border-transparent text-sale hover:border-sale`;

/** A row in a dense table or list: 36px, the portal's rhythm. */
export const ROW = 'h-9';
