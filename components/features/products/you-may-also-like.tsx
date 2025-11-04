'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Product } from '@/types';

interface YouMayAlsoLikeProps {
  currentProductId: string;
}

const YouMayAlsoLike = ({ currentProductId }: YouMayAlsoLikeProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRelatedProducts = async () => {
      try {
        const response = await fetch(`/api/products?limit=4`);
        if (response.ok) {
          const data = await response.json();
          // Filter out current product
          const relatedProducts = data.products
            .filter((p: Product) => p.id !== currentProductId)
            .slice(0, 4);
          setProducts(relatedProducts);
        }
      } catch (error) {
        console.error('Error fetching related products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRelatedProducts();
  }, [currentProductId]);

  const formatPrice = (price: number) => {
    return `₹${price.toLocaleString('en-IN')}`;
  };

  if (loading || products.length === 0) {
    return null;
  }
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
                href={`/product/${product.id}`}
                className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
              >
                <div className="relative aspect-3/4 overflow-hidden bg-gray-100">
                  <Image
                    src={product.image || '/mocks/mock_mostRecommended_common.jpg'}
                    alt={product.name}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    quality={80}
                    loading="lazy"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-sm md:text-base font-medium mb-1 line-clamp-2 min-h-10">
                    {product.name}
                  </h3>
                  <p className="text-sm md:text-base font-semibold">
                    From {formatPrice(product.price)}
                  </p>
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
