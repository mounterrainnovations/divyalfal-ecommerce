'use client';

import Image from 'next/image';

export default function About() {
  return (
    <section className="bg-white">
      <div className="flex flex-col md:flex-row md:px-8 xl:px-20 relative py-10">
        {/* Left Section: Image with floating card */}
        <div className="w-full md:w-1/2 relative px-6 md:px-0 mb-12 md:mb-0">
          <div className="rounded-3xl overflow-hidden shadow-sm transform md:scale-95 origin-center">
            <Image
              src="/mocks/mock_mostRecommended_common.jpg"
              alt="Divyafal Boutique"
              width={500}
              height={600}
              className="object-cover w-full h-full"
            />
          </div>

          {/* 
          //! Floating Owner Card
          */}

          {/* <div className="absolute bottom-8 right-8 bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-5 flex items-center gap-5 border border-gray-100">
            <div className="relative w-20 h-20 rounded-full overflow-hidden ring-2 ring-gray-200">
              <Image
                src="/mocks/mock_mostRecommended_common.jpg"
                alt="Owner"
                fill
                className="object-cover"
              />
            </div>

            <div>
              <p className="font-medium text-gray-900 text-lg">Alpa Rawal</p>
              <p className="text-sm text-gray-600">Founder & Designer</p>
            </div>
          </div> */}
        </div>

        {/* Right Section: Text and Stats */}
        <div className="flex-1 px-6 md:px-8 xl:px-12 flex flex-col justify-center">
          <h2 className="text-4xl md:text-5xl font-serif font-light text-gray-900 mb-8">
            About Divyafal
          </h2>

          <p className="text-gray-700 leading-relaxed mb-10 text-base md:text-lg">
            Founded with a passion for timeless elegance, Divyafal brings together traditional
            artistry and contemporary design. Every piece is crafted to embody grace, individuality,
            and the heritage of Indian couture.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-6 max-w-sm">
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
