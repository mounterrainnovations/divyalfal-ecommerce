'use client';

import Image from 'next/image';

interface Category {
  name: string;
  image: string;
}

const categories: Category[] = [
  { name: 'Sarees', image: '/categories/saree.jpg' },
  { name: 'Indo-Western', image: '/categories/indo_western.jpg' },
  { name: 'Lehengas', image: '/categories/lehenga.png' },
  { name: 'Suits', image: '/categories/suits.jpg' },
  { name: 'Kurta Pant', image: '/categories/kurta.jpg' },
  { name: 'Western', image: '/categories/western.png' },
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
              <div className="w-20 h-20 md:w-36 md:h-36 rounded-full overflow-hidden">
                <Image
                  src={cat.image}
                  alt={cat.name}
                  width={80}
                  height={80}
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
