/**
 * The storefront's shared section furniture.
 *
 * Every homepage section had grown its own spacing and its own heading. An audit of the
 * twelve of them found vertical padding at py-10, py-12, py-16, py-20, py-24 and py-32,
 * containers at max-w-7xl and max-w-336, and six distinct heading class strings differing in
 * colour (text-black, text-gray-800, text-gray-900), alignment and bottom margin. Scrolling the
 * page you felt it as drift: the gaps between sections never settled into a rhythm, and the
 * largest ones read as the page having run out of things to say.
 *
 * So the rhythm lives here, once, and the sections compose it.
 *
 * `SECTION` is deliberately tighter than what it replaces. The old maximum was py-32 (256px of
 * air top and bottom); this is 56px on a phone and 80px on a desktop. The page lost roughly
 * a third of its height without losing a single section, which is the whole brief: the site
 * should feel full, not sparse.
 */
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** One vertical rhythm for every section on the site. */
export const SECTION = 'py-14 md:py-20';

/** One measure. `max-w-336` appeared in exactly one section and is not reproduced. */
export const CONTAINER = 'mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8';

/**
 * One section heading: Cormorant Garamond at the display sizes, near-black.
 *
 * Two deliberate departures from the sizes this replaces, both to suit the face rather than
 * taste. Cormorant has a notably small x-height, so a heading set at the same pixel size as
 * the Fraunces it replaces reads visibly smaller — hence one step up at every breakpoint.
 * And its 300 is genuinely fragile at these sizes, thin enough to break up on a low-density
 * phone screen, so headings sit at 400 and keep the lightness in the letterforms instead of
 * the weight.
 *
 * `tracking-tight` is gone for the same reason: an old-style serif is drawn with its own
 * fitting, and pulling it tighter closes the counters that give it its air.
 */
export const HEADING = 'font-serif font-normal text-4xl sm:text-5xl xl:text-6xl text-gray-900';

/** The supporting line under a heading, where a section has one. */
export const SUBHEADING = 'mt-3 max-w-2xl text-sm sm:text-base leading-relaxed text-gray-600';

export function SectionHeading({
  children,
  align = 'center',
  className,
  as: Tag = 'h2',
}: {
  children: ReactNode;
  align?: 'center' | 'left';
  className?: string;
  as?: 'h1' | 'h2' | 'h3';
}) {
  return (
    <Tag className={cn(HEADING, align === 'center' && 'text-center', className)}>{children}</Tag>
  );
}

/**
 * The gap between a section's heading block and its content.
 *
 * Previously every section picked its own (mb-4, mb-6, mb-8, mb-10, mb-12, mb-16, and two
 * responsive pairs), which is the same drift as the padding, one level down.
 */
export const HEADING_GAP = 'mb-8 md:mb-10';

/**
 * `sizes` hints.
 *
 * Every `next/image` in the restored sections was emitting `w=3840` requests, because without
 * a `sizes` hint next/image assumes the image fills the viewport and serves the largest
 * variant it has. The category tiles are 144px circles and were each pulling a 3840px render
 * of a 3606x5409 source — one of them alone was 1.5MB, and the first paint of the page showed
 * empty boxes while they arrived. These describe what the slots actually are.
 */
export const SIZES = {
  /** A ~144px avatar in the category strip. */
  avatar: '(max-width: 640px) 88px, 144px',
  /** A card in a 1/2/3/4-up responsive grid. */
  card: '(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 23vw',
  /** A half-width editorial image. */
  half: '(max-width: 768px) 100vw, 50vw',
  /** A full-bleed band. */
  full: '100vw',
} as const;
