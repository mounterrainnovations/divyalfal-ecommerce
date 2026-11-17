import Image from 'next/image';
import Link from 'next/link';
import type { Product } from '@/types';
import { resolvePrice } from '@/lib/utils/price';

/**
 * The last-resort `sizes` hint, and nothing renders with it.
 *
 * `sizes` describes a layout, and the four surfaces that render this tile lay it out four
 * different ways, so there is no honest shared value -- every one of them passes its own,
 * measured at both edges of every band. (`collection.tsx` has done this for its lookbook pair
 * since Task 8: `PAIR_SIZES`. This is the same idea, per tile.)
 *
 * The fallback is therefore chosen to be *generous rather than typical*: the full editorial
 * content width, which is the widest a tile can ever be. A surface that forgets to pass its
 * own over-fetches, which wastes bytes; the opposite mistake ships a photograph the browser
 * has to upscale, which on a couture storefront is the one thing it must not look like.
 * `test/no-legacy-styles.test.ts` fails if any call site relies on this.
 */
const FALLBACK_SIZES = 'calc(100vw - 48px)';

/**
 * Portrait 3:4 product tile linking to `/product/[id]`.
 *
 * **Photos decide the picture, never `product.image`.** `transformDbProductToProduct` fills
 * `image` with a stock mock garment when a product has no photos; a couture storefront must
 * show an honest labelled frame instead. So this branches on `photos.length`.
 *
 * The hover swap is two stacked images crossfaded with CSS opacity, and the second image
 * exists only when there is a second photo. `priority` maps to `preload` (Next 16 deprecates
 * the `priority` image prop). The tile has no entrance animation of its own; wrap it in
 * `Reveal` for scroll-in, which is a no-op for tiles already on screen.
 *
 * **Neither photograph is exposed to assistive tech**: a picture of the thing the link
 * already names is decoration (WAI, "functional images"), so both carry `alt=""`. With
 * `alt={product.name}` a screen reader said the garment twice, once for the link and once for
 * the image inside it.
 *
 * **The link takes its accessible name from its own contents — no `aria-labelledby`.** That
 * is WCAG 2.1 SC 2.5.3 Label in Name (Level A): a control's accessible name must contain the
 * text a sighted user can read on it, because a speech-input user says the words they see.
 * Naming the link with just the heading and the price left two visible things out — the empty
 * frame's "Image coming soon" and, on a sale tile, the struck original price — and axe
 * reported `label-content-name-mismatch` (serious) on both `/products` tiles. Taking the name
 * from the contents makes it impossible for the two to drift apart again: whatever is added
 * inside the tile is in the name by construction. The cost is that a photo-less tile is
 * announced "Image coming soon, <garment>, <price>", which is information rather than noise.
 *
 * Two details that look fussy and are not, both required by the same rule, which wants the
 * visible words to form one unbroken run inside the name:
 *
 *  - the screen-reader-only gloss sits *after* the struck number (" original price"), not
 *    before it. In front, it split the visible run — "₹6,000 **original price** ₹10,000" — and
 *    the name no longer contained the visible text contiguously;
 *  - the explicit `{' '}` after the current price. `span` and `s` are phrasing elements, so
 *    the name computation puts no space between them, and without it the two prices ran
 *    together into a single "₹6,000₹10,000" token.
 */
export default function ProductTile({
  product,
  priority = false,
  headingLevel = 3,
  sizes = FALLBACK_SIZES,
}: {
  product: Product;
  /** Eager-loads and preloads the first photo; use for above-the-fold tiles. */
  priority?: boolean;
  /**
   * The `sizes` hint, which must describe the width this surface actually renders the tile
   * at. Measure it in a browser rather than reading it off the class names, at both edges of
   * every band -- the widest point of a band is usually its top, not the breakpoint. Required
   * in practice: a guard test fails if a call site leaves it out.
   */
  sizes?: string;
  /** Heading element for the product name. Pick the level that follows the page's outline. */
  headingLevel?: 2 | 3 | 4;
}) {
  const Heading = `h${headingLevel}` as const;
  const { display, compareAt, onSale } = resolvePrice(product);
  const [first, second] = product.photos;

  return (
    <Link
      href={`/product/${product.id}`}
      className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-paper-deep">
        {first ? (
          <>
            <Image
              src={first}
              alt=""
              fill
              sizes={sizes}
              preload={priority}
              className="object-cover"
            />
            {second ? (
              <Image
                src={second}
                alt=""
                fill
                sizes={sizes}
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
        <Heading className="font-display text-body font-light text-ink">{product.name}</Heading>
        <p className="flex items-baseline gap-3 font-ui text-caption">
          <span className={onSale ? 'text-sale' : 'text-ink'}>{display}</span>{' '}
          {compareAt ? (
            <s className="text-ink-soft">
              {compareAt}
              <span className="sr-only"> original price</span>
            </s>
          ) : null}
        </p>
      </div>
    </Link>
  );
}
