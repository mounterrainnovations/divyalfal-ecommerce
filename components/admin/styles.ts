/**
 * The admin portal's design tokens, in one file so no screen invents its own.
 *
 * WHY THIS FILE LOOKS THE WAY IT DOES. The portal was first built on Tailwind's cool `slate`
 * scale. The owner then pointed at a working admin they liked — warm paper ground, white-ish
 * cards, one terracotta accent, a 256px sidebar whose current item is a pale peach pill — and
 * asked for this portal to read the same way. So the structure below is unchanged (it was
 * already a dashboard, not an editorial page); what changed is that every colour now comes
 * from a custom property declared in `components/admin/dashboard.css`.
 *
 * WHY `var()` AND NOT TAILWIND COLOURS. The palette is warm paper and terracotta, which exist
 * in no Tailwind scale, and `@theme` lives in `app/globals.css` — the storefront's file, which
 * the portal may not edit. Declaring the palette on `.ds-root` scopes it to the portal by
 * construction: the shop cannot inherit it, and an admin class loaded on a shop page resolves
 * to nothing rather than to the wrong colour.
 *
 * THE ACCENT HAS THREE STEPS AND THEY ARE NOT INTERCHANGEABLE.
 *  - `--ds-accent` (#8B3F22) is the only one type is ever set in — 6.1:1 on the card surface.
 *  - `--ds-accent-solid` (#B5542C) is a fill with white type on it, and appears at most once
 *    per screen, on that screen's primary action.
 *  - `--ds-accent-soft` (#F3DCCB) is a wash with no text-contrast duty of its own: the label
 *    on it is `--ds-accent`, which clears 4.5:1 against the wash.
 *
 * THE TYPE SIZES ARE ARBITRARY VALUES. The global scale is editorial — it jumps from an 11px
 * eyebrow to a 28px display — and a dense tool needs 11/12/13/14/15/24/28. Rather than add
 * seven tokens to a scale the storefront owns, the sizes are written here, once, and nothing
 * else in the portal states a size.
 *
 * The UI typeface is set on the shell in `dashboard.css`, not here: it is one declaration for
 * the whole portal and no component should be able to opt out of it.
 */

/** Every border in the portal. One value, so nothing drifts a shade. */
export const RULE = 'border-[var(--ds-line)]';

/* ---------------------------------------------------------------------------------------- */
/* Surfaces                                                                                  */
/* ---------------------------------------------------------------------------------------- */

/**
 * A card: the warm surface, a hairline border, an 8px radius and the faintest possible drop.
 * The shadow is a single 1px line of 6% ink rather than a blur — enough to lift the card off
 * the paper ground, not enough to read as a floating object.
 */
export const CARD =
  'rounded-lg border border-[var(--ds-line)] bg-[var(--ds-surface)] ' +
  'shadow-[0_1px_2px_0_rgb(42_33_27/0.06)]';

/** A card's header strip: what it holds on the left, the card's own action on the right. */
export const CARD_HEAD =
  'flex flex-wrap items-center justify-between gap-x-4 gap-y-2 ' +
  'border-b border-[var(--ds-line)] px-5 py-3.5';

/** A card's contents. Tables set their own padding per cell, so they skip this. */
export const CARD_BODY = 'px-5 py-4';

/** The old name for a bordered surface, kept so the sign-in screen still reads plainly. */
export const PANEL = CARD;

/* ---------------------------------------------------------------------------------------- */
/* Type                                                                                      */
/* ---------------------------------------------------------------------------------------- */

/** 14px: the portal's body size, and every table cell. */
export const BODY = 'text-[14px] leading-5 text-[var(--ds-muted)]';

/** 13px medium: field labels, meta lines, counts — the things beside the things. */
export const LABEL = 'text-[13px] leading-4 font-medium text-[var(--ds-muted)]';

/** 12px faint: helper text, hints, the second line under a row. */
export const META = 'text-[12px] leading-4 text-[var(--ds-faint)]';

/** A screen's `<h1>`. 24px semibold — the reference admin's heading size exactly. */
export const TITLE =
  'text-[24px] leading-7 font-semibold tracking-[-0.015em] text-[var(--ds-ink)]';

/** One line of context under a screen title. */
export const SUBTITLE = 'text-[14px] leading-5 text-[var(--ds-muted)]';

/** A card's or a form group's heading. */
export const SECTION_TITLE = 'text-[15px] leading-5 font-semibold text-[var(--ds-ink)]';

/** The number on a stat card. Tabular, so a row of them does not jitter. */
export const FIGURE =
  'text-[28px] leading-none font-semibold tracking-[-0.02em] tabular-nums text-[var(--ds-ink)]';

/* ---------------------------------------------------------------------------------------- */
/* Focus                                                                                     */
/* ---------------------------------------------------------------------------------------- */

/**
 * Keyboard focus, everywhere: a 2px ink outline, offset so it clears the control's own border.
 *
 * Ink rather than the accent on purpose — terracotta passes 3:1 against the card surface but
 * not against the accent wash and the peach pill that controls also sit on. Ink is 13:1
 * against all of them, so one rule is correct in every place.
 */
export const FOCUS =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'focus-visible:outline-[var(--ds-ink)]';

/* ---------------------------------------------------------------------------------------- */
/* Controls                                                                                  */
/* ---------------------------------------------------------------------------------------- */

/**
 * A text input: a real bordered box, with a visible hover and a visible invalid state.
 *
 * `aria-invalid:` is what colours the border red, so the error state is driven by the same
 * attribute a screen reader announces and cannot be set by eye alone.
 */
export const INPUT =
  'block w-full rounded-md border border-[var(--ds-line)] bg-[var(--ds-surface)] px-3 py-2 ' +
  'text-[14px] text-[var(--ds-ink)] placeholder:text-[var(--ds-faint)] ' +
  'hover:border-[var(--ds-line-strong)] ' +
  'aria-invalid:border-red-500 aria-invalid:hover:border-red-500 ' +
  'disabled:cursor-not-allowed disabled:bg-[var(--ds-surface-sunk)] ' +
  'disabled:text-[var(--ds-faint)] ' +
  FOCUS;

/**
 * A native select on the same box. `ds-select` (see `dashboard.css`) hides the platform's own
 * chevron and draws one in the muted ink, so a filter row reads as one set of controls rather
 * than as a mix of ours and the operating system's.
 */
export const SELECT =
  'ds-select block w-full rounded-md border border-[var(--ds-line)] bg-[var(--ds-surface)] ' +
  'py-2 pr-9 pl-3 text-[14px] text-[var(--ds-ink)] hover:border-[var(--ds-line-strong)] ' +
  'disabled:cursor-not-allowed disabled:bg-[var(--ds-surface-sunk)] ' +
  'disabled:text-[var(--ds-faint)] ' +
  FOCUS;

const ACTION_BASE =
  'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md text-[14px] font-medium ' +
  'whitespace-nowrap transition-colors duration-150 motion-reduce:transition-none ' +
  'disabled:pointer-events-none disabled:opacity-50 ' +
  FOCUS;

/*
 * Five weights of action, and the hierarchy is the point: a screen has at most one `ACTION`,
 * and a destructive control never wears the same clothes as the default one.
 */

/** Primary: the one thing this screen is for. Terracotta fill, white type. */
export const ACTION =
  ACTION_BASE +
  ' h-9 border border-[var(--ds-accent-solid)] bg-[var(--ds-accent-solid)] px-4 text-white ' +
  'hover:border-[var(--ds-accent-solid-hover)] hover:bg-[var(--ds-accent-solid-hover)]';

/** Secondary: a bordered surface button — cancel, paging, "show more", toolbar extras. */
export const ACTION_SOFT =
  ACTION_BASE +
  ' h-9 border border-[var(--ds-line)] bg-[var(--ds-surface)] px-4 text-[var(--ds-muted)] ' +
  'hover:bg-[var(--ds-surface-sunk)] hover:text-[var(--ds-ink)]';

/** Tertiary: borderless, for inside a table row where borders would be noise. */
export const ACTION_QUIET =
  ACTION_BASE +
  ' h-8 px-2.5 text-[var(--ds-muted)] hover:bg-[var(--ds-surface-sunk)] hover:text-[var(--ds-ink)]';

/** Destructive, quiet: the delete that opens a confirmation. Red type, no fill until hover. */
export const ACTION_GRAVE = ACTION_BASE + ' h-8 px-2.5 text-red-700 hover:bg-red-50';

/** Destructive, committed: the button inside the confirmation that actually deletes. */
export const ACTION_DANGER =
  ACTION_BASE +
  ' h-9 border border-red-600 bg-red-600 px-4 text-white hover:border-red-700 hover:bg-red-700';

/* ---------------------------------------------------------------------------------------- */
/* Tables                                                                                    */
/* ---------------------------------------------------------------------------------------- */

/** A body row: 48px, which is the reference admin's row height and reads without crowding. */
export const ROW = 'h-12';

/**
 * A column head. Sticky, so scrolling a long table keeps the heads in view. The sunk surface
 * is opaque on purpose: a translucent head lets rows show through as they pass under it.
 */
export const TABLE_HEAD =
  'sticky top-0 z-10 bg-[var(--ds-surface-sunk)] px-4 py-2.5 text-left text-[11px] leading-4 ' +
  'font-semibold tracking-[0.06em] text-[var(--ds-faint)] uppercase';

/** A body cell. */
export const TABLE_CELL = 'px-4 text-[14px] text-[var(--ds-muted)]';

/* ---------------------------------------------------------------------------------------- */
/* Tabs                                                                                      */
/* ---------------------------------------------------------------------------------------- */

/** The bar tabs sit on. */
export const TABS = 'flex gap-1 border-b border-[var(--ds-line)]';

/**
 * A tab, and the current one. Underlined in the accent rather than filled: the Content screen
 * has eleven pages to offer, and eleven filled buttons would be a wall.
 */
export const TAB =
  'inline-flex h-10 items-center gap-1.5 border-b-2 border-transparent px-3 text-[13px] ' +
  'font-medium text-[var(--ds-muted)] hover:border-[var(--ds-line-strong)] ' +
  'hover:text-[var(--ds-ink)] ' +
  FOCUS;
export const TAB_ON = 'border-[var(--ds-accent-solid)] text-[var(--ds-accent)]';

/* ---------------------------------------------------------------------------------------- */
/* Badges                                                                                    */
/* ---------------------------------------------------------------------------------------- */

export type BadgeTone = 'neutral' | 'info' | 'warn' | 'danger' | 'success' | 'accent';

const BADGE_BASE =
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[12px] leading-4 ' +
  'font-medium whitespace-nowrap';

/**
 * Status, as a pill with colour.
 *
 * Colour is never the only carrier: every badge in the portal also states its condition in
 * words ("Unread", "Unpublished changes", "No photographs"), so the fact survives a
 * colour-blind reader and a greyscale print alike. `accent` is the terracotta wash with the
 * accent's own type on it, which is the pill the reference admin uses for a pending state.
 */
const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'border-[var(--ds-line)] bg-[var(--ds-surface-sunk)] text-[var(--ds-muted)]',
  info: 'border-sky-200 bg-sky-50 text-sky-800',
  warn: 'border-amber-200 bg-amber-50 text-amber-800',
  danger: 'border-red-200 bg-red-50 text-red-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  accent: 'border-[var(--ds-accent-soft)] bg-[var(--ds-accent-wash)] text-[var(--ds-accent)]',
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
export const SCREEN = 'mx-auto w-full max-w-[1280px] px-5 py-6 sm:px-7 sm:py-7';
