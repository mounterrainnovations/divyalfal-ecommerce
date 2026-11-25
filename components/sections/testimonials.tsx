'use client';

import Image from 'next/image';
import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useShowcase } from '@/lib/hooks/useShowcase';

/**
 * The client quotes.
 *
 * The five quotes used to be an array in this file. They now come from `useShowcase`, which
 * starts from that same array and swaps in whatever the owner has saved in the portal — so the
 * section renders identically on the first frame and the database can only ever change it, not
 * empty it. An owner who deliberately removes every quote gets no section rather than a
 * heading over a blank strip.
 */
const Testimonials = () => {
  const { testimonials } = useShowcase();
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

  if (testimonials.length === 0) return null;

  return (
    <section className="py-14 md:py-20 bg-white">
      <div className="w-full">
        <h2 className="font-serif font-normal text-4xl sm:text-5xl xl:text-6xl text-gray-900 text-center mb-8 md:mb-10 px-4">
          What Our Customers Say
        </h2>

        {/* Scroll Container with Navigation Buttons */}
        <div className="relative w-full">
          {/* Left Scroll Button */}
          <button
            onClick={() => scroll('left')}
            className="absolute left-2 sm:left-4 xl:left-8 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg rounded-full p-2 sm:p-3 transition-all hover:scale-110"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-800" />
          </button>

          {/* Right Scroll Button */}
          <button
            onClick={() => scroll('right')}
            className="absolute right-2 sm:right-4 xl:right-8 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg rounded-full p-2 sm:p-3 transition-all hover:scale-110"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-gray-800" />
          </button>

          {/* Horizontal Scrolling Container */}
          <div ref={scrollContainerRef} className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-4 sm:gap-6 xl:gap-8 pb-4 px-6 sm:px-8 xl:px-20 snap-x snap-mandatory w-fit mx-auto scrollbar-hide">
              {testimonials.map(t => (
                <div
                  key={t.id}
                  className="shrink-0 w-64 sm:w-72 xl:w-96 rounded-2xl overflow-hidden group shadow-sm hover:shadow-md transition-all duration-300 snap-center"
                >
                  {/* A quote with no portrait renders no frame at all: `<Image src="">` is a
                      request to the current page, which Next logs as a failed image and the
                      browser draws as a broken box. */}
                  {t.image ? (
                    <div className="relative h-96 xl:h-146 bg-gray-50">
                      <Image
                        src={t.image}
                        alt={t.name}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  ) : null}
                  <div className="p-4 xl:p-6 bg-white">
                    <h3 className="font-medium text-gray-900 text-sm sm:text-base xl:text-lg">
                      {t.name}
                    </h3>
                    <p className="text-xs sm:text-sm xl:text-base text-gray-600 mt-2">
                      {t.message}
                    </p>
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
