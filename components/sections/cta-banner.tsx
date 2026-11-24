'use client';

import Link from 'next/link';
import { Video, Store } from 'lucide-react';

const CTABanner = () => {
  return (
    <section className="bg-white py-14 md:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Virtual Styling Session Card */}
          <div className="relative group overflow-hidden rounded-lg border border-gray-200 bg-[#F7F4EF] p-6 sm:p-8 xl:p-12 transition-colors duration-300 hover:border-gray-300">
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/80 backdrop-blur-sm mb-6">
                <Video className="w-7 h-7 text-rose-600" />
              </div>

              <h3 className="text-xl sm:text-2xl xl:text-3xl font-serif font-light text-gray-900 mb-3">
                Shop via Video Call
              </h3>
              <p className="text-gray-700 mb-6 text-sm sm:text-base xl:text-lg">
                Get a free virtual styling session with our expert designers from the comfort of
                your home.
              </p>

              <Link
                href="https://wa.me/919977057045"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-8 py-3 bg-gray-900 text-white rounded-full font-medium hover:bg-gray-800 transition-colors"
              >
                Book an Appointment
              </Link>
            </div>
            
          </div>

          {/* Store Visit Card */}
          <div className="relative group overflow-hidden rounded-lg border border-gray-200 bg-[#F2F0EA] p-6 sm:p-8 xl:p-12 transition-colors duration-300 hover:border-gray-300">
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/80 backdrop-blur-sm mb-6">
                <Store className="w-7 h-7 text-emerald-600" />
              </div>

              <h3 className="text-xl sm:text-2xl xl:text-3xl font-serif font-light text-gray-900 mb-3">
                The Stylist Session
              </h3>
              <p className="text-gray-700 mb-6 text-sm sm:text-base xl:text-lg">
                Visit our store for the best in-person experience with personalized styling and
                fitting.
              </p>

              <Link
                href="/contact-us#map-section"
                className="inline-block px-8 py-3 bg-gray-900 text-white rounded-full font-medium hover:bg-gray-800 transition-colors"
              >
                Visit Store
              </Link>
            </div>
            
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTABanner;
