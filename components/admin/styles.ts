/**
 * The admin portal's design tokens, in one file so no screen invents its own.
 *
 * WHY THIS FILE WAS REWRITTEN. The portal used to be set in the storefront's "atelier"
 * language: bone paper, Fraunces headings, 11px uppercase labels at 0.18em, hairline rules and
 * no boxes anywhere. The storefront has since been reverted to the conventional shop, and the
 * owner's instruction for the portal was explicit — "make it a professional dashboard, like a
 * professional SaaS dashboard". So the portal is no longer a quiet cousin of the shop; it is a
 * working tool, and it is meant to read like Linear, Stripe or the Shopify admin.
 *
 * THE PALETTE IS NEUTRAL, WITH ONE ACCENT.
 *  - Structure is slate: `slate-50` for the page ground and table heads, `slate-200` for every
 *    border, `slate-500/600` for secondary type. Tailwind's own scale, so there is nothing to
 *    maintain and nothing to keep in step with `app/globals.css` (which the portal may not
 *    edit — see `components/admin/dashboard.css` for the rules that needed real CSS).
 *  - Primary type and the primary button are `--ink` (#141210), the brand's near-black. It is
 *    warm where slate is cool, which is the only trace of the brand in the chrome and the
 *    reason the portal does not read as a bootstrapped template.
 *  - `--gold` is the single accent, with three jobs: the current item in the sidebar, a mark
 *    on something that needs attention, and the "accent" badge. It is never type on a fill and
 *    never a border on an input, because gold reaches only ~3.2:1 against white — enough for a
 *    non-text indicator (WCAG 1.4.11) and not enough for text.
 *
 * WHY NO `bg-paper`. The warm paper ground is the shop's signature. A dashboard on it reads as
 * a page of the shop; on `slate-50` with white cards it reads as a tool. That single swap is
 * most of the difference between the old portal and this one.
 *
 * WHY THE TYPE SIZES ARE ARBITRARY VALUES. The global type scale is editorial — it jumps from
 * an 11px eyebrow to a 28px display — and a dense tool needs 11/12/13/17/26. Rather than add
 * five tokens to a scale the storefront owns, the five sizes are written here, once, and
 * nothing else in the portal states a size.
 *
 * The UI typeface is set on the shell in `dashboard.css`, not here: it is one declaration for
 * the whole portal and no component should be able to opt out of it.
 */

/** Every border in the portal. One value, so nothing drifts a shade. */
export const RULE = 'border-slate-200';

/* ---------------------------------------------------------------------------------------- */
/* Surfaces                                                                                  */
/* ---------------------------------------------------------------------------------------- */

/**
 * A card: white, a hairline border, a small radius and the faintest possible drop. The shadow
 * is a single 1px line of 4% ink rather than a blur — enough to lift the card off the slate
 * ground, not enough to read as a floating object.
 */
export const CARD =
  'rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_0_rgb(15_23_42/0.04)]';

/** A card's header strip: what it holds on the left, the card's own action on the right. */
export const CARD_HEAD =
  'flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-slate-200 px-4 py-3';

/** A card's contents. Tables set their own padding per cell, so they skip this. */
export const CARD_BODY = 'px-4 py-4';

/** The old name for a bordered surface, kept so the sign-in screen still reads plainly. */
export const PANEL = CARD;

/* ---------------------------------------------------------------------------------------- */
/* Type                                                                                      */
/* ---------------------------------------------------------------------------------------- */

/** 13px: the portal's body size, and every table cell. */
export const BODY = 'text-[13px] leading-5 text-slate-700';

/** 12px medium slate: field labels, meta lines, counts — the things beside the things. */
export const LABEL = 'text-[12px] leading-4 font-medium text-slate-600';

/** 11px slate: helper text, hints, the second line under a row. */
export const META = 'text-[11px] leading-4 text-slate-500';

/** A screen's `<h1>`. 17px semibold — a heading, not a display line. */
export const TITLE = 'text-[17px] leading-6 font-semibold tracking-[-0.01em] text-ink';

/** One line of context under a screen title. */
export const SUBTITLE = 'text-[13px] leading-5 text-slate-500';

/** A card's or a form group's heading. */
export const SECTION_TITLE = 'text-[13px] leading-5 font-semibold text-ink';

/** The number on a stat card. Tabular, so a row of them does not jitter. */
export const FIGURE =
  'text-[26px] leading-none font-semibold tracking-[-0.02em] tabular-nums text-ink';

/* ---------------------------------------------------------------------------------------- */
/* Focus                                                                                     */
/* ---------------------------------------------------------------------------------------- */

/**
 * Keyboard focus, everywhere: a 2px ink outline, offset so it clears the control's own border.
 *
 * Ink rather than the accent on purpose — gold passes the 3:1 indicator threshold against
 * white by a hair and fails it against the slate heads and hover fills that controls also sit
 * on. Ink is 17:1 against all of them, so one rule is correct in every place.
 */
export const FOCUS =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink';

/* ---------------------------------------------------------------------------------------- */
/* Controls                                                                                  */
/* ---------------------------------------------------------------------------------------- */

/**
 * A text input: a real bordered box, with a visible hover and a visible invalid state. The
 * portal's inputs used to be bare underlines, which on a dense form made it hard to see where
 * a field began or ended — the most conspicuous thing wrong with the old look.
 *
 * `aria-invalid:` is what colours the border red, so the error state is driven by the same
 * attribute a screen reader announces and cannot be set by eye alone.
 */
export const INPUT =
  'block w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[13px] text-ink ' +
  'placeholder:text-slate-400 hover:border-slate-400 ' +
  'aria-invalid:border-red-500 aria-invalid:hover:border-red-500 ' +
  'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ' +
  FOCUS;

/** A native select on the same box, with room on the right for the platform's own arrow. */
export const SELECT =
  'block w-full rounded-md border border-slate-300 bg-white py-1.5 pr-8 pl-2.5 text-[13px] text-ink ' +
  'hover:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ' +
  FOCUS;

const ACTION_BASE =
  'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md text-[13px] font-medium ' +
  'whitespace-nowrap transition-colors duration-150 motion-reduce:transition-none ' +
  'disabled:pointer-events-none disabled:opacity-50 ' +
  FOCUS;

/*
 * Five weights of action, and the hierarchy is the point: a screen has at most one `ACTION`,
 * and a destructive control never wears the same clothes as the default one.
 */

/** Primary: the one thing this screen is for. Ink fill, white type. */
export const ACTION =
  `${ACTION_BASE} h-8 border border-ink bg-ink px-3 text-white hover:border-ink-soft hover:bg-ink-soft`;

/** Secondary: a bordered white button — cancel, paging, "show more", toolbar extras. */
export const ACTION_SOFT =
  `${ACTION_BASE} h-8 border border-slate-300 bg-white px-3 text-slate-700 hover:bg-slate-50 hover:text-ink`;

/** Tertiary: borderless, for inside a table row where borders would be noise. */
export const ACTION_QUIET = `${ACTION_BASE} h-7 px-2 text-slate-600 hover:bg-slate-100 hover:text-ink`;

/** Destructive, quiet: the delete that opens a confirmation. Red type, no fill until hover. */
export const ACTION_GRAVE = `${ACTION_BASE} h-7 px-2 text-red-600 hover:bg-red-50`;

/** Destructive, committed: the button inside the confirmation that actually deletes. */
export const ACTION_DANGER =
  `${ACTION_BASE} h-8 border border-red-600 bg-red-600 px-3 text-white hover:border-red-700 hover:bg-red-700`;

/* ---------------------------------------------------------------------------------------- */
/* Tables                                                                                    */
/* ---------------------------------------------------------------------------------------- */

/** A body row: 44px, which is readable without turning a table into a list of cards. */
export const ROW = 'h-11';

/**
 * A column head. Sticky, so scrolling a long table keeps the heads in view — the one thing a
 * table of two hundred rows needed that the old one did not have. `bg-slate-50` is opaque on
 * purpose: a translucent head lets rows show through as they pass under it.
 */
export const TABLE_HEAD =
  'sticky top-0 z-10 bg-slate-50 px-3 py-2 text-left text-[11px] leading-4 font-semibold ' +
  'tracking-[0.04em] text-slate-500 uppercase';

/** A body cell. */
export const TABLE_CELL = 'px-3 text-[13px] text-slate-700';

/* ---------------------------------------------------------------------------------------- */
/* Tabs                                                                                      */
/* ---------------------------------------------------------------------------------------- */

/** The bar tabs sit on. */
export const TABS = 'flex gap-1 border-b border-slate-200';

/**
 * A tab, and the current one. Underlined in ink rather than filled: the Content screen has
 * eleven pages to offer, and eleven filled buttons would be a wall.
 */
export const TAB =
  'inline-flex h-9 items-center gap-1.5 border-b-2 border-transparent px-3 text-[12px] font-medium ' +
  `text-slate-500 hover:border-slate-300 hover:text-ink ${FOCUS}`;
export const TAB_ON = 'border-ink text-ink';

/* ---------------------------------------------------------------------------------------- */
/* Badges                                                                                    */
/* ---------------------------------------------------------------------------------------- */

export type BadgeTone = 'neutral' | 'info' | 'warn' | 'danger' | 'success' | 'accent';

const BADGE_BASE =
  'inline-flex items-center gap-1 rounded-full border px-2 py-px text-[11px] leading-4 ' +
  'font-medium whitespace-nowrap';

/**
 * Status, as a pill with colour.
 *
 * Colour is never the only carrier: every badge in the portal also states its condition in
 * words ("Unread", "Unpublished changes", "No photographs"), so the fact survives a
 * colour-blind reader and a greyscale print alike. `accent` is the brand gold — a pale wash
 * and a gold ring with ink type on top, because gold itself is not legible as 11px text.
 */
const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'border-slate-200 bg-slate-50 text-slate-600',
  info: 'border-sky-200 bg-sky-50 text-sky-800',
  warn: 'border-amber-200 bg-amber-50 text-amber-800',
  danger: 'border-red-200 bg-red-50 text-red-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  accent: 'border-gold/40 bg-gold/10 text-ink',
};

export function badge(tone: BadgeTone = 'neutral'): string {
  return `${BADGE_BASE} ${BADGE_TONES[tone]}`;
}

/* ---------------------------------------------------------------------------------------- */
/* Layout                                                                                    */
/* ---------------------------------------------------------------------------------------- */

/**
 * A screen's outer wrapper. The storefront's `--gutter` (24px, 48px on a desktop) is editorial
 * pacing; a dashboard wants its content close to the sidebar, so the padding is stated here.
 * The max width keeps a table legible on a 27" monitor instead of stretching to the bezel.
 */
export const SCREEN = 'mx-auto w-full max-w-[1200px] px-4 py-5 sm:px-6 sm:py-6';
