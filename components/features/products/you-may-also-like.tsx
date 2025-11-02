'use client';

import Image from 'next/image';
import Link from 'next/link';

interface Product {
  id: number;
  name: string;
  price: string;
  image: string;
}

const products: Product[] = [
  {
    id: 1,
    name: 'Royal Plum Banarasi Silk Lehanga Set',
    price: 'Rs. 84,999.00',
    image: '/photo.jpg',
  },
  {
    id: 2,
    name: 'Royal Purple & Silver Banarasi Lehanga Set',
    price: 'Rs. 57,999.00',
    image: '/photo.jpg',
  },
  {
    id: 3,
    name: 'Banarasi Bandhani Khaddi Georgette Saree with Gold Zari Jaal',
    price: 'Rs. 57,999.00',
    image: '/photo.jpg',
  },
  {
    id: 4,
    name: 'Multicolored Banarasi Weaved Lehanga Set with Thread Embroidered Blouse',
    price: 'Rs. 39,999.00',
    image: '/photo.jpg',
  },
];

const YouMayAlsoLike = () => {
  return (
    <section className="py-16 md:py-24 font-poppins">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif text-center mb-12">
          You may also like
        </h2>

        {/* Centered grid of 4 cards */}
        <div className="flex justify-center">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-6xl">
            {products.map(product => (
              <Link
                key={product.id}
                href="/product"
                className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
              >
                <div className="relative aspect-3/4 overflow-hidden bg-gray-100">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-sm md:text-base font-medium mb-1 line-clamp-2 min-h-10">
                    {product.name}
                  </h3>
                  <p className="text-sm md:text-base font-semibold">From {product.price}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default YouMayAlsoLike;
