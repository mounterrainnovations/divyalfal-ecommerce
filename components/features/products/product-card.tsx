'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  className?: string;
  priority?: boolean;
}

/**
 * Formats a price value to Indian Rupee format
 * @param price - The price to format
 * @returns Formatted price string with ₹ symbol
 */
const formatPrice = (price: number): string => {
  return `₹${price.toLocaleString('en-IN')}`;
};

// Helper function to strip HTML tags and get plain text
const stripHtml = (html: string): string => {
  // Remove HTML tags
  const withoutTags = html.replace(/<[^>]*>/g, '');
  // Decode HTML entities
  const textarea = document.createElement('textarea');
  textarea.innerHTML = withoutTags;
  return textarea.value;
};

const ProductCard = ({ product, className = '', priority = false }: ProductCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const imageUrl = imageError
    ? '/mocks/mock_mostRecommended_common.jpg'
    : product.image || '/mocks/mock_mostRecommended_common.jpg';

  return (
    <Link
      href={`/product/${product.id}`}
      className={`group block bg-white rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg ${className}`}
    >
      <div className="relative aspect-3/4 overflow-hidden bg-gray-100">
        {/* Loading Skeleton */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer bg-size-[200%_100%]" />
        )}

        <Image
          src={imageUrl}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
          quality={85}
          loading={priority ? 'eager' : 'lazy'}
          priority={priority}
          className={`object-cover group-hover:scale-105 transition-all duration-500 ${
            imageLoaded ? 'opacity-100 blur-0' : 'opacity-0 blur-sm'
          }`}
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            setImageError(true);
            setImageLoaded(true);
          }}
        />

        {/* Category Badge */}
        <div className="absolute top-2 sm:top-3 left-2 sm:left-3 z-10">
          <span className="inline-block px-2 py-1 text-xs font-medium bg-white/90 text-gray-700 rounded-full backdrop-blur-sm shadow-sm">
            {product.category}
          </span>
        </div>

        {/* Sale Badge */}
        {product.sale && (
          <div className="absolute top-2 sm:top-3 right-2 sm:right-3 z-10">
            <span className="inline-block px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-bold bg-black text-white rounded-full shadow-lg">
              SALE
            </span>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5">
        {/* Product Name */}
        <h3 className="text-sm sm:text-base font-medium text-gray-900 mb-2 line-clamp-2 leading-relaxed">
          {product.name}
        </h3>

        {/* Price */}
        {product.sale && product.salePrice ? (
          <div className="mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-base sm:text-lg font-bold text-gray-900">
                {formatPrice(product.salePrice)}
              </p>
              <p className="text-xs sm:text-sm text-gray-500 line-through">
                {formatPrice(product.price)}
              </p>
            </div>
            <p className="text-xs font-semibold text-amber-700 mt-1">
              Save {formatPrice(product.price - product.salePrice)} (
              {Math.round(((product.price - product.salePrice) / product.price) * 100)}% OFF)
            </p>
          </div>
        ) : (
          <p className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
            {formatPrice(product.price)}
          </p>
        )}

        {/* Specifications preview (if available) */}
        {product.specifications && (
          <p className="text-sm text-gray-600 line-clamp-1">
            {(() => {
              const plainText = stripHtml(product.specifications);
              return plainText.length > 50 ? `${plainText.substring(0, 50)}...` : plainText;
            })()}
          </p>
        )}
      </div>
    </Link>
  );
};

export default ProductCard;
