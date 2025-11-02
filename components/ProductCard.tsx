'use client';

import Image from 'next/image';
import Link from 'next/link';

export interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
  category: string;
}

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
          src={product.image}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>

      <div className="p-5">
        {/* Product Name */}
        <h3 className="text-base font-medium text-gray-900 mb-3 line-clamp-2 leading-relaxed">
          {product.name}
        </h3>

        {/* Price */}
        <p className="text-lg font-semibold text-gray-900">{formatPrice(product.price)}</p>
      </div>
    </Link>
  );
};

export default ProductCard;
