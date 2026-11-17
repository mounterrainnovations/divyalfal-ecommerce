'use client';

import { useId } from 'react';
import HairlineRule from '@/components/primitives/HairlineRule';
import ProductTile from '@/components/primitives/ProductTile';
import Reveal from '@/components/primitives/Reveal';
import { siteCopy } from '@/lib/content/site-copy';
import { useRelatedProducts } from '@/lib/hooks/useRelatedProducts';

interface YouMayAlsoLikeProps {
  currentProductId: string;
}

/**
 * A quiet three-up strip under a hairline rule: no card, no fill, just the same portrait tiles
 * the listings use. Renders nothing until there is something to show, so the page never
 * flashes an empty heading.
 *
 * `useRelatedProducts` can only ever return three, so the layout is sized for three and not
 * for "however many": `col-span-4` fills the twelve columns exactly. Below `md` it is one-up
 * (`col-span-12`), not two-up -- three tiles at `col-span-6` filled a row of two and stranded
 * the third beside a blank half, the only ragged row on the page, and on a phone a third of
 * 390px is not a photograph worth showing. The stagger steps per column of that three-up row,
 * so it is `% 3`, not the `% 4` left over from a four-up strip that never existed here.
 *
 * Three-up starts at `md`, not `lg`. It used to start at `lg`, which left a tile rendering
 * 720px wide at 768 while `ProductTile`'s shared hint still claimed 33vw -- the browser
 * fetched about a third of the width it was about to display, and the photograph arrived
 * upscaled on the one page whose whole job is showing the garment.
 *
 * `SIZES` is this strip's own, because the shared default describes a four-up grid nothing
 * here uses. Every figure is measured in a browser, not derived from the class names:
 * the widest point of every band, not one sample inside it: 719px at 767 (the full content
 * width, where one-up peaks), 309px at 1023, 416px at 1439, and a fixed 416px from 1440 up,
 * where the editorial grid stops growing.
 */
const SIZES =
  '(min-width: 1440px) 416px, (min-width: 1024px) 29vw, (min-width: 768px) 31vw, calc(100vw - 48px)';

const YouMayAlsoLike = ({ currentProductId }: YouMayAlsoLikeProps) => {
  const headingId = useId();
  const { products, loading } = useRelatedProducts(currentProductId);

  if (loading || products.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby={headingId} className="grid-editorial gap-y-10 pb-24 md:pb-32">
      <HairlineRule className="col-span-12" />
      <h2
        id={headingId}
        className="col-span-12 font-ui text-eyebrow font-normal uppercase text-ink-soft"
      >
        {siteCopy.product.related.heading}
      </h2>
      {products.map((product, index) => (
        <div key={product.id} className="col-span-12 md:col-span-4">
          <Reveal delay={(index % 3) * 60}>
            <ProductTile product={product} sizes={SIZES} />
          </Reveal>
        </div>
      ))}
    </section>
  );
};

export default YouMayAlsoLike;
