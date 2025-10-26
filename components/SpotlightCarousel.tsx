'use client';

import { useRef } from 'react';

interface SpotlightItem {
  id: number;
  video: string;
}

const spotlightItems: SpotlightItem[] = [
  { id: 1, video: '/mocks/mock_hero_mobile.mp4' },
  { id: 2, video: '/mocks/mock_hero_mobile.mp4' },
  { id: 3, video: '/mocks/mock_hero_mobile.mp4' },
  { id: 4, video: '/mocks/mock_hero_mobile.mp4' },
  { id: 5, video: '/mocks/mock_hero_mobile.mp4' },
  { id: 6, video: '/mocks/mock_hero_mobile.mp4' },
];

const SpotlightCarousel = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <section className="py-6 bg-white">
      <div className="md:max-w-4/5 mx-auto px-4">
        <h2 className="text-2xl font-semibold mb-6 text-center">Our Spotlight</h2>

        <div
          ref={scrollRef}
          className="
            flex overflow-x-auto gap-4 md:gap-6 snap-x snap-mandatory scroll-smooth
            pb-4
          "
        >
          {spotlightItems.map(item => (
            <div
              key={item.id}
              className="
                shrink-0 snap-center
                w-[48%] md:w-[23.5%]
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
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SpotlightCarousel;
