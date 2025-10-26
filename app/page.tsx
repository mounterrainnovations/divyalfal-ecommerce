import Hero from '@/components/Hero';
import Categories from '@/components/Categories';
import SpotlightCarousel from '@/components/SpotlightCarousel';

export default function Home() {
  return (
    <>
      <main>
        <Hero />
        <Categories />
        <SpotlightCarousel />
      </main>
    </>
  );
}
