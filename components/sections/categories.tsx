'use client';

import Image from 'next/image';
import Link from 'next/link';
import { CATEGORY_CONFIG } from '@/lib/common/product-interfaces';

const categories = CATEGORY_CONFIG;

const Categories = () => {
  return (
    <section className="py-10 bg-gray-50">
      <div className="max-w-7xl md:max-w-336 mx-auto px-4 sm:px-6">
        <h2 className="text-3xl sm:text-4xl mb-6 sm:mb-8 text-center font-serif font-light">
          Shop by Category
        </h2>

        {/* Desktop and Mobile */}
        <div
          className={`flex space-x-6 sm:space-x-7 md:space-x-10 md:justify-around snap-x snap-mandatory
                      overflow-x-auto px-2 scrollbar-hide`}
        >
          {categories.map(cat => (
            <Link
              key={cat.name}
              href={`/products?categories=${encodeURIComponent(cat.name)}`}
              className="shrink-0 snap-center flex flex-col items-center text-center hover:opacity-80 transition-opacity"
            >
              <div className="w-[88px] h-[88px] sm:w-20 sm:h-20 md:w-36 md:h-36 rounded-full overflow-hidden">
                <Image
                  src={cat.image}
                  alt={cat.name}
                  width={144}
                  height={144}
                  className="object-cover w-full h-full"
                />
              </div>
              <p className="mt-2 text-gray-700 font-medium text-xs sm:text-sm">{cat.name}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Categories;
