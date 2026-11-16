import Image from 'next/image';
import Link from 'next/link';
import { useId } from 'react';
import type { Product } from '@/types';
import { resolvePrice } from '@/lib/utils/price';

/**
 * Tile widths follow the editorial grid: four across from lg (a quarter of the viewport,
 * capped by the 1440px content max), three from md, two on a phone.
 */
const SIZES = '(min-width: 1440px) 336px, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw';

/**
 * Portrait 3:4 product tile linking to `/product/[id]`.
 *
 * **Photos decide the picture, never `product.image`.** `transformDbProductToProduct` fills
 * `image` with a stock mock garment when a product has no photos; a couture storefront must
 * show an honest labelled frame instead. So this branches on `photos.length`.
 *
 * The hover swap is two stacked images crossfaded with CSS opacity, and the second image
 * exists only when there is a second photo. It is decorative (`alt=""`), so the tile reads
 * as one image to assistive tech. `priority` maps to `preload` (Next 16 deprecates the
 * `priority` image prop). The tile has no entrance animation of its own; wrap it in
 * `Reveal` for scroll-in, which is a no-op for tiles already on screen.
 */
export default function ProductTile({
  product,
  priority = false,
  headingLevel = 3,
}: {
  product: Product;
  /** Eager-loads and preloads the first photo; use for above-the-fold tiles. */
  priority?: boolean;
  /** Heading element for the product name. Pick the level that follows the page's outline. */
  headingLevel?: 2 | 3 | 4;
}) {
  const Heading = `h${headingLevel}` as const;
  const id = useId();
  const nameId = `${id}-name`;
  const priceId = `${id}-price`;
  const { display, compareAt, onSale } = resolvePrice(product);
  const [first, second] = product.photos;

  return (
    <Link
      href={`/product/${product.id}`}
      aria-labelledby={`${nameId} ${priceId}`}
      className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-paper-deep">
        {first ? (
          <>
            <Image
              src={first}
              alt={product.name}
              fill
              sizes={SIZES}
              preload={priority}
              className="object-cover"
            />
            {second ? (
              <Image
                src={second}
                alt=""
                fill
                sizes={SIZES}
                className="object-cover opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
              />
            ) : null}
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center p-6 text-center">
            <span className="font-ui text-eyebrow uppercase text-ink-soft">Image coming soon</span>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-1">
        <Heading id={nameId} className="font-display text-body font-light text-ink">
          {product.name}
        </Heading>
        <p id={priceId} className="flex items-baseline gap-3 font-ui text-caption">
          <span className={onSale ? 'text-sale' : 'text-ink'}>{display}</span>
          {compareAt ? (
            <s className="text-ink-soft">
              <span className="sr-only">Original price </span>
              {compareAt}
            </s>
          ) : null}
        </p>
      </div>
    </Link>
  );
}
