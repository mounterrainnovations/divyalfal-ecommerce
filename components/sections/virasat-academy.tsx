'use client';

import Link from 'next/link';
import { GraduationCap } from 'lucide-react';

const VirasatAcademy = () => {
  return (
    <section className="bg-white py-14 md:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative group overflow-hidden rounded-lg border border-gray-200 bg-[#F7F4EF] p-8 sm:p-12 xl:p-16">
          <div className="relative z-10 text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/80 backdrop-blur-sm mb-6">
              <GraduationCap className="w-9 h-9 text-amber-600" />
            </div>

            <h2 className="font-serif font-normal text-4xl sm:text-5xl xl:text-6xl text-gray-900 mb-4">
              Virasat Academy
            </h2>
            <p className="text-gray-700 mb-8 text-base sm:text-lg xl:text-xl leading-relaxed">
              Discover the art of traditional Indian fashion and design. Join our academy to learn
              from expert artisans and designers, preserving heritage while creating contemporary
              masterpieces.
            </p>

            <Link
              href="/virasat-academy"
              className="inline-block px-10 py-4 bg-gray-900 text-white rounded-full font-medium hover:bg-gray-800 transition-colors text-base sm:text-lg"
            >
              Apply Now
            </Link>
          </div>
          
        </div>
      </div>
    </section>
  );
};

export default VirasatAcademy;

