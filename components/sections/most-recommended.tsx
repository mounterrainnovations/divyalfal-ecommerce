'use client';

import { ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import Image from 'next/image';

interface MostRecommendedProduct {
  id: number;
  name: string;
  price: string;
  image: string;
  thumbnail: string;
  bgColor: string;
}

// Product Data
const bestSellers: MostRecommendedProduct[] = [
  {
    id: 1,
    name: 'Ivory Draped Saree Set with...',
    price: 'Rs. 30,999.00',
    image: '/mocks/mock_mostRecommended_common.jpg',
    thumbnail: '/mocks/mock_mostRecommended_common.jpg',
    bgColor: 'bg-amber-100',
  },
  {
    id: 2,
    name: 'Midnight Blue Indo-Western Set...',
    price: 'Rs. 21,999.00',
    image: '/mocks/mock_mostRecommended_common.jpg',
    thumbnail: '/mocks/mock_mostRecommended_common.jpg',
    bgColor: 'bg-yellow-100',
  },
  {
    id: 3,
    name: 'Regal Purple Banarasi Silk Saree...',
    price: 'Rs. 60,000.00',
    image: '/mocks/mock_mostRecommended_common.jpg',
    thumbnail: '/mocks/mock_mostRecommended_common.jpg',
    bgColor: 'bg-purple-100',
  },
  {
    id: 4,
    name: 'Gold Silk Lehenga Set...',
    price: 'Rs. 115,000.00',
    image: '/mocks/mock_mostRecommended_common.jpg',
    thumbnail: '/mocks/mock_mostRecommended_common.jpg',
    bgColor: 'bg-yellow-50',
  },
];

const freshArrivals: MostRecommendedProduct[] = [
  {
    id: 5,
    name: 'Emerald Green Silk Saree...',
    price: 'Rs. 45,999.00',
    image: '/mocks/mock_hero_desktop.jpg',
    thumbnail: '/mocks/mock_mostRecommended_common.jpg',
    bgColor: 'bg-green-100',
  },
  {
    id: 6,
    name: 'Rose Gold Lehenga Choli...',
    price: 'Rs. 85,000.00',
    image: '/mocks/mock_mostRecommended_common.jpg',
    thumbnail: '/mocks/mock_mostRecommended_common.jpg',
    bgColor: 'bg-pink-100',
  },
  {
    id: 7,
    name: 'Coral Silk Anarkali...',
    price: 'Rs. 55,000.00',
    image: '/mocks/mock_mostRecommended_common.jpg',
    thumbnail: '/mocks/mock_mostRecommended_common.jpg',
    bgColor: 'bg-orange-100',
  },
  {
    id: 8,
    name: 'Navy Blue Banarasi Saree...',
    price: 'Rs. 72,000.00',
    image: '/mocks/mock_mostRecommended_common.jpg',
    thumbnail: '/mocks/mock_mostRecommended_common.jpg',
    bgColor: 'bg-blue-100',
  },
];

const ProductCard = ({ product }: { product: MostRecommendedProduct }) => (
  <div className="relative shrink-0 w-72 xl:w-md group">
    <div
      className={`${product.bgColor} rounded-3xl overflow-hidden h-96 xl:h-146 flex items-center justify-center
                  transition-transform duration-300 group-hover:scale-[1.02]`}
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
        src={product.thumbnail}
        alt={product.name}
        width={64}
        height={64}
        className="w-16 h-16 rounded-lg object-cover shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
        <p className="text-base font-bold text-gray-900 mt-1">From {product.price}</p>
      </div>
      <button
        aria-label="Add to Cart"
        className="shrink-0 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
      >
        <ShoppingBag className="w-5 h-5 text-gray-800" />
      </button>
    </div>
  </div>
);

export default function MostRecommended() {
  const [activeSection, setActiveSection] = useState<'bestSellers' | 'freshArrivals'>(
    'bestSellers'
  );

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
        </div>
      </div>
    </section>
  );
}
