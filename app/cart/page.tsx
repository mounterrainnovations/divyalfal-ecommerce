'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Minus, Plus, Trash2, ArrowRight, ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/lib/store/cart';
import Footer from '@/components/layout/footer';
import { formatPrice } from '@/lib/common/product-interfaces';

export default function CartPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { items, removeItem, updateQuantity, getTotalPrice, getTotalItems } = useCartStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen pt-32 pb-16 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-amber-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  const subtotal = getTotalPrice();
  const shipping = subtotal > 5000 ? 0 : 150;
  const total = subtotal + shipping;

  return (
    <div className="min-h-screen flex flex-col pt-24 font-poppins bg-gray-50">
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12 mix-w-7xl">
        <h1 className="text-3xl md:text-5xl font-serif font-bold text-gray-900 mb-8 md:mb-12">
          Your Shopping Cart
        </h1>

        {items.length === 0 ? (
          <div className="text-center py-16 md:py-24 bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center">
            <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mb-6">
              <ShoppingBag className="w-10 h-10 text-amber-500" />
            </div>
            <h2 className="text-2xl font-bold font-serif text-gray-900 mb-4">
              Your cart is empty
            </h2>
            <p className="text-gray-500 mb-8 max-w-md">
              Looks like you haven&apos;t added anything to your cart yet. Explore our collection of premium heritage fashion.
            </p>
            <Link
              href="/products"
              className="inline-flex items-center px-8 py-4 bg-amber-600 text-white rounded-full font-bold hover:bg-amber-700 transition shadow-md shadow-amber-200"
            >
              Continue Shopping <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Cart Items */}
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
                <div className="hidden sm:grid grid-cols-12 gap-4 pb-4 border-b text-sm font-bold text-gray-400 uppercase tracking-widest">
                  <div className="col-span-6">Product</div>
                  <div className="col-span-3 text-center">Quantity</div>
                  <div className="col-span-3 text-right">Total</div>
                </div>

                <div className="divide-y divide-gray-100">
                  {items.map((item) => {
                    const price = item.product.sale && item.product.salePrice ? item.product.salePrice : item.product.price;
                    const itemTotal = price * item.quantity;
                    const imageUrl = item.product.image || '/mocks/mock_mostRecommended_common.jpg';

                    return (
                      <div key={item.id} className="py-6 sm:py-8 sm:grid sm:grid-cols-12 sm:gap-4 sm:items-center">
                        {/* Mobile view wrap */}
                        <div className="sm:col-span-6 flex gap-4">
                          <div className="w-24 h-32 sm:w-28 sm:h-36 shrink-0 rounded-xl overflow-hidden bg-gray-100 border relative">
                            <Image
                              src={imageUrl}
                              alt={item.product.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex flex-col justify-center">
                            <Link href={`/product/${item.product.id}`} className="font-bold text-gray-900 hover:text-amber-600 transition text-sm sm:text-base line-clamp-2 mb-1">
                              {item.product.name}
                            </Link>
                            <p className="text-xs sm:text-sm text-gray-500 font-medium mb-1">
                              Size: <span className="font-bold text-gray-900">{item.size}</span>
                            </p>
                            
                            {item.size === 'Custom' && item.customMeasurements && (
                              <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg mt-2 font-medium border border-amber-100 inline-block">
                                <span className="mr-2">Bust: {item.customMeasurements.bust}&quot;</span>
                                <span className="mr-2">Waist: {item.customMeasurements.waist}&quot;</span>
                                <span>Hips: {item.customMeasurements.hips}&quot;</span>
                              </div>
                            )}

                            <div className="mt-auto sm:hidden">
                              <p className="font-bold text-gray-900 mt-2">{formatPrice(price)}</p>
                            </div>
                          </div>
                        </div>

                        {/* Quantity controls */}
                        <div className="sm:col-span-3 flex items-center justify-between sm:justify-center mt-4 sm:mt-0">
                          <div className="flex items-center border border-gray-200 rounded-full bg-gray-50 p-1">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white hover:shadow-sm transition text-gray-600"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center text-sm font-bold text-gray-900">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white hover:shadow-sm transition text-gray-600"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Mobile Remove */}
                          <button
                            onClick={() => removeItem(item.id)}
                            className="sm:hidden p-2 text-red-500 hover:bg-red-50 rounded-full transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Total Price & Desktop Remove */}
                        <div className="hidden sm:flex sm:col-span-3 items-center justify-end gap-4">
                          <p className="font-bold text-gray-900">{formatPrice(itemTotal)}</p>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition"
                            title="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-4 translate-y-0">
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8 sticky top-32">
                <h2 className="text-xl font-serif font-bold text-gray-900 mb-6">Order Summary</h2>
                
                <div className="space-y-4 text-sm font-medium text-gray-600 border-b pb-6">
                  <div className="flex justify-between">
                    <span>Subtotal ({getTotalItems()} items)</span>
                    <span className="text-gray-900 font-bold">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping Estimate</span>
                    {shipping === 0 ? (
                      <span className="text-emerald-600 font-bold uppercase tracking-wider text-xs flex items-center">Free</span>
                    ) : (
                      <span className="text-gray-900 font-bold">{formatPrice(shipping)}</span>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-6 mb-8">
                  <span className="text-base font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-gray-900 tracking-tight">{formatPrice(total)}</span>
                </div>

                <button
                  onClick={async () => {
                    const { createClient } = await import('@/lib/supabase/client');
                    const supabase = createClient();
                    const { data: { user } } = await supabase.auth.getUser();
                    
                    if (!user) {
                      router.push('/login?callbackUrl=/checkout/address');
                      return;
                    }
                    router.push('/checkout/address');
                  }}
                  className="w-full py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-full font-bold shadow-lg shadow-amber-200 transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2"
                >
                  Proceed to Checkout <ArrowRight className="w-5 h-5" />
                </button>
                
                <p className="text-xs text-center text-gray-400 mt-4 font-medium flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Secure Checkout
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
