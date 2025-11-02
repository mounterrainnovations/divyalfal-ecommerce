import Hero from '@/components/layout/hero';
import Categories from '@/components/sections/categories';
import SpotlightCarousel from '@/components/features/carousel/spotlight-carousel';
import MostRecommended from '@/components/sections/most-recommended';
import Explore from '@/components/sections/explore';
import About from '@/components/sections/about';
import Testimonials from '@/components/sections/testimonials';
import Footer from '@/components/layout/footer';

export default function Home() {
  return (
    <>
      <main>
        <Hero />
        <Categories />
        <SpotlightCarousel />
        <MostRecommended />
        <Explore />
        <About />
        <Testimonials />
        <Footer />
      </main>
    </>
  );
}
