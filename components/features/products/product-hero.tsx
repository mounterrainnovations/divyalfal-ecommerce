'use client';

import Image from 'next/image';
import { useState } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface ProductHeroProps {
  photos: string[];
  productName: string;
}

const ProductHero = ({ photos, productName }: ProductHeroProps) => {
  const images =
    photos.length > 0 ? photos : ['/mocks/mock_mostRecommended_common.jpg'];

  const [selectedImage, setSelectedImage] = useState(0);

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
          <Image
            src={images[selectedImage]}
            alt={productName}
            fill
            className="object-cover"
            priority
            unoptimized={images[selectedImage].startsWith('http')}
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
              selectedImage === index ? 'border-black' : 'border-transparent'
            }`}
          >
            <Image
              src={img}
              alt={`${productName} thumbnail ${index + 1}`}
              fill
              className="object-cover"
              unoptimized={img.startsWith('http')}
            />
          </button>
        ))}
      </div>
    </div>
  );
};

export default ProductHero;
