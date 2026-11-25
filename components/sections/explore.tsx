'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { HomepageProduct } from '@/lib/common/product-interfaces';
import { useCollections } from '@/lib/hooks/useCollections';
import { visibleCollections, type Collection } from '@/lib/content/collections';
import { SIZES } from '@/components/sections/section-shell';

/**
 * "Explore our collection" — the strip that shows what the collections *are*.
 *
 * ## Why this section has two behaviours
 *
 * It used to show four individual dresses, and the owner's complaint was exactly that: the
 * heading says "collection", the strip showed garments, and there was no way to see what the
 * collections were or what was inside one. The category strip below it already does the right
 * thing — a picture, a name, a click through to the contents — so this section now does the
 * same with collections, and `/collections/[slug]` is where the garments are.
 *
 * **But there are no default collections, so the old behaviour is the fallback and that is
 * deliberate.** A collection cannot be derived from the catalogue: "Bridal" is a set of
 * garments the shop chooses, not a query, so there is nothing truthful to show until the owner
 * has curated one in the portal (`/dashboard/collections`). Inventing three collections with
 * borrowed copy and a stock photograph would put words on a real shop's homepage that nobody
 * there wrote. The alternative — rendering an empty strip under the heading — would be a
 * visible regression on the live site the moment this deploys.
 *
 * So: **if any visible collection exists, the strip shows collections. If none does, the strip
 * keeps showing the garments it shows today, unchanged, down to the placeholder cards.** The
 * section flips over by itself the moment the first collection is saved, and nothing has to be
 * deployed for it to happen.
 *
 * `ready` from `useCollections` is why the two paths do not flash. The hook's default is an
 * empty list, and an empty list is not "nothing to draw" here, it is "draw the other thing" —
 * so committing to a layout before the fetch has answered would show the garment strip for a
 * frame on every shop that has collections. The skeleton covers the wait, which is the state
 * this section was already in while it fetched its products.
 */

interface HomepageSectionsResponse {
  exploreCollection?: Array<HomepageProduct & { photos?: string[] }>;
}

// Mock fallback data
const mockProducts: HomepageProduct[] = [
  {
    id: 'mock-1',
    name: 'Haldi & Kumkum Dress',
    price: 'Auspicious elegance in every thread. Draped in the sacred hues of Haldi and Kumkum',
    image: '/collection/1.png',
    backImage: '/collection/1b.png',
    isMock: true,
  },
  {
    id: 'mock-2',
    name: 'The Rajwadi Brocade',
    price: 'Rajwadi also means Royal and Brocade highlights the magnificent woven fabric',
    image: '/collection/2.png',
    backImage: '/collection/2b.png',
    isMock: true,
  },
  {
    id: 'mock-3',
    name: 'Neelam Frill Lehenga',
    price: 'Neelam for the rich sapphire blue top, paired with Frill for the modern, layered skirt',
    image: '/collection/3.png',
    backImage: '/collection/3b.png',
    isMock: true,
  },
  {
    id: 'mock-4',
    name: 'The Royal Cascade Lehenga',
    price:
      'Royal for that rich sapphire-blue choli, and Cascade to describe the beautiful, waterfall-like drape of the skirt.',
    image: '/collection/4.png',
    backImage: '/collection/4b.png',
    isMock: true,
  },
];

const ProductCard = ({ product }: { product: HomepageProduct }) => {
  const [isHovered, setIsHovered] = useState(false);

  const cardContent = (
    <div
      className={`shrink-0 w-[280px] sm:w-64 md:w-72 rounded-2xl overflow-hidden group shadow-sm hover:shadow-md transition-all duration-300 snap-start ${product.isMock ? 'cursor-default opacity-70' : 'cursor-pointer'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative aspect-3/4 bg-gray-50">
        {/* Front Image */}
        <Image
          src={product.image}
          alt={product.name}
          fill
          className={`object-cover transition-opacity duration-300 ${
            isHovered ? 'opacity-0' : 'opacity-100'
          }`}
          sizes="(max-width: 640px) 280px, (max-width: 768px) 256px, 288px"
        />
        {/* Back Image (shown on hover) */}
        {product.backImage && (
          <Image
            src={product.backImage}
            alt={`${product.name} - back view`}
            fill
            className={`object-cover transition-opacity duration-300 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
            sizes="(max-width: 640px) 280px, (max-width: 768px) 256px, 288px"
          />
        )}
      </div>
      <div className="p-4 bg-white">
        <h3 className="font-medium text-gray-900 truncate text-sm sm:text-base">{product.name}</h3>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">
          {typeof product.price === 'string'
            ? product.price
            : `₹${product.price.toLocaleString('en-IN')}`}
        </p>
      </div>
    </div>
  );

  // Wrap in Link only if not a mock item
  if (product.isMock) {
    return cardContent;
  }

  return <Link href={`/product/${product.id}`}>{cardContent}</Link>;
};

/**
 * One collection in the strip: its photograph, its name, and the click into it.
 *
 * The tile is the category strip's language at card scale — a picture, a name centred under it,
 * nothing else competing for the click — rather than the product card's, because this is a
 * grouping and not a garment: there is no price to show and no second photograph to reveal on
 * hover. It keeps the product strip's card geometry (the same widths and the same 3:4 crop) so
 * the section's shape on the page does not change when it flips between the two.
 *
 * A collection with no photograph gets an empty frame, not a borrowed one. The portal says what
 * it is for, and an obviously unfinished tile is better than one dressed in someone else's
 * picture.
 */
const CollectionTile = ({ collection }: { collection: Collection }) => (
  <Link
    href={`/collections/${collection.slug}`}
    className="shrink-0 w-[280px] sm:w-64 md:w-72 snap-start rounded-lg text-center transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gray-900"
  >
    <div className="relative aspect-3/4 overflow-hidden rounded-2xl bg-gray-100">
      {collection.image ? (
        <Image
          src={collection.image}
          alt={collection.name}
          fill
          sizes={SIZES.card}
          className="object-cover"
        />
      ) : null}
    </div>
    <h3 className="mt-3 font-serif text-lg text-gray-900 sm:text-xl">{collection.name}</h3>
    {collection.blurb ? (
      <p className="mt-1 line-clamp-2 text-xs text-gray-600 sm:text-sm">{collection.blurb}</p>
    ) : null}
  </Link>
);

const SkeletonCard = () => (
  <div className="shrink-0 w-[280px] sm:w-64 md:w-72 rounded-2xl overflow-hidden shadow-sm snap-start">
    <div className="relative aspect-3/4 bg-gray-200 animate-pulse" />
    <div className="p-4 bg-white space-y-2">
      <div className="h-5 bg-gray-200 rounded animate-pulse w-3/4" />
      <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
    </div>
  </div>
);

const Explore = () => {
  const { collections, ready } = useCollections();
  const [products, setProducts] = useState<HomepageProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const curated = visibleCollections(collections);
  const showCollections = ready && curated.length > 0;

  useEffect(() => {
    // Nothing to fetch until we know which strip this is, and nothing to fetch at all when the
    // shop has collections: the garments are only the fallback, and requesting them anyway
    // would be a round trip on every homepage load for a result that is thrown away.
    if (!ready || curated.length > 0) return;

    const controller = new AbortController();

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/homepage-sections', { signal: controller.signal });

        if (!response.ok) {
          throw new Error('Failed to fetch homepage sections');
        }

        const data: HomepageSectionsResponse = await response.json();

        // Transform database products and add backImage
        const dbProducts = (data.exploreCollection || []).map(p => ({
          ...p,
          backImage: p.photos?.[1] || p.image, // Use second photo as back image if available
          isMock: false,
        }));

        // Fill with mock data if we have fewer than 4 items
        const remaining = 4 - dbProducts.length;
        if (remaining > 0) {
          setProducts([...dbProducts, ...mockProducts.slice(0, remaining)]);
        } else {
          setProducts(dbProducts.slice(0, 4));
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error('Error fetching explore collection:', error);
        // Use all mock data on error
        setProducts(mockProducts);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    fetchData();
    return () => controller.abort();
  }, [ready, curated.length]);

  // The skeleton covers both waits: the collections answering, and — only when there are none
  // — the garments that stand in for them.
  const waiting = !ready || (!showCollections && isLoading);

  return (
    <section className="bg-white py-14 md:py-20">
      <div className="flex flex-col md:flex-row md:px-8 xl:px-20 relative py-10 md:pt-16">
        {/* Left Section (Heading) */}
        <aside className="w-full md:w-1/3 px-6 md:px-8 xl:px-12 mb-8 md:mb-0">
          <h2 className="font-serif font-normal text-4xl sm:text-5xl xl:text-6xl text-gray-900 mb-8 md:mb-10">
            Explore Our Collection
          </h2>

          <p className="text-gray-700 text-sm sm:text-base leading-relaxed">
            Discover our exquisite range of sarees, lehengas, and Indo-western pieces — designed for
            timeless elegance and contemporary style.
          </p>

          <div className="mt-6 sm:mt-8">
            <Link href="/products">
              <Button
                variant="outline"
                className="rounded-full px-6 sm:px-8 py-2.5 sm:py-2 text-sm sm:text-base font-medium hover:bg-gray-900 hover:text-white transition-colors min-h-[44px]"
              >
                View All
              </Button>
            </Link>
          </div>
        </aside>

        {/* Right Section */}
        <div className="flex-1 overflow-x-hidden px-6 md:px-4 xl:px-8 xl:pr-12">
          <div className="flex gap-4 sm:gap-6 pb-4 snap-x snap-mandatory overflow-x-auto max-w-5xl mx-auto scrollbar-hide">
            {waiting
              ? [1, 2, 3, 4].map(i => <SkeletonCard key={i} />)
              : showCollections
                ? curated.map(collection => (
                    <CollectionTile key={collection.id} collection={collection} />
                  ))
                : products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Explore;
