'use client';

import { ShoppingBag } from 'lucide-react';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatDisplayPrice, HomepageProduct } from '@/lib/common/product-interfaces';

// Mock fallback data
const mockBestSellers: HomepageProduct[] = [
  {
    id: 'mock-1',
    name: 'Red Velvet Saree Border with...',
    price: 10999,
    image: '/mostrec/1.png',
    thumbnail: '/mostrec/1.png',
    bgColor: 'bg-amber-100',
    isMock: true,
  },
  {
    id: 'mock-2',
    name: 'Midnight Brown Indo Lehenga Set...',
    price: 21999,
    image: '/mostrec/2.png',
    thumbnail: '/mostrec/2.png',
    bgColor: 'bg-yellow-100',
    isMock: true,
  },
  {
    id: 'mock-3',
    name: 'White Silk Kurti with Long...',
    price: 60000,
    image: '/mostrec/3.png',
    thumbnail: '/mostrec/3.png',
    bgColor: 'bg-purple-100',
    isMock: true,
  },
  {
    id: 'mock-4',
    name: 'Indo Western Lehenga Set...',
    price: 12000,
    image: '/mostrec/4.png',
    thumbnail: '/mostrec/4.png',
    bgColor: 'bg-yellow-50',
    isMock: true,
  },
];

const mockFreshArrivals: HomepageProduct[] = [
  {
    id: 'mock-5',
    name: 'Emerald Green Silk Saree...',
    price: 45999,
    image: '/mocks/mock_hero_desktop.jpg',
    thumbnail: '/mocks/mock_mostRecommended_common.jpg',
    bgColor: 'bg-green-100',
    isMock: true,
  },
  {
    id: 'mock-6',
    name: 'Rose Gold Lehenga Choli...',
    price: 85000,
    image: '/mocks/mock_mostRecommended_common.jpg',
    thumbnail: '/mocks/mock_mostRecommended_common.jpg',
    bgColor: 'bg-pink-100',
    isMock: true,
  },
  {
    id: 'mock-7',
    name: 'Coral Silk Anarkali...',
    price: 55000,
    image: '/mocks/mock_mostRecommended_common.jpg',
    thumbnail: '/mocks/mock_mostRecommended_common.jpg',
    bgColor: 'bg-orange-100',
    isMock: true,
  },
  {
    id: 'mock-8',
    name: 'Navy Blue Banarasi Saree...',
    price: 72000,
    image: '/mocks/mock_mostRecommended_common.jpg',
    thumbnail: '/mocks/mock_mostRecommended_common.jpg',
    bgColor: 'bg-blue-100',
    isMock: true,
  },
];

const bgColors = ['bg-amber-100', 'bg-yellow-100', 'bg-purple-100', 'bg-yellow-50'];

const ProductCard = ({ product }: { product: HomepageProduct }) => {
  const cardContent = (
    <div
      className={`relative shrink-0 w-72 xl:w-md group ${product.isMock ? 'cursor-default' : 'cursor-pointer'}`}
    >
      <div
        className={`${product.bgColor || 'bg-gray-100'} rounded-3xl overflow-hidden h-96 xl:h-146 flex items-center justify-center
                    transition-transform duration-300 ${product.isMock ? '' : 'group-hover:scale-[1.02]'} ${product.isMock ? 'opacity-70' : ''}`}
      >
        <Image
          src={product.image}
          alt={product.name}
          width={400}
          height={500}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Floating card */}
      <div className="absolute bottom-4 left-4 right-4 bg-white rounded-2xl p-4 flex items-center gap-4 shadow-lg">
        <Image
          src={product.thumbnail || product.image}
          alt={product.name}
          width={64}
          height={64}
          className="w-16 h-16 rounded-lg object-cover shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
          <p className="text-base font-bold text-gray-900 mt-1">
            From {formatDisplayPrice(product.price)}
          </p>
        </div>
        <button
          aria-label="Add to Cart"
          className="shrink-0 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
          disabled={product.isMock}
        >
          <ShoppingBag className="w-5 h-5 text-gray-800" />
        </button>
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
  <div className="relative shrink-0 w-72 xl:w-md">
    <div className="bg-gray-200 rounded-3xl overflow-hidden h-96 xl:h-146 animate-pulse" />
    <div className="absolute bottom-4 left-4 right-4 bg-white rounded-2xl p-4 flex items-center gap-4 shadow-lg">
      <div className="w-16 h-16 rounded-lg bg-gray-200 animate-pulse shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
        <div className="h-5 bg-gray-200 rounded animate-pulse w-1/2" />
      </div>
      <div className="shrink-0 p-2 bg-gray-100 rounded-full">
        <ShoppingBag className="w-5 h-5 text-gray-400" />
      </div>
    </div>
  </div>
);

export default function MostRecommended() {
  const [activeSection, setActiveSection] = useState<'bestSellers' | 'freshArrivals'>(
    'bestSellers'
  );
  const [bestSellers, setBestSellers] = useState<HomepageProduct[]>([]);
  const [freshArrivals, setFreshArrivals] = useState<HomepageProduct[]>([]);
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

        // Transform database products and add bgColor
        const transformProducts = (products: any[], mockData: HomepageProduct[]) => {
          const dbProducts = products.map((p, index) => ({
            ...p,
            thumbnail: p.image,
            bgColor: bgColors[index % bgColors.length],
            isMock: false,
          }));

          // Fill with mock data if we have fewer than 4 items
          const remaining = 4 - dbProducts.length;
          if (remaining > 0) {
            return [...dbProducts, ...mockData.slice(0, remaining)];
          }

          return dbProducts.slice(0, 4);
        };

        setBestSellers(transformProducts(data.bestSellers || [], mockBestSellers));
        setFreshArrivals(transformProducts(data.freshArrivals || [], mockFreshArrivals));
      } catch (error) {
        console.error('Error fetching homepage sections:', error);
        // Use all mock data on error
        setBestSellers(mockBestSellers);
        setFreshArrivals(mockFreshArrivals);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const products = activeSection === 'bestSellers' ? bestSellers : freshArrivals;

  // Main Layout
  return (
    <section className="bg-white">
      <div className="flex flex-col xl:flex-row xl:px-20 relative">
        {/* Left Section */}
        <aside
          className="w-full xl:w-1/3 px-6 xl:px-12 py-10 xl:py-16 border-b xl:border-b-0 border-gray-200
                          xl:sticky xl:top-24 xl:self-start h-fit"
        >
          <h2 className="text-4xl xl:text-5xl font-serif font-light mb-10 xl:mb-16 text-black">
            Most Recommended
          </h2>

          <div className="flex xl:gap-4 gap-0">
            {/* Vertical bar (desktop only) */}
            <div className="hidden xl:block relative w-1 h-56">
              <div className="absolute inset-0 bg-gray-300" />
              <div
                className={`absolute left-0 w-1 bg-black transition-all duration-300 ${
                  activeSection === 'bestSellers' ? 'top-0 h-28' : 'top-28 h-28'
                }`}
              />
            </div>

            {/* Section buttons */}
            <div className="flex-1 flex xl:flex-col gap-8 xl:gap-0">
              <button
                onClick={() => setActiveSection('bestSellers')}
                className={`text-left pb-4 border-b-2 xl:border-b-0 transition-colors ${
                  activeSection === 'bestSellers' ? 'border-black' : 'border-gray-200'
                }`}
              >
                <h3 className="text-lg xl:text-2xl font-serif font-light text-black">
                  Best Sellers
                </h3>
                <p className="text-xs xl:text-sm text-gray-700 mt-2 xl:mt-4">
                  Discover our top-selling styles, loved by customers for their elegance and
                  quality. Shop from our most popular collections.
                </p>
              </button>

              <button
                onClick={() => setActiveSection('freshArrivals')}
                className={`text-left pb-4 xl:pb-0 border-b-2 xl:border-b-0 transition-colors ${
                  activeSection === 'freshArrivals' ? 'border-black' : 'border-gray-200'
                }`}
              >
                <h3 className="text-lg xl:text-2xl font-serif font-light text-black">
                  Fresh Arrivals
                </h3>

                <p className="text-xs xl:text-sm text-gray-700 mt-2 xl:mt-4">
                  Explore our latest collection of stunning pieces just added to our store —
                  featuring the newest designs and trends.
                </p>
              </button>
            </div>
          </div>
        </aside>

        {/* Right Section */}
        <div className="flex-1 px-4 xl:px-8 py-8 xl:py-16 overflow-x-auto xl:overflow-x-visible">
          {isLoading ? (
            <>
              {/* Mobile - Horizontal Skeleton */}
              <div className="flex xl:hidden gap-6 pb-4 overflow-x-auto snap-x snap-mandatory">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="snap-center">
                    <SkeletonCard />
                  </div>
                ))}
              </div>

              {/* Desktop - Masonry Grid Skeleton */}
              <div className="hidden xl:grid grid-cols-2 gap-8 max-w-5xl mx-auto">
                <div className="flex flex-col gap-8">
                  <SkeletonCard />
                  <SkeletonCard />
                </div>
                <div className="flex flex-col gap-8 pt-32">
                  <SkeletonCard />
                  <SkeletonCard />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Mobile - Horizontal */}
              <div className="flex xl:hidden gap-6 pb-4 overflow-x-auto snap-x snap-mandatory">
                {products.map(p => (
                  <div key={p.id} className="snap-center">
                    <ProductCard product={p} />
                  </div>
                ))}
              </div>

              {/* Desktop - Masonry Grid */}
              <div className="hidden xl:grid grid-cols-2 gap-8 max-w-5xl mx-auto">
                <div className="flex flex-col gap-8">
                  <ProductCard product={products[0]} />
                  <ProductCard product={products[2]} />
                </div>
                <div className="flex flex-col gap-8 pt-32">
                  <ProductCard product={products[1]} />
                  <ProductCard product={products[3]} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
