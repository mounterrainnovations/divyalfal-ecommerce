'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';

const Explore = () => {
  const products = [
    { id: 1, name: 'Ivory Saree Set', price: '₹30,999' },
    { id: 2, name: 'Blue Indo-Western', price: '₹21,999' },
    { id: 3, name: 'Purple Banarasi Saree', price: '₹60,000' },
    { id: 4, name: 'Gold Silk Lehenga', price: '₹1,15,000' },
    { id: 5, name: 'Emerald Silk Saree', price: '₹45,999' },
    { id: 6, name: 'Rose Gold Lehenga', price: '₹85,000' },
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
              <div
                key={p.id}
                className="shrink-0 w-64 md:w-72 rounded-2xl overflow-hidden group shadow-sm hover:shadow-md transition-all duration-300 snap-start"
              >
                <div className="relative aspect-3/4 bg-gray-50">
                  <Image
                    src="/mocks/mock_mostRecommended_common.jpg"
                    alt={p.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-4 bg-white">
                  <h3 className="font-medium text-gray-700 truncate">{p.name}</h3>
                  <p className="text-sm text-black font-bold">{p.price}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Explore;
