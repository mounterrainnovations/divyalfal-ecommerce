'use client';

import Image from 'next/image';
import { useState, useEffect, useMemo } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface ProductHeroProps {
  photos: string[];
  productName: string;
}

const ProductHero = ({ photos, productName }: ProductHeroProps) => {
  const images = useMemo(
    () => (photos.length > 0 ? photos : ['/mocks/mock_mostRecommended_common.jpg']),
    [photos]
  );

  const [selectedImage, setSelectedImage] = useState(0);
  const [loadingImages, setLoadingImages] = useState<Record<number, boolean>>({ 0: false });

  const isImageLoaded = loadingImages[selectedImage] ?? false;

  // Preload adjacent images for smoother navigation
  useEffect(() => {
    const preloadImage = (index: number) => {
      if (images[index] && !loadingImages[index]) {
        // Use HTMLImageElement to avoid conflict with Next.js Image component
        const img = document.createElement('img');
        img.onload = () => {
          setLoadingImages(prev => ({ ...prev, [index]: true }));
        };
        img.src = images[index];
      }
    };

    // Preload current image if not loaded
    preloadImage(selectedImage);
    
    // Preload next and previous images
    const nextIndex = (selectedImage + 1) % images.length;
    const prevIndex = (selectedImage - 1 + images.length) % images.length;
    preloadImage(nextIndex);
    preloadImage(prevIndex);
  }, [selectedImage, images, loadingImages]);

  const nextImage = () => {
    setSelectedImage(prev => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setSelectedImage(prev => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="space-y-6 font-poppins">
      {/* Main Image with Navigation */}
      <div className="relative rounded-lg overflow-hidden bg-gray-100">
        <div className="relative aspect-3/4 w-full">
          {/* Loading skeleton */}
          {!isImageLoaded && (
            <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer bg-[length:200%_100%]" />
          )}
          
          <Image
            src={images[selectedImage]}
            alt={productName}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            quality={90}
            className={`object-cover transition-opacity duration-300 ${
              isImageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            priority
            onLoad={() => setLoadingImages(prev => ({ ...prev, [selectedImage]: true }))}
          />
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={prevImage}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 transition"
          aria-label="Previous image"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={nextImage}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 transition"
          aria-label="Next image"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Thumbnail Gallery */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {images.map((img, index) => (
          <button
            key={index}
            onClick={() => setSelectedImage(index)}
            className={`relative shrink-0 w-20 h-24 rounded-md overflow-hidden border-2 transition ${
              selectedImage === index ? 'border-black' : 'border-transparent hover:border-gray-400'
            }`}
          >
            <Image
              src={img}
              alt={`${productName} thumbnail ${index + 1}`}
              fill
              sizes="80px"
              quality={75}
              className="object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
};

export default ProductHero;
