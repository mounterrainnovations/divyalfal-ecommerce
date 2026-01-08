'use client';

import Link from 'next/link';
import { GraduationCap } from 'lucide-react';

const VirasathAcademy = () => {
  return (
    <section className="bg-white py-12 xl:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 xl:px-8">
        <div className="relative group overflow-hidden rounded-3xl bg-gradient-to-br from-amber-100 via-orange-50 to-rose-100 p-8 sm:p-12 xl:p-16 transition-transform duration-300 hover:scale-[1.01]">
          <div className="relative z-10 text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/80 backdrop-blur-sm mb-6">
              <GraduationCap className="w-9 h-9 text-amber-600" />
            </div>

            <h2 className="text-3xl sm:text-4xl xl:text-5xl font-serif font-light text-gray-900 mb-4">
              Virasath Academy
            </h2>
            <p className="text-gray-700 mb-8 text-base sm:text-lg xl:text-xl leading-relaxed">
              Discover the art of traditional Indian fashion and design. Join our academy to learn
              from expert artisans and designers, preserving heritage while creating contemporary
              masterpieces.
            </p>

            <Link
              href="/virasath-academy"
              className="inline-block px-10 py-4 bg-gray-900 text-white rounded-full font-medium hover:bg-gray-800 transition-colors text-base sm:text-lg"
            >
              Apply Now
            </Link>
          </div>

          {/* Decorative gradient overlays */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-200/40 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-rose-200/40 to-transparent rounded-full blur-3xl" />
        </div>
      </div>
    </section>
  );
};

export default VirasathAcademy;

