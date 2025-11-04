import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { notFound } from 'next/navigation';
import ProductHero from '@/components/features/products/product-hero';
import ProductDetails from '@/components/features/products/product-details';
import YouMayAlsoLike from '@/components/features/products/you-may-also-like';
import Footer from '@/components/layout/footer';
import { prisma } from '@/lib/db';
import { transformDbProductToProduct } from '@/lib/utils/product-utils';
import type { Product } from '@/types';
import type { DbProduct } from '@/lib/utils/product-utils';

// Configure dynamic rendering behavior
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

async function getProduct(id: string): Promise<{ product: Product; dbProduct: DbProduct } | null> {
  try {
    const dbProduct = await prisma.product.findUnique({ where: { id } });
    if (!dbProduct) return null;
    const product = transformDbProductToProduct(dbProduct);
    return { product, dbProduct };
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
}

// Generate static params for existing products at build time
export async function generateStaticParams() {
  try {
    const products = await prisma.product.findMany({
      select: { id: true },
      take: 100, // Limit to avoid long build times
    });
    
    return products.map((product) => ({
      id: product.id,
    }));
  } catch (error) {
    console.error('Error generating static params:', error);
    return [];
  }
}

// Generate metadata for SEO
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const productData = await getProduct(id);

  if (!productData) {
    return {
      title: 'Product Not Found',
    };
  }

  const { product } = productData;

  return {
    title: `${product.name} - Divyafal`,
    description: product.specifications || `Buy ${product.name} at the best price. Explore our collection of ${product.category}.`,
  };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const productData = await getProduct(id);

  if (!productData) {
    notFound();
  }

  const { product, dbProduct } = productData;

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
            <li className="text-black font-medium">{product.name}</li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-16 lg:items-start">
          <ProductHero photos={dbProduct.photos} productName={product.name} />
          <ProductDetails product={product} />
        </div>
      </div>
      <YouMayAlsoLike currentProductId={product.id} />
      <Footer />
    </>
  );
}

