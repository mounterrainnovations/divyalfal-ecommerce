'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { HomepageProduct } from '@/lib/common/product-interfaces';

// Mock fallback data
const mockStyleProducts: HomepageProduct[] = [
  {
    id: 'mock-1',
    name: 'Raw Silk Off White Printed with Sequence Detailing',
    frontImage: '/shop by style/f1.png',
    backImage: '/shop by style/b1.png',
    image: '/shop by style/f1.png',
    price: 0,
    isMock: true,
  },
  {
    id: 'mock-2',
    name: 'Pure Cotton Block Print Ajragh Bagh',
    frontImage: '/shop by style/f2.png',
    backImage: '/shop by style/b2.png',
    image: '/shop by style/f2.png',
    price: 0,
    isMock: true,
  },
  {
    id: 'mock-3',
    name: 'Banarasi Anarkali Suit',
    frontImage: '/shop by style/f3.png',
    backImage: '/shop by style/b3.png',
    image: '/shop by style/f3.png',
    price: 0,
    isMock: true,
  },
  {
    id: 'mock-4',
    name: 'Peach and off white Banarasi Angrakha Anarkarli',
    frontImage: '/shop by style/f4.png',
    backImage: '/shop by style/b4.png',
    image: '/shop by style/f4.png',
    price: 0,
    isMock: true,
  },
];

const StyleCard = ({ product }: { product: HomepageProduct }) => {
  const [isHovered, setIsHovered] = useState(false);

  const cardContent = (
    <div
      className={`relative shrink-0 w-72 xl:w-96 group ${product.isMock ? 'cursor-default opacity-70' : 'cursor-pointer'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="rounded-2xl overflow-hidden bg-gray-100 h-96 xl:h-146 relative">
        {/* Front Image */}
        <Image
          src={product.frontImage || product.image}
          alt={product.name}
          fill
          className={`object-cover object-center transition-opacity duration-300 ${
            isHovered ? 'opacity-0' : 'opacity-100'
          }`}
          sizes="(max-width: 768px) 288px, 384px"
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
            sizes="(max-width: 768px) 288px, 384px"
          />
        )}
      </div>

      {/* Product Name - Center Aligned */}
      <h3 className="text-base xl:text-lg font-medium text-gray-900 mt-4 leading-snug text-center">
        {product.name}
      </h3>
    </div>
  );

  // Wrap in Link only if not a mock item
  if (product.isMock) {
    return cardContent;
  }

  return <Link href={`/product/${product.id}`}>{cardContent}</Link>;
};

const SkeletonCard = () => (
  <div className="relative shrink-0 w-72 xl:w-96">
    <div className="rounded-2xl overflow-hidden bg-gray-200 h-96 xl:h-146 animate-pulse" />
    <div className="mt-4 h-5 bg-gray-200 rounded animate-pulse w-3/4 mx-auto" />
  </div>
);

export default function ShopByStyle() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [products, setProducts] = useState<HomepageProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/homepage-sections');

        if (!response.ok) {
          throw new Error('Failed to fetch homepage sections');
        }

        const data = await response.json();

        // Transform database products and add frontImage/backImage
        const dbProducts = (data.shopByStyle || []).map((p: any) => ({
          ...p,
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
    <section className="bg-white py-12 xl:py-20">
      <div className="w-full">
        {/* Section Header */}
        <div className="mb-8 xl:mb-12">
          <h2 className="text-3xl xl:text-5xl font-serif font-light text-center text-black">
            Shop By Style
          </h2>
        </div>

        {/* Scroll Container with Navigation Buttons */}
        <div className="relative w-full">
          {/* Left Scroll Button */}
          <button
            onClick={() => scroll('left')}
            className="absolute left-4 xl:left-8 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg rounded-full p-3 transition-all hover:scale-110"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-6 h-6 text-gray-800" />
          </button>

          {/* Right Scroll Button */}
          <button
            onClick={() => scroll('right')}
            className="absolute right-4 xl:right-8 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg rounded-full p-3 transition-all hover:scale-110"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-6 h-6 text-gray-800" />
          </button>

          {/* Horizontal Scrolling Container */}
          <div ref={scrollContainerRef} className="overflow-x-auto scrollbar-hide">
            {isLoading ? (
              <div className="flex gap-6 xl:gap-8 pb-4 px-4 xl:px-20 snap-x snap-mandatory w-fit mx-auto">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="snap-center">
                    <SkeletonCard />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex gap-6 xl:gap-8 pb-4 px-4 xl:px-20 snap-x snap-mandatory w-fit mx-auto">
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
