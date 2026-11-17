'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ProductHeroProps {
  photos: string[];
  productName: string;
}

/** Seven of twelve columns from lg (764px at the 1440 cap), the full width below it. */
const SIZES = '(min-width: 1440px) 764px, (min-width: 1024px) 58vw, 100vw';

const CONTROL =
  'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 font-ui text-eyebrow font-normal uppercase text-ink ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink';

/**
 * The image column.
 *
 * From `lg` every photograph is stacked at full column width and the page scrolls past them
 * while the detail column stays put. Below `lg` the same markup is a horizontal scroll-snap
 * strip with previous/next controls, so a phone is not asked to scroll through six photographs
 * before it reaches the price.
 *
 * **Photos decide the picture.** A product with no photos renders a labelled frame and no
 * `<img>`: this branches on `photos.length`, never on `product.image`, which the transform
 * fills with a stock garment photo when the list is empty.
 */
const ProductHero = ({ photos, productName }: ProductHeroProps) => {
  const scroller = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  // The photo the visitor is heading for. Presses read this, not `current`: `current` follows
  // scroll events, so two quick presses would otherwise both start from the same photo.
  const target = useRef(0);
  const programmatic = useRef(false);
  const settle = useRef<ReturnType<typeof setTimeout>>(undefined);
  const count = photos.length;

  useEffect(() => () => clearTimeout(settle.current), []);

  if (count === 0) {
    return (
      <div className="flex aspect-[3/4] w-full items-center justify-center bg-paper-deep p-6 text-center">
        <span className="font-ui text-eyebrow uppercase text-ink-soft">Image coming soon</span>
      </div>
    );
  }

  const goTo = (index: number) => {
    const node = scroller.current;
    if (!node) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    target.current = index;
    setCurrent(index);
    // Scroll events fired by this animation must not drag `target` back to the photo it is
    // passing; they are ignored until the strip has been still for a moment.
    programmatic.current = true;
    clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      programmatic.current = false;
    }, 700);
    node.scrollTo?.({ left: index * node.clientWidth, behavior: reduce ? 'auto' : 'smooth' });
  };

  const onScroll = () => {
    const node = scroller.current;
    if (!node || node.clientWidth === 0 || programmatic.current) return;
    const index = Math.min(count - 1, Math.max(0, Math.round(node.scrollLeft / node.clientWidth)));
    target.current = index;
    setCurrent(index);
  };

  return (
    <div>
      <div
        ref={scroller}
        role="region"
        aria-label="Product photographs"
        tabIndex={count > 1 ? 0 : undefined}
        onScroll={onScroll}
        className="scrollbar-hide flex snap-x snap-mandatory overflow-x-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink lg:snap-none lg:flex-col lg:gap-6 lg:overflow-visible"
      >
        {photos.map((src, index) => (
          <div
            key={`${src}-${index}`}
            className="relative aspect-[3/4] w-full shrink-0 snap-center bg-paper-deep"
          >
            <Image
              src={src}
              alt={count > 1 ? `${productName}, image ${index + 1} of ${count}` : productName}
              fill
              sizes={SIZES}
              preload={index === 0}
              className="object-cover"
            />
          </div>
        ))}
      </div>

      {count > 1 ? (
        <div className="mt-4 flex items-center justify-between lg:hidden">
          <button type="button" onClick={() => goTo((target.current - 1 + count) % count)} className={CONTROL}>
            <ChevronLeft size={16} strokeWidth={1.5} aria-hidden="true" />
            <span className="sr-only">Previous image</span>
          </button>
          <p aria-live="polite" className="font-ui text-caption text-ink-soft">
            <span aria-hidden="true">
              {current + 1} / {count}
            </span>
            <span className="sr-only">
              Image {current + 1} of {count}
            </span>
          </p>
          <button type="button" onClick={() => goTo((target.current + 1) % count)} className={CONTROL}>
            <span className="sr-only">Next image</span>
            <ChevronRight size={16} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default ProductHero;
