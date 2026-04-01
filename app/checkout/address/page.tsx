'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/lib/store/cart';
import Footer from '@/components/layout/footer';
import { ChevronRight, Loader2 } from 'lucide-react';

export default function CheckoutAddressPage() {
  const router = useRouter();
  const { items, address, setAddress } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
  });

  useEffect(() => {
    setMounted(true);
    
    // Check authentication
    const checkAuth = async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login?callbackUrl=/checkout/address');
        return;
      }
      
      setLoading(false);
    };

    checkAuth();

    if (address) {
      setFormData(address);
    }
  }, [address, router]);

  // Protect route if cart is empty
  useEffect(() => {
    if (mounted && !loading && items.length === 0) {
      router.push('/cart');
    }
  }, [mounted, loading, items.length, router]);

  if (!mounted || loading || items.length === 0) {
    return (
      <div className="min-h-screen pt-32 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddress(formData);
    router.push('/checkout/review');
  };

  return (
    <div className="min-h-screen flex flex-col pt-24 font-poppins bg-gray-50">
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12 max-w-4xl">
        {/* Checkout Steps string */}
        <div className="flex items-center gap-2 mb-8 text-sm font-medium">
          <span className="text-gray-500">Cart</span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="text-gray-900 font-bold border-b-2 border-gray-900">Delivery Information</span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="text-gray-400">Order Review</span>
        </div>

        <div className="bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-gray-100">
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-gray-900 mb-8">
            Where should we send your order?
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contact Information */}
              <div className="md:col-span-2 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      required
                      type="text"
                      id="fullName"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition"
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input
                      required
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition"
                      placeholder="jane@example.com"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input
                      required
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="md:col-span-2 space-y-4 mt-6">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Shipping Address</h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                    <input
                      required
                      type="text"
                      id="street"
                      name="street"
                      value={formData.street}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition"
                      placeholder="123 Main St, Apartment 4B"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-1">
                      <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input
                        required
                        type="text"
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition"
                        placeholder="Mumbai"
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">State / Province</label>
                      <input
                        required
                        type="text"
                        id="state"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition"
                        placeholder="Maharashtra"
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                      <input
                        required
                        type="text"
                        id="postalCode"
                        name="postalCode"
                        value={formData.postalCode}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition"
                        placeholder="400001"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-8 flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="w-full sm:w-auto px-6 py-4 text-gray-600 font-bold hover:text-gray-900 transition"
              >
                Return to Cart
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto px-10 py-4 bg-gray-900 text-white rounded-full font-bold hover:bg-black transition shadow-lg"
              >
                Continue to Review
              </button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
