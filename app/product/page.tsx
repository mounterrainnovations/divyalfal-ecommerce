import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import ProductHero from '@/components/features/products/product-hero';
import ProductDetails from '@/components/features/products/product-details';
import YouMayAlsoLike from '@/components/features/products/you-may-also-like';
import Footer from '@/components/layout/footer';

export default function ProductPage() {
  return (
    <>
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb Navigation */}
        <nav className="mb-8">
          <ol className="flex items-center gap-2 text-sm md:text-base font-serif text-gray-600">
            <li>
              <Link href="/" className="hover:text-black transition">
                Home
              </Link>
            </li>
            <li>
              <ChevronRight className="w-4 h-4" />
            </li>
            <li>
              <Link href="/products" className="hover:text-black transition">
                All Product
              </Link>
            </li>
            <li>
              <ChevronRight className="w-4 h-4" />
            </li>
            <li className="text-black font-medium">
              Regal Purple Banarasi Silk Saree with Zardosi Work
            </li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-16 lg:items-start">
          <ProductHero />
          <ProductDetails />
        </div>
      </div>
      <YouMayAlsoLike />
      <Footer />
    </>
  );
}
