import Hero from '@/components/layout/hero';
import Categories from '@/components/sections/categories';
import Collection from '@/components/sections/collection';
import ShopByStyle from '@/components/sections/shop-by-style';
import InHerWords from '@/components/sections/in-her-words';
import Atelier from '@/components/sections/atelier';
import Close from '@/components/sections/close';
import Footer from '@/components/layout/footer';

export default function Home() {
  return (
    <>
      <Hero />
      <Categories />
      <Collection />
      <ShopByStyle />
      <Atelier />
      <InHerWords />
      <Close />
      <Footer />
    </>
  );
}
