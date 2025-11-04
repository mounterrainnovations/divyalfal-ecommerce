'use client';

import Image from 'next/image';

interface Testimonial {
  name: string;
  message: string;
  image: string;
  rating: number;
}

const testimonials: Testimonial[] = [
  {
    name: 'Ivory Saree Set',
    message:
      'This Ivory Saree Set is absolutely stunning and perfect for special occasions. Impeccable!',
    image: '/mocks/mock_mostRecommended_common.jpg',
    rating: 5,
  },
  {
    name: 'Blue Indo-Western',
    message:
      'The Blue Indo-Western combines traditional elegance with modern style. Absolutely love the fit and quality!',
    image: '/mocks/mock_mostRecommended_common.jpg',
    rating: 5,
  },
  {
    name: 'Purple Banarasi Saree',
    message:
      'A masterpiece of Banarasi weaving! The Purple Banarasi Saree is luxurious and timeless.',
    image: '/mocks/mock_mostRecommended_common.jpg',
    rating: 5,
  },
  {
    name: 'Gold Silk Lehenga',
    message:
      'The Gold Silk Lehenga is regal and perfect for weddings. The detailing is extraordinary!',
    image: '/mocks/mock_mostRecommended_common.jpg',
    rating: 5,
  },
  {
    name: 'Emerald Silk Saree',
    message:
      'This Emerald Silk Saree drapes beautifully and adds a touch of sophistication to any ensemble.',
    image: '/mocks/mock_mostRecommended_common.jpg',
    rating: 5,
  },
];

const Testimonials = () => {
  return (
    <section className="py-20 bg-gray-50">
      <div className="overflow-x-hidden px-4 md:px-6 md:max-w-6xl md:mx-auto">
        <h2 className="text-3xl md:text-4xl font-semibold text-center text-gray-800 mb-12">
          What Our Customers Say
        </h2>

        <div className="flex gap-4 pb-4 snap-x snap-mandatory overflow-x-auto max-w-5xl mx-auto px-2">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="shrink-0 w-60 md:w-72 rounded-2xl overflow-hidden group shadow-sm hover:shadow-md transition-all duration-300 snap-start"
            >
              <div className="relative aspect-3/4 bg-gray-50">
                <Image
                  src={t.image}
                  alt={t.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-4 bg-white">
                <h3 className="font-medium text-gray-700 truncate">{t.name}</h3>
                <p className="text-sm text-gray-500 mt-2">{t.message}</p>
                <div className="flex justify-start mt-3">
                  <div className="flex gap-1">
                    {[...Array(t.rating)].map((_, j) => (
                      <svg
                        key={j}
                        width="16"
                        height="16"
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
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
