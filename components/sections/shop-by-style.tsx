'use client';

import Image from 'next/image';
import { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface StyleProduct {
  id: number;
  name: string;
  frontImage: string;
  backImage: string;
}

const styleProducts: StyleProduct[] = [
  {
    id: 1,
    name: 'Raw Silk Off White Printed with Sequence Detailing',
    frontImage: '/shop by style/f1.png',
    backImage: '/shop by style/b1.png',
  },
  {
    id: 2,
    name: 'Pure Cotton Block Print Ajragh Bagh',
    frontImage: '/shop by style/f2.png',
    backImage: '/shop by style/b2.png',
  },
  {
    id: 3,
    name: 'Banarasi Anarkali Suit',
    frontImage: '/shop by style/f3.png',
    backImage: '/shop by style/b3.png',
  },
  {
    id: 4,
    name: 'Peach and off white Banarasi Angrakha Anarkarli',
    frontImage: '/shop by style/f4.png',
    backImage: '/shop by style/b4.png',
  },
];

const StyleCard = ({ product }: { product: StyleProduct }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative shrink-0 w-72 xl:w-96 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="rounded-2xl overflow-hidden bg-gray-100 h-96 xl:h-146 relative">
        {/* Front Image */}
        <Image
          src={product.frontImage}
          alt={product.name}
          fill
          className={`object-cover object-center transition-opacity duration-300 ${
            isHovered ? 'opacity-0' : 'opacity-100'
          }`}
          sizes="(max-width: 768px) 288px, 384px"
        />
        {/* Back Image (shown on hover) */}
        <Image
          src={product.backImage}
          alt={`${product.name} - back view`}
          fill
          className={`object-cover object-center transition-opacity duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
          sizes="(max-width: 768px) 288px, 384px"
        />
      </div>

      {/* Product Name - Center Aligned */}
      <h3 className="text-base xl:text-lg font-medium text-gray-900 mt-4 leading-snug text-center">
        {product.name}
      </h3>
    </div>
  );
};

export default function ShopByStyle() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
          <div
            ref={scrollContainerRef}
            className="overflow-x-auto scrollbar-hide"
          >
            <div className="flex gap-6 xl:gap-8 pb-4 px-4 xl:px-20 snap-x snap-mandatory w-fit mx-auto">
              {styleProducts.map(product => (
                <div key={product.id} className="snap-center">
                  <StyleCard product={product} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
