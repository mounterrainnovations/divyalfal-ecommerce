'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';
import Button from '@/components/primitives/Button';
import DisplayHeading from '@/components/primitives/DisplayHeading';
import EditorialPair from '@/components/primitives/EditorialPair';
import Eyebrow from '@/components/primitives/Eyebrow';
import HairlineRule from '@/components/primitives/HairlineRule';
import ProductTile from '@/components/primitives/ProductTile';
import Reveal from '@/components/primitives/Reveal';
import { siteCopy } from '@/lib/content/site-copy';
import { useHomepageSections } from '@/lib/hooks/useHomepageSections';
import { useMedia } from '@/lib/hooks/useMedia';
import { cn } from '@/lib/utils';
import { photographedFirst } from '@/lib/utils/product-utils';

const STORAGE = 'https://duwwgyobnpuqsqdromzj.supabase.co/storage/v1/object/public/product-images';

/**
 * The retired Spotlight carousel's footage. These three clips and the hero's are the only
 * motion assets the client has, so they are re-homed rather than retired. They stay here
 * rather than in `siteCopy` because they are assets, not words, and the copy module is
 * under a leaf-count snapshot.
 */
const SPOTLIGHT_FOOTAGE = [`${STORAGE}/sp01.webm`, `${STORAGE}/sp02.webm`, `${STORAGE}/sp03.webm`];

/** The `md` breakpoint, as a media query, so the band can match it in JavaScript. */
const DESKTOP = '(min-width: 768px)';
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/**
 * One row per garment, drifting across the grid — never a four-up. The live catalogue holds
 * two products and the endpoint takes at most four, so this cycle is the whole sequence.
 */
const PRODUCT_PLACEMENT = [
  'col-span-12 md:col-span-6 md:col-start-2',
  'col-span-12 md:col-span-5 md:col-start-7',
  'col-span-12 md:col-span-5 md:col-start-3',
  'col-span-12 md:col-span-6 md:col-start-6',
];

const ROW_RHYTHM = 'mt-16 md:mt-28';

/** Media width of a lookbook pair: seven of twelve columns, capped by the 1440 content max. */
const PAIR_SIZES = '(min-width: 1440px) 830px, (min-width: 768px) 58vw, 100vw';

/**
 * Movement 3 — the collection, as one sequence.
 *
 * Three near-identical rails stood here before: Spotlight (four videos in a snap-scroller),
 * Most Recommended (a tabbed masonry of four cards) and Explore (four cards in another
 * scroller). Two of them asked `/api/homepage-sections` for the *same* query, so the same
 * four garments rendered twice under different headings. They collapse into this: one
 * heading, one lead, one request, and a vertical sequence of large portrait moments.
 *
 * The composition is sized for the stock that exists, not for the stock a template assumes.
 * Each garment gets its own row of the editorial grid at six or five columns — roughly
 * 660px and 550px wide at the content max — and the row placement drifts left, right, left,
 * so two products read as a deliberate diagonal rather than as a half-empty grid. Nothing
 * here gets denser as stock grows: the endpoint caps Fresh Arrivals at four, so the sequence
 * is at most four rows at any inventory.
 *
 * **The fallback tier.** With two products live, the placeholder tier is on screen often, so
 * it is composed rather than tolerated: the four named looks in `siteCopy.home.collection`
 * render as full `EditorialPair` lookbook spreads, image and prose alternating sides, and
 * carrying no link, no price and no add-to-cart. They are a lookbook of past work, which is
 * what they are — not stock pretending to be purchasable. They stand in only when there is
 * no real stock at all; a real garment is never padded out with placeholders, which is the
 * one way this departs from the retired rails (they topped up to four).
 *
 * `{}`, `{ error }`, empty arrays and a rejected fetch all land in the same branch — see
 * `lib/hooks/useHomepageSections`. Nothing here can blank the section or throw.
 *
 * The spotlight footage returns as a full-bleed triptych interlude set inside the sequence,
 * after its first row. One band of three rather than three separate interludes: at two
 * products, three interludes would outnumber the garments and read as filler, while one band
 * holds its proportion at two products and at sixty. Gold appears only as the hairlines
 * framing it and the 1px gaps between the panels.
 *
 * All of it is below the fold, so motion is `Reveal` with the spec's 60ms stagger — never
 * the hero's inline `--reveal-delay` cast, which is for above-the-fold CSS-only motion.
 */
export default function Collection() {
  const { status, sections } = useHomepageSections();
  const products = photographedFirst(sections.freshArrivals).slice(0, PRODUCT_PLACEMENT.length);
  const showFallback = status === 'ready' && products.length === 0;

  const rows: ReactNode[] = showFallback
    ? siteCopy.home.collection.map((entry, index) => (
        <LookbookRow key={entry.title} entry={entry} index={index} />
      ))
    : products.map((product, index) => (
        <div key={product.id} className={cn('grid-editorial', ROW_RHYTHM)}>
          <Reveal className={PRODUCT_PLACEMENT[index]} delay={index * 60}>
            <ProductTile product={product} headingLevel={3} />
          </Reveal>
        </div>
      ));

  return (
    <section className="section-rhythm bg-paper">
      <div className="grid-editorial">
        <Reveal className="col-span-12 md:col-span-6 md:col-start-2">
          <Eyebrow>{siteCopy.home.recommended.tabs[1].title}</Eyebrow>
          <DisplayHeading level={2} size={2} className="mt-5">
            {siteCopy.home.explore.heading}
          </DisplayHeading>
        </Reveal>

        <Reveal
          delay={60}
          className="col-span-12 mt-10 self-end md:col-span-4 md:col-start-8 md:mt-0"
        >
          <p className="measure font-ui text-body text-ink-soft">{siteCopy.home.explore.body}</p>
          <Button href={siteCopy.home.explore.ctaHref} className="mt-8">
            {siteCopy.home.explore.cta}
          </Button>
        </Reveal>
      </div>

      {rows[0] ?? null}

      <SpotlightInterlude />

      {rows.slice(1)}

      <Reveal
        className={cn('grid-editorial', ROW_RHYTHM)}
        delay={Math.max(rows.length - 1, 0) * 60}
      >
        <HairlineRule className="col-span-12 md:col-span-10 md:col-start-2" />
      </Reveal>
    </section>
  );
}

/**
 * Full-bleed, edge to edge, no gutters: the one place in the movement that leaves the grid.
 * Three portrait clips at equal width on a desktop, framed by gold hairlines and separated
 * by 1px gold gaps.
 *
 * **A phone is served the lead clip only, and the other two are never requested.** A third
 * of a 390px viewport is 130px, which crops a 9:16 clip to an unreadable sliver — but a CSS
 * `hidden` would not have saved the bytes: `autoplay` overrides `preload="none"` in every
 * engine that implements it, so a `display:none` video with a `src` still downloads. The
 * breakpoint is therefore matched in JavaScript and the extra clips are simply not rendered.
 * All three return at `md`, which a test pins, so "re-homed, not retired" stays true.
 *
 * **Under `prefers-reduced-motion` nothing plays.** The clips render as their still first
 * frame (`preload="metadata"`, no `autoplay`), which keeps the composition and honours the
 * spec's rule that every piece of motion sits behind the reduced-motion query.
 *
 * The footage is decoration — muted, out of the tab order and `aria-hidden` — so it carries
 * no accessible content and needs none.
 */
function SpotlightInterlude() {
  const isDesktop = useMedia(DESKTOP);
  const prefersReducedMotion = useMedia(REDUCED_MOTION);
  const clips = isDesktop ? SPOTLIGHT_FOOTAGE : SPOTLIGHT_FOOTAGE.slice(0, 1);

  return (
    <Reveal className={cn('w-full', ROW_RHYTHM)} delay={60}>
      <HairlineRule />
      <div className="grid w-full grid-cols-1 gap-px bg-gold md:grid-cols-3">
        {clips.map(src => (
          <video
            key={src}
            src={src}
            autoPlay={!prefersReducedMotion}
            muted
            loop
            playsInline
            // Nothing is fetched until the clip plays; under reduced motion it never does,
            // so load just enough to paint a still first frame.
            preload={prefersReducedMotion ? 'metadata' : 'none'}
            aria-hidden="true"
            tabIndex={-1}
            className="aspect-[9/16] w-full bg-paper-deep object-cover md:aspect-auto md:h-[72svh]"
          />
        ))}
      </div>
      <HairlineRule />
    </Reveal>
  );
}

/**
 * One named look from `siteCopy.home.collection`, as an asymmetric spread that alternates
 * sides. Inert by the client's decision: these garments are not stock, so the spread is a
 * plain element with no link, no price and no hover affordance — a dimmed thing that
 * reacted to the pointer would read as broken rather than as archive.
 *
 * **The dim sits on the photograph, not on the spread.** `opacity` applies to a subtree, so
 * dimming the wrapper dimmed the prose with it, and `text-ink-soft` at 70% over paper
 * computes to ~2.98:1 — below AA at body size, and axe accounts for opacity. The archive
 * reading comes from the pale plate; the words stay at full strength (~5.5:1).
 */
function LookbookRow({
  entry,
  index,
}: {
  entry: (typeof siteCopy.home.collection)[number];
  index: number;
}) {
  return (
    <Reveal className={cn('w-full', ROW_RHYTHM)} delay={index * 60}>
      <div data-tier="fallback">
        <EditorialPair
          flip={index % 2 === 1}
          media={
            <div className="relative aspect-[3/4] w-full overflow-hidden bg-paper-deep opacity-70">
              {/* Decorative: the title beside it is the accessible name of this spread. */}
              <Image src={entry.image} alt="" fill sizes={PAIR_SIZES} className="object-cover" />
            </div>
          }
        >
          <Eyebrow>{String(index + 1).padStart(2, '0')}</Eyebrow>
          <DisplayHeading level={3} size={3} className="mt-4">
            {entry.title}
          </DisplayHeading>
          <p className="measure mt-5 font-ui text-body text-ink-soft">{entry.description}</p>
        </EditorialPair>
      </div>
    </Reveal>
  );
}
