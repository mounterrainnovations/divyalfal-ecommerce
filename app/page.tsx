import Hero from '@/components/Hero';
import Categories from '@/components/Categories';
import SpotlightCarousel from '@/components/SpotlightCarousel';
import MostRecommended from '@/components/MostRecommended';

export default function Home() {
  return (
    <>
      <main>
        <Hero />
        <Categories />
        <SpotlightCarousel />
        <MostRecommended />
      </main>
    </>
  );
}
