'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface ExploreProduct {
  id: number;
  name: string;
  price: string;
  image: string;
  backImage: string;
}

const ProductCard = ({ product }: { product: ExploreProduct }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="shrink-0 w-64 md:w-72 rounded-2xl overflow-hidden group shadow-sm hover:shadow-md transition-all duration-300 snap-start"
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
          sizes="(max-width: 768px) 256px, 288px"
        />
        {/* Back Image (shown on hover) */}
        <Image
          src={product.backImage}
          alt={`${product.name} - back view`}
          fill
          className={`object-cover transition-opacity duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
          sizes="(max-width: 768px) 256px, 288px"
        />
      </div>
      <div className="p-4 bg-white">
        <h3 className="font-medium text-gray-900 truncate">{product.name}</h3>
        <p className="text-sm text-gray-600">{product.price}</p>
      </div>
    </div>
  );
};

const Explore = () => {
  const products: ExploreProduct[] = [
    {
      id: 1,
      name: 'Haldi & Kumkum Dress',
      price: 'Auspicious elegance in every thread. Draped in the sacred hues of Haldi and Kumkum',
      image: '/collection/1.png',
      backImage: '/collection/1b.png',
    },
    {
      id: 2,
      name: 'The Rajwadi Brocade',
      price:
        'Rajwadi also means Royal and Brocade highlights the magnificent woven fabric',
      image: '/collection/2.png',
      backImage: '/collection/2b.png',
    },
    {
      id: 3,
      name: 'Neelam Frill Lehenga',
      price: 'Neelam for the rich sapphire blue top, paired with Frill for the modern, layered skirt',
      image: '/collection/3.png',
      backImage: '/collection/3b.png',
    },
    {
      id: 4,
      name: 'The Royal Cascade Lehenga',
      price:
        'Royal for that rich sapphire-blue choli, and Cascade to describe the beautiful, waterfall-like drape of the skirt.',
      image: '/collection/4.png',
      backImage: '/collection/4b.png',
    },
  ];

  return (
    <section className="bg-white">
      <div className="flex flex-col md:flex-row md:px-8 xl:px-20 relative py-10 md:pt-16">
        {/* Left Section (Heading) */}
        <aside className="w-full md:w-1/3 px-6 md:px-8 xl:px-12 mb-8 md:mb-0">
          <h2 className="text-4xl md:text-5xl font-serif font-light text-black mb-6 md:mb-12">
            Explore Our Collection
          </h2>

          <p className="text-gray-700 text-sm md:text-base leading-relaxed">
            Discover our exquisite range of sarees, lehengas, and Indo-western pieces — designed for
            timeless elegance and contemporary style.
          </p>

          <div className="mt-8">
            <Button
              variant="outline"
              className="rounded-full px-8 py-2 text-base font-medium hover:bg-gray-900 hover:text-white transition-colors"
            >
              View All
            </Button>
          </div>
        </aside>

        {/* Right Section */}
        <div className="flex-1 overflow-x-hidden px-4 md:px-4 xl:px-8 xl:pr-12">
          <div className="flex gap-6 pb-4 snap-x snap-mandatory overflow-x-auto max-w-5xl mx-auto">
            {products.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Explore;
