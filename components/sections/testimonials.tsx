'use client';

import Image from 'next/image';
import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Testimonial {
  name: string;
  message: string;
  image: string;
  rating: number;
}

const testimonials: Testimonial[] = [
  {
    name: '',
    message:
      'Wearing Divyafal by Alpa Rawat was an experience not just a dress, but a story. I felt truly unique and ethereal in my lehenga.',
    image: '/testimonials/1.png',
    rating: 5,
  },
  {
    name: '',
    message:
      'Alpa Rawat’s craftsmanship is unmatched. Every stitch reflects artistry, blending structure and elegance into wearable art.',
    image: '/testimonials/2.png',
    rating: 5,
  },
  {
    name: '',
    message:
      'Divyafal’ lives up to its name. My outfit felt like a rare treasure timeless, personal, and heirloom-worthy.',
    image: '/testimonials/3.png',
    rating: 5,
  },
  {
    name: '',
    message:
      'My Divyafal engagement outfit was pure magic. Alpa captured the emotion perfectly the fit, color, and grace were flawless.',
    image: '/testimonials/4.png',
    rating: 5,
  },
  {
    name: '',
    message:
      'Designing with Alpa was a dream. She transformed my vision into a stunning reality with her heartfelt artistry',
    image: '/testimonials/5.png',
    rating: 5,
  },
];

const Testimonials = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -400 : 400;
      scrollContainerRef.current.scrollBy({
        left: scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <section className="py-12 xl:py-20 bg-gray-50">
      <div className="w-full">
        <h2 className="text-3xl xl:text-5xl font-serif font-light text-center text-gray-800 mb-8 xl:mb-12">
          What Our Customers Say
        </h2>

        {/* Scroll Container with Navigation Buttons */}
        <div className="relative w-full">
          {/* Left Scroll Button */}
          <button
            onClick={() => scroll('left')}
            className="absolute left-4 xl:left-8 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg rounded-full p-3 transition-all hover:scale-110"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-6 h-6 text-gray-800" />
          </button>

          {/* Right Scroll Button */}
          <button
            onClick={() => scroll('right')}
            className="absolute right-4 xl:right-8 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg rounded-full p-3 transition-all hover:scale-110"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-6 h-6 text-gray-800" />
          </button>

          {/* Horizontal Scrolling Container */}
          <div ref={scrollContainerRef} className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-6 xl:gap-8 pb-4 px-4 xl:px-20 snap-x snap-mandatory w-fit mx-auto">
              {testimonials.map((t, i) => (
                <div
                  key={i}
                  className="shrink-0 w-72 xl:w-96 rounded-2xl overflow-hidden group shadow-sm hover:shadow-md transition-all duration-300 snap-center"
                >
                  <div className="relative h-96 xl:h-146 bg-gray-50">
                    <Image
                      src={t.image}
                      alt={t.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-4 xl:p-6 bg-white">
                    <h3 className="font-medium text-gray-900 text-base xl:text-lg">{t.name}</h3>
                    <p className="text-sm xl:text-base text-gray-600 mt-2">{t.message}</p>
                    <div className="flex justify-start mt-3">
                      <div className="flex gap-1">
                        {[...Array(t.rating)].map((_, j) => (
                          <svg
                            key={j}
                            width="16"
                            height="16"
                            viewBox="0 0 22 20"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M10.525.464a.5.5 0 0 1 .95 0l2.107 6.482a.5.5 0 0 0 .475.346h6.817a.5.5 0 0 1 .294.904l-5.515 4.007a.5.5 0 0 0-.181.559l2.106 6.483a.5.5 0 0 1-.77.559l-5.514-4.007a.5.5 0 0 0-.588 0l-5.514 4.007a.5.5 0 0 1-.77-.56l2.106-6.482a.5.5 0 0 0-.181-.56L.832 8.197a.5.5 0 0 1 .294-.904h6.817a.5.5 0 0 0 .475-.346z"
                              fill="#FF532E"
                            />
                          </svg>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
