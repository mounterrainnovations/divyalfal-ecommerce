'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
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
import { hasPhotographed, photographedFirst } from '@/lib/utils/product-utils';

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

/**
 * The widest a product tile gets here, measured at both edges of every band. `PRODUCT_PLACEMENT`
 * alternates six and five columns, so the hint covers the six-column case: 719px at 767,
 * 476px at 1023, 648px at 1439, and a fixed 648px from 1440 up. The shared fallback asked for
 * 336px at 1440 -- a 1.9x upscale on the largest photograph on the homepage.
 */
const TILE_SIZES =
  '(min-width: 1440px) 648px, (min-width: 1024px) 46vw, (min-width: 768px) 47vw, calc(100vw - 48px)';

const ROW_RHYTHM = 'mt-16 md:mt-28';

/**
 * Where each of Most Recommended's two strands sits. Not a two-up: the first holds columns
 * 2–5, the second starts at 8, so the pair keeps the movement's asymmetry rather than
 * reading as a feature table.
 */
const STRAND_PLACEMENT = [
  'col-span-12 md:col-span-4 md:col-start-2',
  'col-span-12 md:col-span-4 md:col-start-8',
] as const;

/**
 * Media width of a lookbook pair: `EditorialPair` gives it seven of twelve columns, capped by
 * the 1440 content max. Measured in Chrome at both edges of every band, with the browser
 * resolving the hint (production build, DPR 1) -- not derived from the class names:
 *
 *   390 -> 327px;  767 -> 704px;  768 -> 401px;  1023 -> 550px;
 *   1024 -> 512px; 1439 -> 755px; 1440 -> 755px; 1920 -> 764px
 *
 * (1439 and 1440 measure 755 rather than 764 because a 15px scrollbar narrows the layout
 * viewport; 764 is the uncapped maximum, which 1920 reaches.)
 *
 * The previous hint claimed **830px** from 1440 up and `100vw` below 768. Both cost a
 * candidate step: at 1439–1920 the browser took `w=1080` for a 764px slot, and at 767 it took
 * `w=828` for a 704px one — about 47KB and 13KB of extra bytes per photograph, on a tier that
 * renders four of them. Each figure here is the widest point of its band, so the hint is
 * generous by a few pixels and never by a candidate.
 */
const PAIR_SIZES =
  '(min-width: 1440px) 764px, (min-width: 1024px) 54vw, (min-width: 768px) 55vw, calc(100vw - 48px)';

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
 * what they are — not stock pretending to be purchasable. A real garment is never padded out
 * with placeholders, which is the one way this departs from the retired rails (they topped up
 * to four).
 *
 * **The tier turns on whether a photographed garment exists, not on whether the array is
 * empty** (`hasPhotographed`). `ProductTile`'s "image coming soon" frame is the honest answer
 * for a garment that reaches a listing with no picture, and it stays — but it cannot carry
 * this movement, where the opening slot is 648px wide and is the largest photograph on the
 * homepage. One photo-less product under the old `products.length === 0` test rendered exactly
 * that: a single empty frame, while the composed tier waited behind a condition only zero
 * products could satisfy. Spec goal 5 is "looks intentional at 2 products" and §5 forbids a
 * grid that renders half-empty.
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
  const showFallback = status === 'ready' && !hasPhotographed(products);

  const rows: ReactNode[] = showFallback
    ? siteCopy.home.collection.map((entry, index) => (
        <LookbookRow key={entry.title} entry={entry} index={index} />
      ))
    : products.map((product, index) => (
        <div key={product.id} className={cn('grid-editorial', ROW_RHYTHM)}>
          <Reveal className={PRODUCT_PLACEMENT[index]} delay={index * 60}>
            <ProductTile product={product} headingLevel={3} sizes={TILE_SIZES} />
          </Reveal>
        </div>
      ));

  return (
    <section className="section-rhythm bg-paper">
      <div className="grid-editorial">
        <Reveal className="col-span-12 md:col-span-6 md:col-start-2">
          {/* The eyebrow is the heading of the rail this movement absorbed, not one of its
              two tab titles -- both of those now label their own blurb below. */}
          <Eyebrow>{siteCopy.home.recommended.heading}</Eyebrow>
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

      {/* Most Recommended's two strands, as a pair of notes under the lead.
          `recommended.tabs` carried a title and a blurb each; the retired rail showed them
          behind a pair of tab controls, and when the three rails collapsed into this one
          movement only `tabs[1].title` survived into the markup -- the two blurbs stayed in
          `siteCopy`, in its snapshot, and on no page at all. They are the two strands this
          sequence now holds, so this is where they read. No new words: both the titles and
          both the blurbs are the stored strings. */}
      <div className="grid-editorial mt-14 gap-y-10 md:mt-20">
        <Reveal className="col-span-12 md:col-span-10 md:col-start-2">
          <HairlineRule />
        </Reveal>
        {siteCopy.home.recommended.tabs.map((tab, index) => (
          <Reveal key={tab.title} delay={index * 60} className={STRAND_PLACEMENT[index]}>
            <Eyebrow>{tab.title}</Eyebrow>
            <p className="measure mt-5 font-ui text-body text-ink-soft">{tab.body}</p>
          </Reveal>
        ))}
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
 * **Under `prefers-reduced-motion` nothing ever plays — and that is why playback is started
 * imperatively rather than with an `autoPlay` attribute.** A media query cannot be answered
 * during server rendering, so `autoPlay={!prefersReducedMotion}` shipped `autoplay` in the
 * server HTML and the browser acted on it before React hydrated; clearing the attribute
 * afterwards does not pause an element that is already playing. So the markup is always
 * paused, and an effect — which only ever runs on the client, with the real answer in hand —
 * reads the query and calls `play()` when, and only when, motion is allowed. The effect also
 * subscribes, so turning the setting on mid-session pauses the band rather than waiting for
 * a reload.
 *
 * `preload="metadata"` rather than `"none"`: it is what paints the still first frame a
 * reduced-motion viewer sees, and the clips that do play are about to download anyway.
 *
 * The column count follows the resolved clip count rather than a `md:` class, so the band a
 * desktop paints before hydration is one full-bleed clip at the band's final height, not one
 * panel beside two-thirds of bare gold ground.
 *
 * The footage is decoration — muted, out of the tab order and `aria-hidden` — so it carries
 * no accessible content and needs none.
 */
function SpotlightInterlude() {
  const isDesktop = useMedia(DESKTOP);
  const clips = isDesktop ? SPOTLIGHT_FOOTAGE : SPOTLIGHT_FOOTAGE.slice(0, 1);
  const panels = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    const media =
      typeof window.matchMedia === 'function' ? window.matchMedia(REDUCED_MOTION) : null;

    const sync = () => {
      const reduce = media?.matches ?? false;
      for (const panel of panels.current) {
        if (!panel) continue;
        if (reduce) {
          panel.pause();
          continue;
        }
        const started: unknown = panel.play();
        // A refused play — an autoplay policy, a codec — leaves the first frame on screen,
        // which is the reduced-motion state and perfectly acceptable here.
        if (started instanceof Promise) started.catch(() => {});
      }
    };

    sync();
    media?.addEventListener('change', sync);
    return () => media?.removeEventListener('change', sync);
  }, [clips.length]);

  return (
    <Reveal className={cn('w-full', ROW_RHYTHM)} delay={60}>
      <HairlineRule />
      <div
        className={cn(
          'grid w-full grid-cols-1 gap-px bg-gold',
          clips.length > 1 && 'md:grid-cols-3'
        )}
      >
        {clips.map((src, index) => (
          <video
            key={src}
            ref={node => {
              panels.current[index] = node;
            }}
            src={src}
            muted
            loop
            playsInline
            preload="metadata"
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
