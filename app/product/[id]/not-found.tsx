'use client';

import Link from 'next/link';
import { Package, Home, ShoppingBag } from 'lucide-react';

export default function ProductNotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        {/* Product Icon */}
        <div className="mb-8 flex justify-center">
          <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center">
            <Package className="w-12 h-12 text-gray-400" />
          </div>
        </div>

        {/* Message */}
        <h2 className="text-3xl md:text-4xl font-serif text-gray-900 mb-4">Product Not Found</h2>
        <p className="text-lg text-gray-600 mb-8">
          Sorry, the product you&apos;re looking for doesn&apos;t exist or has been removed from our
          collection.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/products"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <ShoppingBag className="w-5 h-5" />
            Browse All Products
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Home className="w-5 h-5" />
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
