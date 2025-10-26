'use client';

import Image from 'next/image';
import { useMedia } from '@/lib/hooks/useMedia';

const Hero = () => {
  const isMobile = useMedia('(max-width: 768px)');

  return (
    <section className="relative w-full h-[80vh] overflow-hidden">
      {/* Desktop: background image */}
      {!isMobile && (
        <Image
          src="/mocks/mock_hero_desktop.jpg"
          alt="Hero background"
          fill
          priority
          className="object-cover"
        />
      )}

      {/* Mobile: portrait video */}
      {isMobile && (
        <video
          src="/mocks/mock_hero_mobile.mp4"
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
