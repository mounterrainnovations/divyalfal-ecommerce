'use client';

import Image from 'next/image';

interface Category {
  name: string;
  image: string;
}

const categories: Category[] = [
  { name: 'Sarees', image: '/mocks/mock_categories_common.jpg' },
  { name: 'Indo-Western', image: '/mocks/mock_categories_common.jpg' },
  { name: 'Lehengas', image: '/mocks/mock_categories_common.jpg' },
  { name: 'Suits', image: '/mocks/mock_categories_common.jpg' },
  { name: 'Kurta Pant', image: '/mocks/mock_categories_common.jpg' },
  { name: 'Western', image: '/mocks/mock_categories_common.jpg' },
];

const Categories = () => {
  return (
    <section className="py-10 bg-gray-50">
      <div className="max-w-7xl md:max-w-336 mx-auto px-4">
        <h2 className="text-2xl font-semibold mb-6 text-center">Shop by Category</h2>

        {/* Desktop and Mobile */}
        <div
          className={`flex space-x-7 md:space-x-10 md:justify-around snap-x snap-mandatory
                      overflow-x-auto px-2 scrollbar-hide`}
        >
          {categories.map(cat => (
            <div
              key={cat.name}
              className="shrink-0 snap-center flex flex-col items-center text-center"
            >
              <div className="w-24 h-24 md:w-44 md:h-44 rounded-full overflow-hidden">
                <Image
                  src={cat.image}
                  alt={cat.name}
                  width={96}
                  height={96}
                  className="object-cover w-full h-full"
                />
              </div>
              <p className="mt-2 text-gray-700 font-medium text-sm">{cat.name}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Categories;
