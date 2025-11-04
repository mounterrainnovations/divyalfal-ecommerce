'use client';

import Image from 'next/image';
import { useState } from 'react';

const ContactForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement form submission logic (e.g., API call)
    // For now, form data is captured in formData state
  };

  return (
    <section className="py-16 md:py-24 lg:py-32">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 max-w-7xl mx-auto overflow-hidden rounded-2xl shadow-2xl">
          {/* Left: Contact Info with Image */}
          <div className="relative min-h-[500px] lg:min-h-[700px] overflow-hidden group">
            <Image
              src="/photo.jpg"
              alt="Contact Us"
              fill
              className="object-cover transition-transform duration-700 ease-in-out group-hover:scale-110"
              style={{ objectPosition: 'center top' }}
            />
            {/* Overlay with contact info */}
            <div className="absolute inset-0 bg-black/40 flex flex-col justify-end p-8 md:p-12 text-white">
              <h2 className="text-4xl md:text-5xl font-serif mb-8">Contact Us</h2>

              <div className="space-y-4 mb-6">
                <p className="text-base md:text-lg leading-relaxed">
                  A-41, Bawadiya Kalan, Pallavi Nagar, Bhopal, Madhya Pradesh 462039
                </p>
                <p className="text-base md:text-lg">
                  Mon - Sat, 11:00am - 8:00pm,
                  <br />
                  Sunday- Closed
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-lg md:text-xl font-semibold">Phone: 9977057045</p>
                <p className="text-lg md:text-xl font-semibold">
                  Gmail: divyafalthecreations@gmail.com
                </p>
              </div>
            </div>
          </div>

          {/* Right: Contact Form */}
          <div className="bg-[#F3EEEA] p-8 md:p-12 lg:p-16 flex flex-col justify-center">
            <h2 className="text-4xl md:text-5xl font-serif text-center mb-8 md:mb-12">
              Get in Touch
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name and Email Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Name"
                    required
                    className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 transition"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Email"
                    required
                    className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 transition"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Phone No."
                  className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 transition"
                />
              </div>

              {/* Message */}
              <div>
                <label htmlFor="message" className="block text-sm font-medium mb-2">
                  Your message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Your message"
                  rows={5}
                  className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 transition resize-none"
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-center pt-4">
                <button
                  type="submit"
                  className="px-12 py-3 bg-black text-white rounded-full font-semibold hover:bg-gray-800 transition-colors duration-300"
                >
                  Submit Now
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactForm;
