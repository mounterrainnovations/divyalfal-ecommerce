import ProductListing from '@/components/features/products/product-listing';

/**
 * The query this page sends to `/api/products` is a contract with the homepage's category
 * links; see `lib/hooks/useProductListing.ts` before changing anything about it.
 */
export default function ProductsPage() {
  return <ProductListing variant="products" />;
}
