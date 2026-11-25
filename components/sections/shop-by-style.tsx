'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { HomepageProduct } from '@/lib/common/product-interfaces';
import { resolvePrice, type ResolvedPrice } from '@/lib/utils/price';

/**
 * A garment in this strip.
 *
 * `price` is narrowed to `number` (the base allows `number | string`, because other sections
 * put prose in that field) and `sale`/`salePrice` are carried through, because the strip now
 * prints a price and `resolvePrice` needs all three to decide whether a sale is real.
 */
interface StyleProduct extends HomepageProduct {
  price: number;
  sale?: boolean;
  salePrice?: number | null;
}

interface HomepageSectionsResponse {
  shopByStyle?: Array<
    HomepageProduct & { photos?: string[]; sale?: boolean; salePrice?: number | null }
  >;
}

// Mock fallback data
const mockStyleProducts: StyleProduct[] = [
  {
    id: 'mock-1',
    name: 'Raw Silk Off White Printed with Sequence Detailing',
    frontImage: '/shop-by-style/f1.png',
    backImage: '/shop-by-style/b1.png',
    image: '/shop-by-style/f1.png',
    price: 0,
    isMock: true,
  },
  {
    id: 'mock-2',
    name: 'Pure Cotton Block Print Ajragh Bagh',
    frontImage: '/shop-by-style/f2.png',
    backImage: '/shop-by-style/b2.png',
    image: '/shop-by-style/f2.png',
    price: 0,
    isMock: true,
  },
  {
    id: 'mock-3',
    name: 'Banarasi Anarkali Suit',
    frontImage: '/shop-by-style/f3.png',
    backImage: '/shop-by-style/b3.png',
    image: '/shop-by-style/f3.png',
    price: 0,
    isMock: true,
  },
  {
    id: 'mock-4',
    name: 'Peach and off white Banarasi Angrakha Anarkarli',
    frontImage: '/shop-by-style/f4.png',
    backImage: '/shop-by-style/b4.png',
    image: '/shop-by-style/f4.png',
    price: 0,
    isMock: true,
  },
];

/**
 * What to print under a garment's name, or nothing.
 *
 * Nothing is a real answer here, and it is why this is a function rather than a call to
 * `resolvePrice` in the markup. The four placeholders above carry `price: 0` — they are the
 * tier this section falls back to when the database has fewer than four garments to show, and
 * they have never had prices. Running them through the formatter would print "₹0" under a
 * couture lehenga, which is worse than printing nothing: a visitor reads it as the price. So a
 * placeholder, or any garment whose price did not arrive as a usable positive number, shows no
 * price line at all; only a real garment with a real price gets one.
 *
 * Everything past that gate goes through `resolvePrice`, the one formatter — including the
 * judgement about whether a flagged sale is genuine (a sale price of 0, or above the regular
 * price, is not).
 */
export function styleCardPrice(
  product: Pick<StyleProduct, 'price' | 'sale' | 'salePrice' | 'isMock'>
): ResolvedPrice | null {
  if (product.isMock) return null;
  if (!Number.isFinite(product.price) || product.price <= 0) return null;
  return resolvePrice(product);
}

const StyleCard = ({ product }: { product: StyleProduct }) => {
  const [isHovered, setIsHovered] = useState(false);
  const price = styleCardPrice(product);

  /*
   * `flex h-full flex-col` on the root, `flex-1` on the meta block below it.
   *
   * The row stretches its items, so every card is handed the height of the tallest one; what
   * used to happen is that each card then sized itself by its own content and the row's bottom
   * edge came out ragged. That was survivable while the only variable was whether a garment's
   * name wrapped to two lines. With a price under the name — and a second line of it whenever
   * a garment is on sale — the difference is up to two lines, which is obvious. The card now
   * fills the track and the meta block absorbs the slack.
   *
   * The root is the `Link` itself (or a plain `div` for a placeholder, which must not be
   * clickable) rather than a `div` inside a `Link`: an intermediate element with `height:
   * auto` is exactly what stops `h-full` from resolving to anything.
   */
  const rootClass = `relative flex h-full shrink-0 w-64 sm:w-72 xl:w-96 flex-col group rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gray-900 ${
    product.isMock ? 'cursor-default opacity-70' : 'cursor-pointer'
  }`;

  const body = (
    <>
      <div className="relative h-96 shrink-0 overflow-hidden rounded-2xl bg-gray-100 xl:h-146">
        {/* Front Image */}
        <Image
          src={product.frontImage || product.image}
          alt={product.name}
          fill
          className={`object-cover object-center transition-opacity duration-300 ${
            isHovered ? 'opacity-0' : 'opacity-100'
          }`}
          sizes="(max-width: 640px) 256px, (max-width: 768px) 288px, 384px"
        />
        {/* Back Image (shown on hover) */}
        {product.backImage && (
          <Image
            src={product.backImage}
            alt={`${product.name} - back view`}
            fill
            className={`object-cover object-center transition-opacity duration-300 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
            sizes="(max-width: 640px) 256px, (max-width: 768px) 288px, 384px"
          />
        )}
      </div>

      {/* Name and price, centre-aligned as the strip has always been. */}
      <div className="flex flex-1 flex-col px-2 pt-4">
        <h3 className="text-center text-sm leading-snug font-medium text-gray-900 sm:text-base xl:text-lg">
          {product.name}
        </h3>

        {price && (
          <p className="mt-2 flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1">
            <span className="text-sm font-semibold text-gray-900 sm:text-base">
              {price.display}
            </span>
            {/*
             * The struck-through original is only ever rendered when `resolvePrice` has said
             * the sale is genuine, so this never shows two identical numbers with one crossed
             * out. `aria-label` because a line-through is a visual convention a screen reader
             * does not announce, and "₹10,000" read out beside "₹6,000" is misleading.
             */}
            {price.compareAt && (
              <span
                aria-label={`Was ${price.compareAt}`}
                className="text-xs text-gray-500 line-through sm:text-sm"
              >
                {price.compareAt}
              </span>
            )}
          </p>
        )}
      </div>
    </>
  );

  // A placeholder is not a product and has nowhere to link to.
  if (product.isMock) {
    return (
      <div
        className={rootClass}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {body}
      </div>
    );
  }

  return (
    <Link
      href={`/product/${product.id}`}
      className={rootClass}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {body}
    </Link>
  );
};

const SkeletonCard = () => (
  <div className="relative flex h-full shrink-0 w-64 flex-col sm:w-72 xl:w-96">
    <div className="h-96 shrink-0 animate-pulse overflow-hidden rounded-2xl bg-gray-200 xl:h-146" />
    <div className="flex flex-1 flex-col items-center px-2 pt-4">
      <div className="h-5 w-3/4 animate-pulse rounded bg-gray-200" />
      {/* The price line is part of the skeleton too, or the strip jumps when the real cards
          land and each one grows a second line. */}
      <div className="mt-2 h-4 w-1/3 animate-pulse rounded bg-gray-200" />
    </div>
  </div>
);

export default function ShopByStyle() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [products, setProducts] = useState<StyleProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/homepage-sections');

        if (!response.ok) {
          throw new Error('Failed to fetch homepage sections');
        }

        const data: HomepageSectionsResponse = await response.json();

        // Transform database products and add frontImage/backImage
        const dbProducts: StyleProduct[] = (data.shopByStyle || []).map(p => ({
          ...p,
          // The route already coerces, but the shared interface still types this
          // `number | string` and the price line arithmetic needs a number.
          price: Number(p.price),
          frontImage: p.image,
          backImage: p.photos?.[1] || p.image, // Use second photo as back image if available
          isMock: false,
        }));

        // Fill with mock data if we have fewer than 4 items
        const remaining = 4 - dbProducts.length;
        if (remaining > 0) {
          setProducts([...dbProducts, ...mockStyleProducts.slice(0, remaining)]);
        } else {
          setProducts(dbProducts.slice(0, 6)); // Show up to 6 items (one per category)
        }
      } catch (error) {
        console.error('Error fetching shop by style:', error);
        // Use all mock data on error
        setProducts(mockStyleProducts);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -400 : 400;
      scrollContainerRef.current.scrollBy({
        left: scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <section className="bg-white py-14 md:py-20">
      <div className="w-full">
        {/* Section Header */}
        <div className="mb-8 xl:mb-12 px-4">
          <h2 className="font-serif font-normal text-4xl sm:text-5xl xl:text-6xl text-gray-900 text-center">
            Shop By Style
          </h2>
        </div>

        {/* Scroll Container with Navigation Buttons */}
        <div className="relative w-full min-w-0">
          {/* Left Scroll Button */}
          <button
            onClick={() => scroll('left')}
            className="absolute left-2 sm:left-4 xl:left-8 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg rounded-full p-2 sm:p-3 transition-all hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-800" aria-hidden="true" />
          </button>

          {/* Right Scroll Button */}
          <button
            onClick={() => scroll('right')}
            className="absolute right-2 sm:right-4 xl:right-8 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg rounded-full p-2 sm:p-3 transition-all hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-gray-800" aria-hidden="true" />
          </button>

          {/* Horizontal Scrolling Container */}
          <div ref={scrollContainerRef} className="overflow-x-auto scrollbar-hide">
            {isLoading ? (
              <div className="flex items-stretch gap-4 sm:gap-6 xl:gap-8 pb-4 px-6 sm:px-8 xl:px-20 snap-x snap-mandatory w-fit mx-auto">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="snap-center">
                    <SkeletonCard />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-stretch gap-4 sm:gap-6 xl:gap-8 pb-4 px-6 sm:px-8 xl:px-20 snap-x snap-mandatory w-fit mx-auto">
                {products.map(product => (
                  <div key={product.id} className="snap-center">
                    <StyleCard product={product} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
