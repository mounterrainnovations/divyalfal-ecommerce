'use client';

import Image from 'next/image';
import Link from 'next/link';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { HomepageProduct } from '@/lib/common/product-interfaces';

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
import { useState, useEffect } from 'react';
import { HomepageProduct } from '@/lib/common/product-interfaces';

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
const ProductCard = ({ product }: { product: HomepageProduct }) => {
  const [isHovered, setIsHovered] = useState(false);

  const cardContent = (
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

        // Transform database products and add backImage
        const dbProducts = (data.exploreCollection || []).map((p: any) => ({
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
        console.error('Error fetching explore collection:', error);
        // Use all mock data on error
        setProducts(mockProducts);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);
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

        // Transform database products and add backImage
        const dbProducts = (data.exploreCollection || []).map((p: any) => ({
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
        console.error('Error fetching explore collection:', error);
        // Use all mock data on error
        setProducts(mockProducts);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <section className="bg-white">
      <div className="flex flex-col md:flex-row md:px-8 xl:px-20 relative py-10 md:pt-16">
        {/* Left Section (Heading) */}
        <aside className="w-full md:w-1/3 px-6 md:px-8 xl:px-12 mb-8 md:mb-0">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-light text-black mb-6 md:mb-12">
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
          {isLoading ? (
            <div className="flex gap-4 sm:gap-6 pb-4 snap-x snap-mandatory overflow-x-auto max-w-5xl mx-auto scrollbar-hide">
              {[1, 2, 3, 4].map(i => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : (
            <div className="flex gap-4 sm:gap-6 pb-4 snap-x snap-mandatory overflow-x-auto max-w-5xl mx-auto scrollbar-hide">
              {products.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Explore;
