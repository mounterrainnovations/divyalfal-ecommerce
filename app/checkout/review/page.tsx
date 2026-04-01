'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/lib/store/cart';
import Footer from '@/components/layout/footer';
import { ChevronRight, Loader2, MapPin, Package, CreditCard } from 'lucide-react';
import Image from 'next/image';
import { formatPrice } from '@/lib/common/product-interfaces';

export default function CheckoutReviewPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const { items, address, getTotalPrice, getTotalItems, clearCart } = useCartStore();
  
  const subtotal = getTotalPrice();
  const shipping = subtotal > 5000 ? 0 : 150;
  const total = subtotal + shipping;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Protect route
  useEffect(() => {
    if (mounted) {
      if (items.length === 0) {
        router.push('/cart');
      } else if (!address) {
        router.push('/checkout/address');
      }
    }
  }, [mounted, items.length, address, router]);

  if (!mounted || items.length === 0 || !address) {
    return (
      <div className="min-h-screen pt-32 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  const handlePlaceOrder = async () => {
    setIsSubmitting(true);
    setError('');
    
    try {
      // Create simplified payload for creating the Mock Order in database
      const orderPayload = {
        address,
        items: items.map(item => ({
          productId: item.productId,
          variantId: item.product.variants?.find(v => v.size === item.size)?.id || null, // Will be null for Custom if custom size isn't linked, though our mock data has 'Custom' variant
          size: item.size,
          quantity: item.quantity,
          price: item.product.sale && item.product.salePrice ? item.product.salePrice : item.product.price,
          customMeasurements: item.customMeasurements,
        })),
        totalAmount: total,
      };

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      if (!response.ok) {
        throw new Error('Failed to create order');
      }

      const { data } = await response.json();
      
      clearCart();
      router.push(`/checkout/success?orderId=${data.id}`);
      
    } catch (err) {
      console.error('Checkout error:', err);
      setError('An error occurred while placing your order. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col pt-24 font-poppins bg-gray-50">
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12 max-w-6xl">
        {/* Checkout Steps string */}
        <div className="flex items-center gap-2 mb-8 text-sm font-medium">
          <span className="text-gray-500">Cart</span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="text-gray-500 cursor-pointer hover:text-gray-900 transition" onClick={() => router.push('/checkout/address')}>Delivery Information</span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="text-gray-900 font-bold border-b-2 border-gray-900">Order Review</span>
        </div>

        <h1 className="text-2xl md:text-3xl font-serif font-bold text-gray-900 mb-8">
          Review & Confirm
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-6">
            
            {/* Shipping details */}
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 flex gap-4">
              <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center shrink-0">
                <MapPin className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Delivery Address</h3>
                  <button onClick={() => router.push('/checkout/address')} className="text-sm font-bold text-amber-600 hover:text-amber-700 transition">
                    Edit
                  </button>
                </div>
                <p className="text-gray-700 font-medium">{address.fullName}</p>
                <p className="text-sm text-gray-500 mt-1">{address.street}, {address.city}, {address.state} {address.postalCode}</p>
                <p className="text-sm text-gray-500 mt-1">{address.email} • {address.phone}</p>
              </div>
            </div>

            {/* Payment Details */}
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 flex gap-4 opacity-70">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                <CreditCard className="w-6 h-6 text-gray-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Method</h3>
                <p className="text-gray-500 text-sm">Prepaid Order (Mock Gateway Integration Pending)</p>
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex gap-4 mb-6">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center shrink-0">
                  <Package className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Your Items</h3>
                  <p className="text-sm text-gray-500">{getTotalItems()} Items Total</p>
                </div>
              </div>
              
              <div className="divide-y divide-gray-100">
                {items.map((item) => {
                  const price = item.product.sale && item.product.salePrice ? item.product.salePrice : item.product.price;
                  const itemTotal = price * item.quantity;
                  const imageUrl = item.product.image || '/mocks/mock_mostRecommended_common.jpg';

                  return (
                    <div key={item.id} className="py-4 flex gap-4">
                      <div className="w-16 h-20 shrink-0 rounded-lg overflow-hidden bg-gray-100 border relative">
                        <Image src={imageUrl} alt={item.product.name} fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-sm line-clamp-1">{item.product.name}</p>
                        <p className="text-xs text-gray-500 mt-1">Size: {item.size} | Qty: {item.quantity}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-gray-900">{formatPrice(itemTotal)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          <div className="lg:col-span-4 translate-y-0">
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8 sticky top-32">
                <h2 className="text-xl font-serif font-bold text-gray-900 mb-6">Order Total</h2>
                
                <div className="space-y-4 text-sm font-medium text-gray-600 border-b pb-6">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="text-gray-900 font-bold">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    {shipping === 0 ? (
                      <span className="text-emerald-600 font-bold uppercase tracking-wider text-xs flex items-center">Free</span>
                    ) : (
                      <span className="text-gray-900 font-bold">{formatPrice(shipping)}</span>
                    )}
                  </div>
                  {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs mt-4">
                      {error}
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center pt-6 mb-8">
                  <span className="text-base font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-gray-900 tracking-tight">{formatPrice(total)}</span>
                </div>

                <button
                  onClick={handlePlaceOrder}
                  disabled={isSubmitting}
                  className="w-full py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-full font-bold shadow-lg shadow-amber-200 transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-75 disabled:pointer-events-none disabled:transform-none"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                  ) : (
                    'Place Order securely'
                  )}
                </button>
              </div>
            </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
