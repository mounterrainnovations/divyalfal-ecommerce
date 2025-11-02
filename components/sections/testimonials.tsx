'use client';

import Image from 'next/image';

interface Testimonial {
  name: string;
  role: string;
  message: string;
  image: string;
  rating: number;
}

const testimonials: Testimonial[] = [
  {
    name: 'Mayank Ramani',
    role: 'CEO TPC',
    message:
      "I've been using Divyafal's handcrafted products for nearly two years, and the quality and detailing are just unmatched. Every piece feels personal.",
    image: '/mocks/mock_mayank.webp',
    rating: 5,
  },
  {
    name: 'Gyanendra Rajvaidhya',
    role: 'COO TPC',
    message:
      'Each product is elegant, vibrant, and premium. I often use them for shoots — they add such a warm, organic aesthetic to my visuals.',
    image: '/mocks/mock_gyan.webp',
    rating: 5,
  },
  {
    name: 'Pranav Nair',
    role: 'CTO TPC',
    message:
      'A beautiful fusion of creativity and craftsmanship. The attention to detail in every Divyafal piece truly sets them apart.',
    image: '/mocks/mock_pranav.jpg',
    rating: 5,
  },
];

const Testimonials = () => {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-semibold text-center text-gray-800 mb-12">
          What Our Customers Say
        </h2>

        <div className="flex flex-wrap items-center justify-center pt-4 md:pt-8 gap-14 md:gap-8">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="relative text-sm w-80 border border-gray-200 rounded-xl bg-white shadow-lg shadow-black/5 pb-8 pt-14 px-6 transition-all duration-300 hover:shadow-xl"
            >
              {/* Profile Image */}
              <div className="absolute -top-12 left-1/2 transform -translate-x-1/2">
                <Image
                  src={t.image}
                  alt={t.name}
                  width={96}
                  height={96}
                  className="rounded-full object-cover h-24 w-24 border-4 border-white shadow-md"
                />
              </div>

              {/* Name + Role */}
              <div className="text-center mt-2">
                <h3 className="text-lg font-medium text-gray-800">{t.name}</h3>
                <p className="text-gray-600 text-sm">{t.role}</p>
              </div>

              {/* Message */}
              <p className="text-gray-500 text-center mt-4">{t.message}</p>

              {/* Rating */}
              <div className="flex justify-center mt-5">
                <div className="flex gap-1">
                  {[...Array(t.rating)].map((_, j) => (
                    <svg
                      key={j}
                      width="18"
                      height="18"
                      viewBox="0 0 22 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10.525.464a.5.5 0 0 1 .95 0l2.107 6.482a.5.5 0 0 0 .475.346h6.817a.5.5 0 0 1 .294.904l-5.515 4.007a.5.5 0 0 0-.181.559l2.106 6.483a.5.5 0 0 1-.77.559l-5.514-4.007a.5.5 0 0 0-.588 0l-5.514 4.007a.5.5 0 0 1-.77-.56l2.106-6.482a.5.5 0 0 0-.181-.56L.832 8.197a.5.5 0 0 1 .294-.904h6.817a.5.5 0 0 0 .475-.346z"
                        fill="#FF532E"
                      />
                    </svg>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
