import Link from 'next/link';
import { notFound } from 'next/navigation';
import ProductHero from '@/components/features/products/product-hero';
import ProductDetails from '@/components/features/products/product-details';
import YouMayAlsoLike from '@/components/features/products/you-may-also-like';
import Footer from '@/components/layout/footer';
import { siteCopy } from '@/lib/content/site-copy';
import { prisma } from '@/lib/db';
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

  const navLabel = (href: string) =>
    siteCopy.nav.items.find(item => item.href === href)?.label ?? '';
  const crumb =
    'font-ui text-caption text-ink-soft transition-colors duration-300 hover:text-ink motion-reduce:transition-none ' +
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink';

  return (
    <>
      <nav aria-label="Breadcrumb" className="grid-editorial pt-6 md:pt-8">
        <ol className="col-span-12 flex flex-wrap items-center gap-x-3 gap-y-1 font-ui text-caption text-ink-soft">
          <li>
            <Link href="/" className={crumb}>
              {navLabel('/')}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/products" className={crumb}>
              {navLabel('/products')}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-ink">
            {product.name}
          </li>
        </ol>
      </nav>

      {/* Photographs scroll through the left seven columns while the details stay in view in
          the right four; one empty column holds them apart. Below lg it is one column. */}
      <div className="grid-editorial gap-y-12 pb-24 pt-8 md:pb-32 lg:items-start">
        <div className="col-span-12 lg:col-span-7">
          <ProductHero photos={dbProduct.photos} productName={product.name} />
        </div>
        <div className="col-span-12 lg:sticky lg:top-28 lg:col-span-4 lg:col-start-9">
          <ProductDetails product={product} />
        </div>
      </div>

      <YouMayAlsoLike currentProductId={product.id} />
      <Footer />
    </>
  );
}
