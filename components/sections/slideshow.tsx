'use client';

import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const FALLBACK_IMAGES = [
  '/slideshow/fallback.jpg',
];

export default function Slideshow() {
  const [images, setImages] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Fetch images from API
  useEffect(() => {
    const fetchImages = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/slideshow');
        
        if (!response.ok) {
          throw new Error('Failed to fetch slideshow images');
        }
        
        const data = await response.json();
        
        if (data.images && data.images.length > 0) {
          setImages(data.images);
        } else {
          // Use fallback images if no images returned
          setImages(FALLBACK_IMAGES);
        }
      } catch (error) {
        console.error('Error fetching slideshow images:', error);
        // Use fallback images on error
        setImages(FALLBACK_IMAGES);
      } finally {
        setIsLoading(false);
      }
    };

    fetchImages();
  }, []);

  // Filter out images that failed to load
  const validImages = images.filter(img => !imageErrors.has(img));

  // Auto-advance slideshow
  useEffect(() => {
    if (!isAutoPlaying || validImages.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % validImages.length);
    }, 3500); // Change slide every 3.5 seconds

    return () => clearInterval(interval);
  }, [isAutoPlaying, validImages.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % validImages.length);
    setIsAutoPlaying(false);
  }, [validImages.length]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + validImages.length) % validImages.length);
    setIsAutoPlaying(false);
  }, [validImages.length]);

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
  }, []);

  const handleImageError = (imageSrc: string) => {
    setImageErrors(prev => new Set(prev).add(imageSrc));
  };

  // Show loading skeleton
  if (isLoading) {
    return (
      <section className="bg-gray-50 py-12 xl:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="relative w-full h-64 sm:h-96 md:h-[32rem] lg:h-[40rem] xl:h-[48rem] bg-gray-200 rounded-2xl animate-pulse" />
          </div>
        </div>
      </section>
    );
  }

  // Show nothing if no valid images
  if (validImages.length === 0) {
    return null;
  }

  return (
    <section className="bg-gray-50 py-12 xl:py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Slideshow Container */}
          <div className="relative w-full h-64 sm:h-96 md:h-[32rem] lg:h-[40rem] xl:h-[48rem] rounded-2xl overflow-hidden shadow-2xl bg-gray-100">
            {/* Images */}
            <div className="relative w-full h-full">
              {validImages.map((image, index) => (
                <div
                  key={image}
                  className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
                    index === currentIndex
                      ? 'opacity-100 scale-100 z-10'
                      : 'opacity-0 scale-105 z-0'
                  }`}
                >
                  <Image
                    src={image}
                    alt={`Slideshow image ${index + 1}`}
                    fill
                    className="object-cover object-center"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1152px"
                    priority={index === 0}
                    onError={() => handleImageError(image)}
                  />
                </div>
              ))}
            </div>

            {/* Navigation Buttons - Hidden on mobile, shown on sm+ */}
            {validImages.length > 1 && (
              <>
                {/* Previous Button */}
                <button
                  onClick={goToPrevious}
                  className="hidden sm:flex absolute left-2 sm:left-4 lg:left-6 top-1/2 -translate-y-1/2 z-20 bg-white/80 hover:bg-white shadow-lg rounded-full p-2 sm:p-3 lg:p-4 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-gray-800" />
                </button>

                {/* Next Button */}
                <button
                  onClick={goToNext}
                  className="hidden sm:flex absolute right-2 sm:right-4 lg:right-6 top-1/2 -translate-y-1/2 z-20 bg-white/80 hover:bg-white shadow-lg rounded-full p-2 sm:p-3 lg:p-4 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  aria-label="Next slide"
                >
                  <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-gray-800" />
                </button>
              </>
            )}

            {/* Dot Indicators */}
            {validImages.length > 1 && (
              <div className="absolute bottom-4 sm:bottom-6 lg:bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 sm:gap-3">
                {validImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={`transition-all duration-300 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white ${
                      index === currentIndex
                        ? 'w-8 sm:w-10 lg:w-12 h-2 sm:h-2.5 lg:h-3 bg-white'
                        : 'w-2 sm:w-2.5 lg:w-3 h-2 sm:h-2.5 lg:h-3 bg-white/50 hover:bg-white/75'
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                    aria-current={index === currentIndex ? 'true' : 'false'}
                  />
                ))}
              </div>
            )}

            {/* Touch Swipe Indicators for Mobile */}
            <div className="sm:hidden absolute inset-0 z-10 pointer-events-none">
              <div className="flex h-full">
                <button
                  onClick={goToPrevious}
                  className="flex-1 pointer-events-auto"
                  aria-label="Previous slide (tap left)"
                />
                <button
                  onClick={goToNext}
                  className="flex-1 pointer-events-auto"
                  aria-label="Next slide (tap right)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
