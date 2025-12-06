'use client';

import { MapPin, Clock, Phone, Mail } from 'lucide-react';

const StoreLocationMap = () => {
  // Mock coordinates for Bhopal, Madhya Pradesh (to be replaced with actual address)
  const mockAddress = 'A-41, Bawadiya Kalan, Pallavi Nagar, Bhopal, Madhya Pradesh 462039';
  const mapEmbedUrl = `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3666.5!2d77.4!3d23.25!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjPCsDE1JzAwLjAiTiA3N8KwMjQnMDAuMCJF!5e0!3m2!1sen!2sin!4v1234567890`;

  return (
    <section id="map-section" className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-light text-gray-900 mb-4">
              Visit Our Store
            </h2>
            <p className="text-gray-600 text-lg md:text-xl max-w-2xl mx-auto">
              Experience our exquisite collection in person. We&apos;re here to help you find the
              perfect piece.
            </p>
          </div>

          {/* Map and Info Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Map Container - Takes 2 columns on large screens */}
            <div className="lg:col-span-2 rounded-3xl overflow-hidden shadow-2xl">
              <div className="relative w-full h-[400px] md:h-[500px] lg:h-[600px]">
                <iframe
                  src={mapEmbedUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Store Location Map"
                  className="w-full h-full"
                />
              </div>
            </div>

            {/* Store Information - Takes 1 column */}
            <div className="space-y-6">
              {/* Address Card */}
              <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md">
                    <MapPin className="w-6 h-6 text-rose-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2 text-lg">Address</h3>
                    <p className="text-gray-700 leading-relaxed">{mockAddress}</p>
                  </div>
                </div>
              </div>

              {/* Hours Card */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md">
                    <Clock className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2 text-lg">Store Hours</h3>
                    <p className="text-gray-700">
                      Mon - Sat: 11:00am - 8:00pm
                      <br />
                      Sunday: Closed
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Card */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md">
                    <Phone className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-3 text-lg">Contact</h3>
                    <div className="space-y-2">
                      <a
                        href="tel:9977057045"
                        className="flex items-center gap-2 text-gray-700 hover:text-purple-600 transition-colors"
                      >
                        <Phone className="w-4 h-4" />
                        <span>9977057045</span>
                      </a>
                      <a
                        href="mailto:divyafalthecreations@gmail.com"
                        className="flex items-center gap-2 text-gray-700 hover:text-purple-600 transition-colors break-all"
                      >
                        <Mail className="w-4 h-4" />
                        <span className="text-sm">divyafalthecreations@gmail.com</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Get Directions Button */}
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mockAddress)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center px-8 py-4 bg-gray-900 text-white rounded-full font-semibold hover:bg-gray-800 transition-colors duration-300 shadow-lg hover:shadow-xl"
              >
                Get Directions
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StoreLocationMap;
