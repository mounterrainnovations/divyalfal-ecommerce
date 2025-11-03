'use client';

import Image from 'next/image';
import { useMedia } from '@/lib/hooks/useMedia';

const Hero = () => {
  const isMobile = useMedia('(max-width: 1024px)');

  return (
    <section className="relative w-full h-screen overflow-hidden">
      {/* Desktop: background image */}
      {!isMobile && (
        <div className="relative w-full h-full p-12">
          <div className="relative w-full h-full overflow-hidden rounded-md">
            <Image
              src="/mocks/mock_hero_desktop_2.webp"
              alt="Hero background"
              fill
              priority
              className="object-cover"
            />
          </div>
        </div>
      )}

      {/* Mobile: portrait video */}
      {isMobile && (
        <video
          // src="/mocks/mock_hero_mobile.mp4"
          src="https://duwwgyobnpuqsqdromzj.supabase.co/storage/v1/object/public/product-images/DivyaFalxApekshaDabral.mp4"
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover"
        />
      )}

      {/*
      //! Optional overlay content
      */}
      {/* <div className="absolute inset-0 flex items-center justify-center bg-black/30">
        <h1 className="text-white text-3xl md:text-5xl font-bold">Welcome to Divyafal</h1>
      </div> */}
    </section>
  );
};

export default Hero;
