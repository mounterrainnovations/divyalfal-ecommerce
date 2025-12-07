'use client';

import { useEffect, useState } from 'react';
import type { Product } from '@/types';
import ProductCard from './product-card';

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

  if (loading || products.length === 0) {
    return null;
  }

  return (
    <section className="pb-16 font-poppins">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif text-center mb-12">
          You may also like
        </h2>

        {/* Grid of 4 cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default YouMayAlsoLike;
