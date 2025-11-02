'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

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
        className="w-full py-6 flex items-center justify-between font-serif text-xl md:text-2xl hover:text-gray-600 transition"
      >
        <span>{title}</span>
        <Plus
          className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? 'max-h-96 pb-6' : 'max-h-0'
        }`}
      >
        <div className="text-sm text-gray-700 space-y-2">{children}</div>
      </div>
    </div>
  );
};

const ProductInfo = () => {
  return (
    <div className="max-w-4xl">
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
        <p>Dry clean only to maintain the fabric's quality and embellishments.</p>
        <p>Store in a cool, dry place away from direct sunlight.</p>
        <p>Avoid contact with perfumes, deodorants, and other chemicals.</p>
        <p>
          For silk sarees, wrap in a muslin cloth to prevent damage from moisture and insects.
        </p>
        <p>Iron on low heat with a cotton cloth between the iron and the fabric.</p>
      </CollapsibleSection>

      <CollapsibleSection title="Disclaimer">
        <p>
          Colors may vary slightly from the images due to different screen resolutions and lighting
          conditions.
        </p>
        <p>
          Each piece is handcrafted, so minor variations in embroidery and weave are natural and
          add to the uniqueness of the product.
        </p>
        <p>Custom orders and Made-to-Order pieces are non-returnable and non-exchangeable.</p>
        <p>
          Please check the size chart carefully before placing your order. Alterations may be
          charged separately.
        </p>
        <p>We do not accept returns on sale items or final sale merchandise.</p>
      </CollapsibleSection>
    </div>
  );
};

export default ProductInfo;
