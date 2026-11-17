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
 */
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
        <div key={product.id} className="col-span-6 lg:col-span-4">
          <Reveal delay={(index % 4) * 60}>
            <ProductTile product={product} />
          </Reveal>
        </div>
      ))}
    </section>
  );
};

export default YouMayAlsoLike;
