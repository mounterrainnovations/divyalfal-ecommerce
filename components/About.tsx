'use client';

import Image from 'next/image';

export default function About() {
  return (
    <section className="bg-white py-20">
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* Left: Boutique image with floating owner card */}
        <div className="relative">
          <div className="rounded-3xl overflow-hidden">
            <Image
              src="/mocks/mock_mostRecommended_common.jpg"
              alt="Divyafal Boutique"
              width={600}
              height={700}
              className="object-cover w-full h-full"
            />
          </div>

          {/* Floating Owner Card */}
          <div className="absolute bottom-6 right-6 bg-white rounded-2xl shadow-lg p-4 flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-full overflow-hidden">
              <Image
                src="/mocks/mock_mostRecommended_common.jpg"
                alt="Owner"
                fill
                className="object-cover"
              />
            </div>
            <div>
              <p className="font-medium text-gray-900">Alpa Rawal</p>
              <p className="text-sm text-gray-600">Founder & Designer</p>
            </div>
          </div>
        </div>

        {/* Right: Text + Stats */}
        <div>
          <h2 className="text-3xl md:text-4xl font-serif font-light text-gray-900 mb-6">
            About Divyafal
          </h2>
          <p className="text-gray-700 leading-relaxed mb-8">
            Founded with a passion for timeless elegance, Divyafal brings together traditional
            artistry and contemporary design. Every piece is crafted to embody grace, individuality,
            and the heritage of Indian couture.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-2xl p-6 text-center shadow-sm">
              <h3 className="text-3xl font-serif text-gray-900">15</h3>
              <p className="text-sm text-gray-600 mt-2">Years of Excellence</p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-6 text-center shadow-sm">
              <h3 className="text-3xl font-serif text-gray-900">5000+</h3>
              <p className="text-sm text-gray-600 mt-2">Happy Clients</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
