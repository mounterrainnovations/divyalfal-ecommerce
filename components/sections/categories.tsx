'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useShowcase } from '@/lib/hooks/useShowcase';

/**
 * The category strip.
 *
 * The six tiles used to be `CATEGORY_CONFIG`, a constant. They now come from `useShowcase`,
 * which starts from that same constant and swaps in whatever the owner has saved in the portal
 * — so this section renders identically on the first frame and can only ever be *changed*, not
 * emptied, by the database. Tiles the owner has hidden are filtered out here rather than in the
 * hook, because the Categories screen in the portal needs the hidden ones too.
 */
const Categories = () => {
  const { categories: all } = useShowcase();
  const categories = all.filter(category => category.visible);

  // Every tile hidden is a deliberate choice, and an empty strip with a heading above it reads
  // as a broken section. Draw nothing at all instead.
  if (categories.length === 0) return null;

  return (
    <section className="py-14 md:py-20 bg-gray-50">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="font-serif font-normal text-4xl sm:text-5xl xl:text-6xl text-gray-900 text-center mb-8 md:mb-10">
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
