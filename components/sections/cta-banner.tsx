'use client';

import Link from 'next/link';
import { Video, Store } from 'lucide-react';

const CTABanner = () => {
  return (
    <section className="bg-white py-12 xl:py-16">
      <div className="max-w-7xl mx-auto px-4 xl:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Virtual Styling Session Card */}
          <div className="relative group overflow-hidden rounded-3xl bg-linear-to-br from-rose-100 via-pink-50 to-purple-100 p-8 xl:p-12 transition-transform duration-300 hover:scale-[1.02]">
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/80 backdrop-blur-sm mb-6">
                <Video className="w-7 h-7 text-rose-600" />
              </div>

              <h3 className="text-2xl xl:text-3xl font-serif font-light text-gray-900 mb-3">
                Shop via Video Call
              </h3>
              <p className="text-gray-700 mb-6 text-base xl:text-lg">
                Get a free virtual styling session with our expert designers from the comfort of
                your home.
              </p>

              <Link
                href="/contact-us#contact-section"
                className="inline-block px-8 py-3 bg-gray-900 text-white rounded-full font-medium hover:bg-gray-800 transition-colors"
              >
                Book an Appointment
              </Link>
            </div>

            {/* Decorative gradient overlay */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-linear-to-bl from-rose-200/40 to-transparent rounded-full blur-3xl" />
          </div>

          {/* Store Visit Card */}
          <div className="relative group overflow-hidden rounded-3xl bg-linear-to-br from-emerald-100 via-teal-50 to-cyan-100 p-8 xl:p-12 transition-transform duration-300 hover:scale-[1.02]">
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/80 backdrop-blur-sm mb-6">
                <Store className="w-7 h-7 text-emerald-600" />
              </div>

              <h3 className="text-2xl xl:text-3xl font-serif font-light text-gray-900 mb-3">
                The Stylist Session
              </h3>
              <p className="text-gray-700 mb-6 text-base xl:text-lg">
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

            {/* Decorative gradient overlay */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-linear-to-bl from-emerald-200/40 to-transparent rounded-full blur-3xl" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTABanner;
