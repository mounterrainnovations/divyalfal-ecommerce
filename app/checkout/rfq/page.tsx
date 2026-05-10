'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCartStore } from '@/lib/store/cart';
import { Loader2, ChevronRight, MessageSquare, ShieldCheck, Mail, Phone, User, MapPin } from 'lucide-react';
import Footer from '@/components/layout/footer';
import { toast, Toaster } from 'sonner';

function RFQFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addItem, address, setAddress, isGuest, setIsGuest } = useCartStore();
  
  const productId = searchParams.get('productId');
  const size = searchParams.get('size') || 'Custom';
  const quantity = parseInt(searchParams.get('quantity') || '1');
  
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({
    fullName: address?.fullName || '',
    email: address?.email || '',
    phone: address?.phone || '',
    street: address?.street || '',
    city: address?.city || '',
    state: address?.state || '',
    postalCode: address?.postalCode || '',
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) return;
    
    setLoading(true);
    try {
      // 1. Fetch product details to ensure we have fresh data
      const prodRes = await fetch(`/api/products/${productId}`);
      if (!prodRes.ok) throw new Error('Product not found');
      const product = await prodRes.json();

      // 2. Prepare the order payload
      const payload = {
        address: formData,
        items: [{
          productId,
          size,
          quantity,
          price: product.price,
        }],
        isGuest: true, // Always treating RFQ as guest-friendly session for now
        type: 'RFQ'
      };

      // 3. Submit RFQ
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const { data } = await response.json();
        setAddress(formData);
        toast.success('Quote request submitted successfully!');
        router.push(`/checkout/success?orderId=${data.id}&type=rfq`);
      } else {
        const err = await response.json();
        toast.error(err.error || 'Failed to submit quote request');
      }
    } catch (err) {
      console.error(err);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <main className="flex-1 container mx-auto px-4 py-8 md:py-16 max-w-5xl">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,380px] gap-12 items-start">
        <div className="space-y-10">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-serif font-light text-stone-900 tracking-tight">Request a Quote</h1>
            <p className="text-stone-500 text-lg font-poppins max-w-xl">
              Provide your details below, and our master craftsmen will reach out with a personalized quote and timeline for your selection.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-10 bg-white p-8 md:p-12 rounded-[2.5rem] border border-stone-100 shadow-xl shadow-stone-200/40">
            <div className="space-y-8">
              <div className="space-y-6">
                <h3 className="text-[11px] font-bold text-stone-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <User className="w-4 h-4 text-rose-900" />
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">Full Name</label>
                    <input
                      required
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder="e.g. Ananya Sharma"
                      className="w-full px-5 h-14 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-4 focus:ring-rose-900/5 focus:border-rose-900 outline-none transition-all font-poppins"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">Email Address</label>
                    <input
                      required
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="ananya@example.com"
                      className="w-full px-5 h-14 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-4 focus:ring-rose-900/5 focus:border-rose-900 outline-none transition-all font-poppins"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">Phone Number</label>
                    <input
                      required
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+91 98765 43210"
                      className="w-full px-5 h-14 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-4 focus:ring-rose-900/5 focus:border-rose-900 outline-none transition-all font-poppins"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-[11px] font-bold text-stone-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-rose-900" />
                  Delivery & Measurements
                </h3>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">Street Address</label>
                    <input
                      required
                      name="street"
                      value={formData.street}
                      onChange={handleInputChange}
                      placeholder="Apartment, Street, Landmark"
                      className="w-full px-5 h-14 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-4 focus:ring-rose-900/5 focus:border-rose-900 outline-none transition-all font-poppins"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">City</label>
                      <input
                        required
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        placeholder="Mumbai"
                        className="w-full px-5 h-14 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-4 focus:ring-rose-900/5 focus:border-rose-900 outline-none transition-all font-poppins"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">State</label>
                      <input
                        required
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        placeholder="Maharashtra"
                        className="w-full px-5 h-14 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-4 focus:ring-rose-900/5 focus:border-rose-900 outline-none transition-all font-poppins"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">Pin Code</label>
                      <input
                        required
                        name="postalCode"
                        value={formData.postalCode}
                        onChange={handleInputChange}
                        placeholder="400001"
                        className="w-full px-5 h-14 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-4 focus:ring-rose-900/5 focus:border-rose-900 outline-none transition-all font-poppins"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-stone-50 flex flex-col sm:flex-row items-center gap-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:flex-1 h-16 bg-rose-950 text-amber-50 rounded-2xl font-bold hover:bg-rose-900 transition-all shadow-xl shadow-rose-950/20 flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                  <>
                    Submit Quote Request <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="w-full sm:w-auto px-8 h-16 text-stone-400 font-bold hover:text-stone-900 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        <aside className="space-y-8 sticky top-32">
          <div className="bg-stone-950 text-amber-50 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-200/10 rounded-full blur-2xl" />
            <h4 className="text-xl font-serif mb-6 relative z-10">Bespoke Experience</h4>
            <div className="space-y-6 relative z-10">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-amber-200" />
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-amber-200/80 mb-1">Authenticity</p>
                  <p className="text-xs text-amber-50/60 leading-relaxed">Every piece is verified by our master curators for heritage weave quality.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5 text-amber-200" />
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-amber-200/80 mb-1">Direct Consultation</p>
                  <p className="text-xs text-amber-50/60 leading-relaxed">Our designers will contact you within 24 hours to discuss customization.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 border border-stone-200 rounded-[2rem] space-y-4">
            <p className="text-[11px] font-bold text-stone-400 uppercase tracking-widest">Questions?</p>
            <div className="space-y-3">
              <a href="mailto:care@divyafal.com" className="flex items-center gap-3 text-sm font-medium text-stone-600 hover:text-rose-900 transition-colors">
                <Mail className="w-4 h-4" /> care@divyafal.com
              </a>
              <a href="tel:+919876543210" className="flex items-center gap-3 text-sm font-medium text-stone-600 hover:text-rose-900 transition-colors">
                <Phone className="w-4 h-4" /> +91 98765 43210
              </a>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

export default function RFQCheckoutPage() {
  return (
    <div className="min-h-screen flex flex-col pt-24 font-poppins bg-[#FDFCFB]">
      <Toaster position="top-center" richColors />
      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-rose-900" />
        </div>
      }>
        <RFQFormContent />
      </Suspense>
      <Footer />
    </div>
  );
}
