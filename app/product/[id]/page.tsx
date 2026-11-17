import Link from 'next/link';
import { notFound } from 'next/navigation';
import ProductHero from '@/components/features/products/product-hero';
import ProductDetails from '@/components/features/products/product-details';
import YouMayAlsoLike from '@/components/features/products/you-may-also-like';
import Footer from '@/components/layout/footer';
import { siteCopy } from '@/lib/content/site-copy';
import { prisma } from '@/lib/db';
import { transformDbProductToProduct } from '@/lib/utils/product-utils';
import { specificationsToDescription } from '@/lib/utils/specifications';
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
      title: siteCopy.product.notFound.heading,
    };
  }

  const { product } = productData;

  // `specifications` is rich-text HTML from the admin editor, and it used to go into the
  // description verbatim: `<p><strong>…</strong></p>` in the `<meta>` tag, and so in every
  // search result and share card. `specificationsToDescription` reuses the same parse the page
  // body already runs, flattens it to a sentence and truncates on a word boundary at the 160
  // characters search engines show. It returns '' when there is nothing to say, so a product
  // with no specifications still gets the fallback sentence rather than an empty description.
  return {
    title: `${product.name} - Divyafal`,
    description:
      specificationsToDescription(product.specifications, 160) ||
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

  // A link with no words in it is worse than no link, so an href missing from the nav falls
  // back to a plain label rather than rendering empty.
  const navLabel = (href: string, fallback: string) =>
    siteCopy.nav.items.find(item => item.href === href)?.label || fallback;
  const crumb =
    'font-ui text-caption text-ink-soft transition-colors duration-300 hover:text-ink motion-reduce:transition-none ' +
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink';

  return (
    <>
      <nav aria-label="Breadcrumb" className="grid-editorial pt-6 md:pt-8">
        <ol className="col-span-12 flex flex-wrap items-center gap-x-3 gap-y-1 font-ui text-caption text-ink-soft">
          <li>
            <Link href="/" className={crumb}>
              {navLabel('/', 'Home')}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/products" className={crumb}>
              {navLabel('/products', 'All Products')}
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
        {/* Capped to the room below the header and scrollable, so a disclosure opened on a short
            screen can never push the Shipping / Care / Disclaimer prose below the pin where it
            could not be reached. The padding and matching negative margin keep the focus outlines
            of the controls from being clipped by the scroll container.

            `scrollbar-gutter: stable` because that scrollbar appears mid-interaction: on Windows
            it is laid out rather than overlaid, so opening a disclosure takes ~16px off a
            four-column measure and re-wraps the prose while the reader is looking at it. The
            gutter is reserved from the start, so opening one changes nothing but the height.

            `lg:top-28` is 112px, measured against the real navbar rather than assumed: the bar
            is `h-16` / `md:h-20`, so 80px at this breakpoint, leaving a 32px gap. It condenses
            to 64px at md and above once scrolled, which only widens that gap. */}
        <div className="col-span-12 lg:sticky lg:top-28 lg:col-span-4 lg:col-start-9 lg:-m-2 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:p-2 lg:[scrollbar-gutter:stable] overscroll-contain">
          <ProductDetails product={product} />
        </div>
      </div>

      <YouMayAlsoLike currentProductId={product.id} />
      <Footer />
    </>
  );
}
