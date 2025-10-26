import Hero from '@/components/Hero';
import Categories from '@/components/Categories';
import SpotlightCarousel from '@/components/SpotlightCarousel';
import MostRecommended from '@/components/MostRecommended';
import Explore from '@/components/Explore';
import About from '@/components/About';

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
      </main>
    </>
  );
}
