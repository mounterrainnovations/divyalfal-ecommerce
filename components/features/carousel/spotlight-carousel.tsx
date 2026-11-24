'use client';

import { useRef } from 'react';

interface SpotlightItem {
  id: number;
  video: string;
}

const spotlightItems: SpotlightItem[] = [
  {
    id: 1,
    video:
      'https://duwwgyobnpuqsqdromzj.supabase.co/storage/v1/object/public/product-images/bg_video.webm',
  },
  {
    id: 2,
    video:
      'https://duwwgyobnpuqsqdromzj.supabase.co/storage/v1/object/public/product-images/sp01.webm',
  },
  {
    id: 3,
    video:
      'https://duwwgyobnpuqsqdromzj.supabase.co/storage/v1/object/public/product-images/sp02.webm',
  },
  {
    id: 4,
    video:
      'https://duwwgyobnpuqsqdromzj.supabase.co/storage/v1/object/public/product-images/sp03.webm',
  },
];

const SpotlightCarousel = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <section className="py-6 bg-white">
      <div className="px-4 md:px-8 xl:px-20">
        <h2 className="text-3xl font-semibold mb-6 text-center font-serif font-light">Our Spotlight</h2>

        <div
          ref={scrollRef}
          className="
            flex overflow-x-auto gap-4 md:gap-6 snap-x snap-mandatory scroll-smooth
            pb-4 xl:max-w-[95%] xl:mx-auto
          "
        >
          {spotlightItems.map(item => (
            <div
              key={item.id}
              className="
                shrink-0 snap-center
                w-[48%] md:w-[calc((100%-1.5rem*3)/4)]
                rounded-xl overflow-hidden shadow-md
              "
            >
              <video
                src={item.video}
                muted
                autoPlay
                loop
                playsInline
                className="w-full aspect-9/16 object-cover"
                preload="none"
                onLoadedData={e => {
                  const video = e.currentTarget;
                  video.currentTime = 0;
                  video.play();
                }}
                onEnded={e => {
                  const video = e.currentTarget;
                  video.currentTime = 0;
                  video.play();
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SpotlightCarousel;
