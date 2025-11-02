'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  price: string;
  image: string;
}

const products: Product[] = [
  {
    id: 1,
    name: 'Royal Plum Banarasi Silk Lehanga Set',
    price: 'Rs. 84,999.00',
    image: '/photo.jpg',
  },
  {
    id: 2,
    name: 'Royal Purple & Silver Banarasi Lehanga Set',
    price: 'Rs. 57,999.00',
    image: '/photo.jpg',
  },
  {
    id: 3,
    name: 'Banarasi Bandhani Khaddi Georgette Saree with Gold Zari Jaal',
    price: 'Rs. 57,999.00',
    image: '/photo.jpg',
  },
  {
    id: 4,
    name: 'Multicolored Banarasi Weaved Lehanga Set with Thread Embroidered Blouse',
    price: 'Rs. 39,999.00',
    image: '/photo.jpg',
  },
  {
    id: 5,
    name: 'Rajsi Baaraat – Heritage Doli Motif',
    price: 'Rs. 45,999.00',
    image: '/photo.jpg',
  },
  {
    id: 6,
    name: 'Royal Purple Hand Embroidered',
    price: 'Rs. 52,999.00',
    image: '/photo.jpg',
  },
];

const YouMayAlsoLike = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      const newScrollLeft =
        scrollContainerRef.current.scrollLeft +
        (direction === 'left' ? -scrollAmount : scrollAmount);
      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth',
      });
    }
  };

  return (
    <section className="py-16 md:py-24 font-poppins">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif text-center mb-12">
          You may also like
        </h2>

        {/* Mobile: Horizontal scroll with arrows, Desktop: Grid */}
        <div className="relative">
          {/* Scroll Arrows - Only visible on mobile */}
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 transition md:hidden"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 transition md:hidden"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          <div
            ref={scrollContainerRef}
            className="overflow-x-auto scrollbar-hide"
          >
            <div className="flex gap-4">
              {products.map(product => (
                <Link
                  key={product.id}
                  href="/product"
                  className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow flex-shrink-0 w-[280px]"
                >
                  <div className="relative aspect-[3/4] overflow-hidden bg-gray-100">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm md:text-base font-medium mb-1 line-clamp-2 min-h-[2.5rem]">
                      {product.name}
                    </h3>
                    <p className="text-sm md:text-base font-semibold">From {product.price}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default YouMayAlsoLike;
