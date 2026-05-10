'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/lib/store/cart';
import { ArrowRight, User, ShoppingBag, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Footer from '@/components/layout/footer';

export default function CheckoutAuthPage() {
  const router = useRouter();
  const { items, setIsGuest } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    
    const checkAuth = async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setIsGuest(false);
        router.push('/checkout/address');
        return;
      }
      setLoading(false);
    };

    checkAuth();
  }, [router, setIsGuest]);

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

  const handleGuestCheckout = () => {
    setIsGuest(true);
    router.push('/checkout/address');
  };

  return (
    <div className="min-h-screen flex flex-col pt-24 font-poppins bg-gray-50">
      <main className="flex-1 container mx-auto px-4 py-8 md:py-16 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-gray-900 mb-4">
            How would you like to proceed?
          </h1>
          <p className="text-gray-500 max-w-lg mx-auto">
            Sign in for a faster checkout and order tracking, or continue as a guest for a quick purchase.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Sign In Option */}
          <div className="bg-white p-8 md:p-10 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center group hover:shadow-xl hover:shadow-amber-100/50 transition-all duration-300">
            <div className="w-20 h-20 bg-amber-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <User className="w-10 h-10 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold font-serif text-gray-900 mb-4">I have an account</h2>
            <p className="text-gray-500 mb-8 flex-1">
              Sign in to use your saved addresses and track your order in your dashboard.
            </p>
            <Link
              href="/login?callbackUrl=/checkout/address"
              className="w-full py-4 bg-gray-900 text-white rounded-full font-bold hover:bg-black transition flex items-center justify-center gap-2"
            >
              Sign In <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          {/* Guest Checkout Option */}
          <div className="bg-white p-8 md:p-10 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center group hover:shadow-xl hover:shadow-orange-100/50 transition-all duration-300">
            <div className="w-20 h-20 bg-orange-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <ShoppingBag className="w-10 h-10 text-orange-600" />
            </div>
            <h2 className="text-2xl font-bold font-serif text-gray-900 mb-4">Checkout as Guest</h2>
            <p className="text-gray-500 mb-8 flex-1">
              No account? No problem. You can place your order now and create an account later.
            </p>
            <button
              onClick={handleGuestCheckout}
              className="w-full py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-full font-bold hover:from-amber-700 hover:to-orange-700 transition flex items-center justify-center gap-2 shadow-lg shadow-amber-200"
            >
              Guest Checkout <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
