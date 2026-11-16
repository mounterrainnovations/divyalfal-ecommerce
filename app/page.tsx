import Hero from '@/components/layout/hero';
import Categories from '@/components/sections/categories';
import Collection from '@/components/sections/collection';
import ShopByStyle from '@/components/sections/shop-by-style';
import About from '@/components/sections/about';
import Testimonials from '@/components/sections/testimonials';
import Slideshow from '@/components/sections/slideshow';
import OurValues from '@/components/sections/our-values';
import CTABanner from '@/components/sections/cta-banner';
import VirasatAcademy from '@/components/sections/virasat-academy';
import Footer from '@/components/layout/footer';

export default function Home() {
  return (
    <>
      <Hero />
      <Categories />
      <Collection />
      <ShopByStyle />
      <Slideshow />
      <Testimonials />
      <About />
      <CTABanner />
      <VirasatAcademy />
      <OurValues />
      <Footer />
    </>
  );
}
