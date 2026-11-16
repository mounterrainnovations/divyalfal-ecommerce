'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';
import DisplayHeading from '@/components/primitives/DisplayHeading';
import HairlineRule from '@/components/primitives/HairlineRule';
import ProductTile from '@/components/primitives/ProductTile';
import Reveal from '@/components/primitives/Reveal';
import { siteCopy } from '@/lib/content/site-copy';
import { useHomepageSections } from '@/lib/hooks/useHomepageSections';
import { cn } from '@/lib/utils';
import { photographedFirst } from '@/lib/utils/product-utils';

/**
 * Six slots, two per row, each row a different asymmetry: a wide tile with a narrower one
 * dropped below its shoulder, then the mirror. `/api/homepage-sections` returns at most one
 * product per category, so six is the ceiling and the cycle never repeats on one page.
 */
const TILE_PLACEMENT = [
  'col-span-12 md:col-span-5 md:col-start-2',
  'col-span-12 mt-12 md:col-span-4 md:col-start-8 md:mt-32',
  'col-span-12 mt-12 md:col-span-4 md:col-start-2 md:mt-24',
  'col-span-12 mt-12 md:col-span-5 md:col-start-7 md:mt-0',
  'col-span-12 mt-12 md:col-span-5 md:col-start-2 md:mt-24',
  'col-span-12 mt-12 md:col-span-4 md:col-start-8 md:mt-40',
];

const TILES_PER_ROW = 2;

/** Widest tile here is five of twelve columns, capped by the 1440px content max. */
const TILE_SIZES = '(min-width: 1440px) 576px, (min-width: 768px) 42vw, 100vw';

function rowsOf<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += TILES_PER_ROW) {
    rows.push(items.slice(i, i + TILES_PER_ROW));
  }
  return rows;
}

/**
 * Movement 4 — Shop by Style.
 *
 * The pre-revamp section was a horizontal snap-scroller of four fixed-width cards with two
 * floating circular chevron buttons laid over them, centred under a centred heading. All of
 * that apparatus is gone: the tiles sit on the editorial grid at varied spans, two to a row,
 * each row offset differently, so a category reads as a chosen placement rather than as the
 * next slide. With one product live the single tile simply holds the left five columns and
 * the rest of the row is air — the asymmetry is the composition, so a short row is not a
 * gap.
 *
 * Real stock comes from `sections.shopByStyle` and uses `ProductTile`, so photo-less
 * products get the honest "image coming soon" frame and prices come from `resolvePrice`.
 * `photographedFirst` gives the wider leading slots to the categories that have a
 * photograph; nothing is dropped, and a photo-less garment simply follows the ones that can
 * carry a picture.
 *
 * The fallback tier is the client's decision, kept: the four looks in `siteCopy.home.style`
 * render in the same placements at 70% opacity with their names and nothing else — no link,
 * no price, no hover swap. They appear only when there is no real stock at all.
 *
 * `{}`, `{ error }`, empty arrays and a rejected fetch are one branch (`readSections` in
 * `collection.tsx`), and the request itself is shared with Movement 3: one
 * `GET /api/homepage-sections` serves both movements.
 */
export default function ShopByStyle() {
  const { status, sections } = useHomepageSections();
  const products = photographedFirst(sections.shopByStyle).slice(0, TILE_PLACEMENT.length);
  const showFallback = status === 'ready' && products.length === 0;

  const tiles: ReactNode[] = showFallback
    ? siteCopy.home.style.items.map(item => <StyleFallbackTile key={item.name} item={item} />)
    : products.map(product => <ProductTile key={product.id} product={product} headingLevel={3} />);

  return (
    <section className="section-rhythm bg-paper">
      <div className="grid-editorial">
        <Reveal className="col-span-12 md:col-span-6 md:col-start-2">
          <DisplayHeading level={2} size={2}>
            {siteCopy.home.style.heading}
          </DisplayHeading>
        </Reveal>
      </div>

      {rowsOf(tiles).map((row, rowIndex) => (
        <div key={rowIndex} className={cn('grid-editorial', rowIndex === 0 ? 'mt-4 md:mt-20' : '')}>
          {row.map((tile, tileIndex) => {
            const index = rowIndex * TILES_PER_ROW + tileIndex;
            return (
              <Reveal key={index} className={TILE_PLACEMENT[index]} delay={tileIndex * 60}>
                {tile}
              </Reveal>
            );
          })}
        </div>
      ))}

      <Reveal className="grid-editorial mt-16 md:mt-28" delay={Math.max(tiles.length - 1, 0) * 60}>
        <HairlineRule className="col-span-12 md:col-span-10 md:col-start-2" />
      </Reveal>
    </section>
  );
}

/**
 * A look from `siteCopy.home.style`, inert. The text block matches `ProductTile`'s so the two
 * tiers share one silhouette, minus the price line — these garments are archive, not stock,
 * and must never read as purchasable.
 *
 * The dim sits on the photograph, not on the tile: `opacity` applies to a subtree, and
 * dimming the name with it costs contrast the accessibility gate measures. The pale plate
 * carries the archive reading on its own.
 */
function StyleFallbackTile({ item }: { item: (typeof siteCopy.home.style.items)[number] }) {
  return (
    <div data-tier="fallback">
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-paper-deep opacity-70">
        {/* Decorative: the name below is the accessible label for this tile. */}
        <Image src={item.frontImage} alt="" fill sizes={TILE_SIZES} className="object-cover" />
      </div>
      <h3 className="mt-4 font-display text-body font-light text-ink">{item.name}</h3>
    </div>
  );
}
