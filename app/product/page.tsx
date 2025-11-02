import ProductHero from '@/components/ProductHero';
import ProductDetails from '@/components/ProductDetails';
import YouMayAlsoLike from '@/components/YouMayAlsoLike';
import Footer from '@/components/Footer';

export default function ProductPage() {
  return (
    <>
      <div className="container mx-auto px-4 py-8">
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
