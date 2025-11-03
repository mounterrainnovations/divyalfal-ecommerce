'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  className?: string;
}

const ProductCard = ({ product, className = '' }: ProductCardProps) => {
  const formatPrice = (price: number) => {
    return `₹${price.toLocaleString('en-IN')}`;
  };

  return (
    <Link
      href={`/product/${product.id}`}
      className={`group block bg-white rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg ${className}`}
    >
      <div className="relative aspect-3/4 overflow-hidden bg-gray-50">
        <Image
          src={product.image || '/mocks/mock_mostRecommended_common.jpg'}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          unoptimized={product.image?.startsWith('http')}
          onError={e => {
            // Fallback to default image if the image fails to load
            const target = e.target as HTMLImageElement;
            if (target.src !== `${window.location.origin}/mocks/mock_mostRecommended_common.jpg`) {
              target.src = '/mocks/mock_mostRecommended_common.jpg';
            }
          }}
        />

        {/* Category Badge */}
        <div className="absolute top-3 left-3">
          <span className="inline-block px-2 py-1 text-xs font-medium bg-white/90 text-gray-700 rounded-full backdrop-blur-sm">
            {product.category}
          </span>
        </div>
      </div>

      <div className="p-5">
        {/* Product Name */}
        <h3 className="text-base font-medium text-gray-900 mb-2 line-clamp-2 leading-relaxed">
          {product.name}
        </h3>

        {/* Price */}
        <p className="text-lg font-semibold text-gray-900 mb-2">{formatPrice(product.price)}</p>

        {/* Specifications preview (if available) */}
        {product.specifications && (
          <p className="text-sm text-gray-600 line-clamp-1">
            {product.specifications.length > 50
              ? `${product.specifications.substring(0, 50)}...`
              : product.specifications}
          </p>
        )}
      </div>
    </Link>
  );
};

export default ProductCard;
