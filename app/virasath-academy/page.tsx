'use client';

import { useState } from 'react';
import { GraduationCap, CheckCircle2 } from 'lucide-react';
import Navbar from '@/components/layout/navbar';
import Footer from '@/components/layout/footer';

export default function VirasathAcademyPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    dob: '',
    phone: '',
    city: '',
    state: '',
    country: 'India',
    gender: '',
    comments: '',
  });

  const [showSuccess, setShowSuccess] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Show success notification
    setShowSuccess(true);

    // Clear form
    setFormData({
      fullName: '',
      dob: '',
      phone: '',
      city: '',
      state: '',
      country: 'India',
      gender: '',
      comments: '',
    });

    // Hide success notification after 5 seconds
    setTimeout(() => {
      setShowSuccess(false);
    }, 5000);
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-amber-100 via-orange-100 to-rose-100 py-16 sm:py-20 xl:py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 xl:px-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/80 backdrop-blur-sm mb-6">
              <GraduationCap className="w-11 h-11 text-amber-600" />
            </div>
            <h1 className="text-4xl sm:text-5xl xl:text-6xl font-serif font-light text-gray-900 mb-6">
              Virasath Academy
            </h1>
            <p className="text-lg sm:text-xl text-gray-700 leading-relaxed max-w-2xl mx-auto">
              Embark on a journey to master the art of traditional Indian fashion design. Apply now
              to join our esteemed academy.
            </p>
          </div>
        </div>

        {/* Form Section */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 xl:px-8 py-12 sm:py-16">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-amber-100 to-rose-100 p-6 sm:p-8">
              <h2 className="text-2xl sm:text-3xl font-serif font-light text-gray-900 text-center">
                Application Form
              </h2>
              <p className="text-center text-gray-700 mt-2">
                Fill in your details to apply for Virasath Academy
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 sm:p-8 xl:p-12 space-y-6">
              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label htmlFor="dob" className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="dob"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 XXXXX XXXXX"
                  required
                  pattern="[0-9+\s-]+"
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                />
              </div>

              {/* Location - City and State */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="Enter your city"
                    required
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
                    State <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="Enter your state"
                    required
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              {/* Country */}
              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                  Country <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  placeholder="Country"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                />
              </div>

              {/* Gender */}
              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
                  Gender <span className="text-red-500">*</span>
                </label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="non-binary">Non-Binary</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
              </div>

              {/* Additional Comments */}
              <div>
                <label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Comments
                </label>
                <textarea
                  id="comments"
                  name="comments"
                  value={formData.comments}
                  onChange={handleChange}
                  placeholder="Tell us more about yourself and why you want to join Virasath Academy..."
                  rows={5}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition resize-none"
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-center pt-4">
                <button
                  type="submit"
                  className="px-12 py-4 bg-gradient-to-r from-amber-600 to-rose-600 text-white rounded-full font-semibold hover:from-amber-700 hover:to-rose-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Success Notification */}
        {showSuccess && (
          <div className="fixed bottom-8 right-8 bg-white rounded-2xl shadow-2xl p-6 max-w-md animate-in slide-in-from-bottom-5 z-50">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Submission Successful!
                </h3>
                <p className="text-gray-600">
                  Thank you! Stay tuned while we look into your application.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

