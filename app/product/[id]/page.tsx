import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { notFound } from 'next/navigation';
import ProductHero from '@/components/features/products/product-hero';
import ProductDetails from '@/components/features/products/product-details';
import SizeGuide from '@/components/features/products/size-chart';
import YouMayAlsoLike from '@/components/features/products/you-may-also-like';
import Footer from '@/components/layout/footer';
import { prisma } from '@/lib/db';
import { chartForCategory, readSizeCharts } from '@/lib/repositories/size-charts';
import type { SizeChart } from '@/lib/repositories/size-charts';
import { transformDbProductToProduct } from '@/lib/utils/product-utils';
import type { Product, DbProduct } from '@/types';

// Configure dynamic rendering behavior for proper production routing
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

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

/**
 * The size chart this garment's category falls back to, or null for "no size guide".
 *
 * Read here rather than fetched in the browser so the button is in the first HTML and does not
 * appear a moment after the price. A failure is swallowed to null on purpose: a garment's page
 * must not 500 because a settings row could not be read, and no size guide is exactly what
 * this page showed before the feature existed.
 *
 * The third argument of `chartForCategory` — a chart the product names itself — is not passed,
 * because `Product` has no field to hold one: adding it is a migration, and this feature was
 * built without one. Category resolution is what the shop can configure today.
 */
async function getSizeChart(category: string): Promise<SizeChart | null> {
  try {
    return chartForCategory(await readSizeCharts(), category);
  } catch (error) {
    console.error('Error fetching size charts:', error);
    return null;
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
    description:
      product.specifications ||
      `Buy ${product.name} at the best price. Explore our collection of ${product.category}.`,
  };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const productData = await getProduct(id);

  if (!productData) {
    notFound();
  }

  const { product, dbProduct } = productData;
  const sizeChart = await getSizeChart(dbProduct.category);

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb Navigation */}
        <nav className="mb-6 sm:mb-8">
          <ol className="flex items-center gap-2 text-xs sm:text-sm md:text-base font-serif text-gray-600 flex-wrap">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 mb-12 sm:mb-16 lg:items-start">
          <ProductHero photos={dbProduct.photos} productName={product.name} />
          {/* The guide sits under the details rather than inside them: `ProductDetails` is a
              client component shared with other surfaces, and threading a server-read chart
              through it would make every one of them think about size charts. `sizeChart` is
              null whenever the shop has written no chart for this category, and then nothing is
              rendered here at all. */}
          <div className="space-y-6">
            <ProductDetails product={product} />
            {sizeChart ? <SizeGuide chart={sizeChart} /> : null}
          </div>
        </div>
      </div>
      <YouMayAlsoLike currentProductId={product.id} />
      <Footer />
    </>
  );
}
