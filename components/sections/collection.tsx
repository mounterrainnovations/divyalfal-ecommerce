'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Button from '@/components/primitives/Button';
import DisplayHeading from '@/components/primitives/DisplayHeading';
import EditorialPair from '@/components/primitives/EditorialPair';
import Eyebrow from '@/components/primitives/Eyebrow';
import HairlineRule from '@/components/primitives/HairlineRule';
import ProductTile from '@/components/primitives/ProductTile';
import Reveal from '@/components/primitives/Reveal';
import { siteCopy } from '@/lib/content/site-copy';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';

/* ------------------------------------------------------------------ *
 * The homepage's single products request
 * ------------------------------------------------------------------ */

const ENDPOINT = '/api/homepage-sections';

export interface HomepageSections {
  /** Movement 3's real stock. */
  freshArrivals: Product[];
  /** Movement 4's real stock — at most one product per category. */
  shopByStyle: Product[];
}

const NO_SECTIONS: HomepageSections = { freshArrivals: [], shopByStyle: [] };

/**
 * Every section this endpoint feeds is optional and may be absent, null, an error payload
 * or an outright 500 (the route returns `{ error }` whenever `DATABASE_URL` is missing), so
 * nothing here may assume a shape. Anything that is not an array of products reads as no
 * products, which is the same state as low inventory — one branch, four failure modes.
 */
function readSections(payload: unknown): HomepageSections {
  if (!payload || typeof payload !== 'object') return NO_SECTIONS;
  const record = payload as Record<string, unknown>;
  return {
    freshArrivals: readProducts(record.freshArrivals),
    shopByStyle: readProducts(record.shopByStyle),
  };
}

function readProducts(value: unknown): Product[] {
  if (!Array.isArray(value)) return [];
  const products: Product[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue;
    const record = raw as Record<string, unknown>;
    if (typeof record.id !== 'string' || typeof record.name !== 'string') continue;
    const price = Number(record.price);
    const salePrice = Number(record.salePrice);
    products.push({
      id: record.id,
      name: record.name,
      price: Number.isFinite(price) ? price : 0,
      sale: record.sale === true,
      // `resolvePrice` rejects a zero or absent sale price on its own; both arrive here as
      // a non-finite number or a zero, so neither can render as a free garment.
      salePrice: Number.isFinite(salePrice) ? salePrice : undefined,
      image: typeof record.image === 'string' ? record.image : '',
      photos: Array.isArray(record.photos)
        ? record.photos.filter((photo): photo is string => typeof photo === 'string')
        : [],
      category: typeof record.category === 'string' ? record.category : '',
    });
  }
  return products;
}

/**
 * One request serves both movements. The promise is cached at module scope and shared, so
 * Collection and ShopByStyle mounting together issue a single `GET /api/homepage-sections`
 * rather than the three the retired rails fired between them. The cache is released once
 * the last consumer unmounts, which keeps a remounted page (and each test) honest.
 */
let pending: Promise<HomepageSections> | null = null;
let consumers = 0;

function loadSections(): Promise<HomepageSections> {
  pending ??= fetch(ENDPOINT)
    .then(response => (response.ok ? response.json() : null))
    // Covers a rejected fetch, a non-OK response and a body that is not JSON alike.
    .catch(() => null)
    .then(readSections);
  return pending;
}

export interface HomepageSectionsState {
  /** `loading` until the request settles; `ready` even when it failed. */
  status: 'loading' | 'ready';
  sections: HomepageSections;
}

/**
 * Lives here rather than in its own module so that the single-request shape is colocated
 * with the movement that owns it; ShopByStyle imports this named export.
 */
export function useHomepageSections(): HomepageSectionsState {
  const [state, setState] = useState<HomepageSectionsState>({
    status: 'loading',
    sections: NO_SECTIONS,
  });

  useEffect(() => {
    let active = true;
    consumers += 1;

    loadSections().then(sections => {
      if (active) setState({ status: 'ready', sections });
    });

    return () => {
      active = false;
      consumers -= 1;
      if (consumers <= 0) {
        consumers = 0;
        pending = null;
      }
    };
  }, []);

  return state;
}

/* ------------------------------------------------------------------ *
 * Movement 3 — Collection
 * ------------------------------------------------------------------ */

const STORAGE = 'https://duwwgyobnpuqsqdromzj.supabase.co/storage/v1/object/public/product-images';

/**
 * The retired Spotlight carousel's footage. These three clips and the hero's are the only
 * motion assets the client has, so they are re-homed rather than retired. They stay here
 * rather than in `siteCopy` because they are assets, not words, and the copy module is
 * under a leaf-count snapshot.
 */
const SPOTLIGHT_FOOTAGE = [`${STORAGE}/sp01.webm`, `${STORAGE}/sp02.webm`, `${STORAGE}/sp03.webm`];

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

/**
 * Photographed garments lead; the rest keep their order behind them.
 *
 * `ProductTile` renders an honest labelled frame for a product with no photos, and that is
 * right — but a 660px-wide empty frame cannot carry the opening moment of the movement, and
 * the live catalogue's newest product happens to have no photos at all. A stable partition
 * is the whole rule: nothing is hidden, nothing is reordered within a group, and the
 * sequence simply opens with a garment it can actually show.
 */
export function photographedFirst(products: Product[]): Product[] {
  return [
    ...products.filter(product => product.photos.length > 0),
    ...products.filter(product => product.photos.length === 0),
  ];
}

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
 * render as full `EditorialPair` lookbook spreads, image and prose alternating sides, at the
 * tier's existing 70% opacity and carrying no link, no price and no add-to-cart. They are a lookbook of past
 * work, which is what they are — not stock pretending to be purchasable. They stand in only
 * when there is no real stock at all; a real garment is never padded out with placeholders,
 * which is the one way this departs from the retired rails (they topped up to four).
 *
 * `{}`, `{ error }`, empty arrays and a rejected fetch all land in the same branch — see
 * `readSections`. Nothing here can blank the section or throw.
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
 * by 1px gold gaps. On a phone a third of the viewport width is 130px, which crops a 9:16
 * clip down to an unreadable sliver, so the band becomes the single lead clip at its native
 * ratio; the other two stay in the markup and return at `md`.
 *
 * The footage is decoration — muted, looping, out of the tab order and `aria-hidden` — so it
 * carries no accessible content and needs none. `preload="none"` keeps three videos off the
 * critical path of a page whose hero already streams one.
 */
function SpotlightInterlude() {
  return (
    <Reveal className={cn('w-full', ROW_RHYTHM)} delay={60}>
      <HairlineRule />
      <div className="grid w-full grid-cols-1 gap-px bg-gold md:grid-cols-3">
        {SPOTLIGHT_FOOTAGE.map((src, index) => (
          <video
            key={src}
            src={src}
            autoPlay
            muted
            loop
            playsInline
            preload="none"
            aria-hidden="true"
            tabIndex={-1}
            className={cn(
              'aspect-[9/16] w-full bg-paper-deep object-cover md:aspect-auto md:h-[72svh]',
              index > 0 && 'hidden md:block'
            )}
          />
        ))}
      </div>
      <HairlineRule />
    </Reveal>
  );
}

/**
 * One named look from `siteCopy.home.collection`, as an asymmetric spread that alternates
 * sides. Dimmed and inert by the client's decision: these garments are not stock, so the
 * tile is a plain element with no link, no price and no hover affordance — a dimmed thing
 * that reacted to the pointer would read as broken rather than as archive.
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
      <div data-tier="fallback" className="opacity-70">
        <EditorialPair
          flip={index % 2 === 1}
          media={
            <div className="relative aspect-[3/4] w-full overflow-hidden bg-paper-deep">
              <Image
                src={entry.image}
                alt={entry.title}
                fill
                sizes={PAIR_SIZES}
                className="object-cover"
              />
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
