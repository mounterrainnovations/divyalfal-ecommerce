'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Minus, Plus } from 'lucide-react';
import type { Product } from '@/types';
import { formatPrice } from '@/lib/common/product-interfaces';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const CollapsibleSection = ({ title, children, defaultOpen = false }: CollapsibleSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-4 flex items-center justify-between font-serif text-xl hover:text-gray-600 transition"
      >
        <span>{title}</span>
        <Plus
          className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? 'max-h-96 pb-4' : 'max-h-0'
        }`}
      >
        <div className="text-base text-gray-700 space-y-2">{children}</div>
      </div>
    </div>
  );
};

interface ProductDetailsProps {
  product: Product;
}

const ProductDetails = ({ product }: ProductDetailsProps) => {
  const sizes = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL'];
  const [selectedSize, setSelectedSize] = useState('XS');
  const [quantity, setQuantity] = useState(1);

  const incrementQuantity = () => setQuantity(prev => prev + 1);
  const decrementQuantity = () => setQuantity(prev => (prev > 1 ? prev - 1 : 1));

  return (
    <div className="space-y-6 lg:pt-0 font-poppins">
      {/* Product Title */}
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-4xl md:text-5xl font-serif mb-2">{product.name}</h1>
        {/* Sale Badge */}
        {product.sale && (
          <span className="inline-block px-4 py-2 text-sm font-bold bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-full shadow-lg whitespace-nowrap">
            🔥 ON SALE
          </span>
        )}
      </div>

      {/* Price */}
      {product.sale && product.salePrice ? (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 p-4 rounded-xl border-2 border-red-200">
          <div className="flex items-baseline gap-3 flex-wrap">
            <p className="text-3xl md:text-4xl font-bold text-red-600">
              {formatPrice(product.salePrice)}
            </p>
            <p className="text-xl text-gray-500 line-through">{formatPrice(product.price)}</p>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-block px-3 py-1 bg-green-100 text-green-700 font-semibold text-sm rounded-full">
              💰 Save {formatPrice(product.price - product.salePrice)}
            </span>
            <span className="text-green-700 font-bold text-lg">
              ({Math.round(((product.price - product.salePrice) / product.price) * 100)}% OFF)
            </span>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-xl md:text-2xl font-bold">{formatPrice(product.price)}</p>
        </div>
      )}

      {/* Size Chart */}
      <div>
        <Link href="#" className="text-base font-bold underline hover:no-underline">
          Size Chart
        </Link>
      </div>

      {/* Size Selector */}
      <div>
        <p className="text-base font-medium mb-4">
          Size: <span className="font-semibold">{selectedSize}</span>
        </p>
        <div className="flex flex-wrap gap-3">
          {sizes.map(size => (
            <button
              key={size}
              onClick={() => setSelectedSize(size)}
              className={`min-w-[65px] px-5 py-3 border-2 rounded-full text-sm font-medium transition ${
                selectedSize === size
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black border-gray-300 hover:border-black'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Quantity and Contact Us */}
      <div className="flex items-center gap-3">
        <div className="flex items-center border-2 border-gray-300 rounded-full overflow-hidden">
          <button
            onClick={decrementQuantity}
            className="w-12 h-12 flex items-center justify-center hover:bg-gray-100 transition"
            aria-label="Decrease quantity"
          >
            <Minus className="w-4 h-4" />
          </button>
          <input
            type="number"
            value={quantity}
            onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-16 text-center border-none focus:outline-none"
          />
          <button
            onClick={incrementQuantity}
            className="w-12 h-12 flex items-center justify-center hover:bg-gray-100 transition"
            aria-label="Increase quantity"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <Link
          href="/contact-us"
          className="flex-1 py-3 bg-black text-white rounded-full font-semibold hover:bg-gray-800 transition text-center"
        >
          Contact Us
        </Link>
      </div>

      {/* Product Specifications */}
      {product.specifications && (
        <div className="pt-4 border-t">
          <h2 className="text-xl font-serif mb-4">Description</h2>
          <div className="text-base font-poppins whitespace-pre-line">{product.specifications}</div>
        </div>
      )}

      {/* Collapsible Sections */}
      <div className="pt-4">
        <CollapsibleSection title="Shipping Information">
          <p>
            We offer free shipping on all orders above Rs. 5,000. Orders are typically processed
            within 2-3 business days.
          </p>
          <p>Standard delivery takes 5-7 business days across India.</p>
          <p>
            For international orders, shipping time varies between 10-15 business days depending on
            the destination.
          </p>
          <p>Express shipping options are available at checkout for faster delivery.</p>
        </CollapsibleSection>

        <CollapsibleSection title="Care Instruction">
          <p>Dry clean only to maintain the fabric`&apos;`s quality and embellishments.</p>
          <p>Store in a cool, dry place away from direct sunlight.</p>
          <p>Avoid contact with perfumes, deodorants, and other chemicals.</p>
          <p>
            For silk sarees, wrap in a muslin cloth to prevent damage from moisture and insects.
          </p>
          <p>Iron on low heat with a cotton cloth between the iron and the fabric.</p>
        </CollapsibleSection>

        <CollapsibleSection title="Disclaimer">
          <p>
            Colors may vary slightly from the images due to different screen resolutions and
            lighting conditions.
          </p>
          <p>
            Each piece is handcrafted, so minor variations in embroidery and weave are natural and
            add to the uniqueness of the product.
          </p>
          <p>Custom orders and Made-to-Order pieces are non-returnable and non-exchangeable.</p>
          <p>
            Please check the size chart carefully before placing an order. Alterations may be
            charged separately.
          </p>
          <p>We do not accept returns on sale items or final sale merchandise.</p>
        </CollapsibleSection>
      </div>
    </div>
  );
};

export default ProductDetails;
