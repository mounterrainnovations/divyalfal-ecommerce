import ProductListing from '@/components/features/products/product-listing';

/** The same layout as /products with sale prices in the sale colour; the request is the same too. */
export default function SalePage() {
  return <ProductListing variant="sale" />;
}
