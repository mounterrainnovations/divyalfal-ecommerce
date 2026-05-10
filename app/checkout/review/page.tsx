'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/lib/store/cart';
import Footer from '@/components/layout/footer';
import { ChevronRight, Loader2, MapPin, Package, CreditCard } from 'lucide-react';
import Image from 'next/image';
import { formatPrice } from '@/lib/common/product-interfaces';
import Script from 'next/script';
import { cn } from '@/lib/utils';

interface RazorpayHandlerResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open: () => void;
}

interface RazorpayConstructor {
  new (options: Record<string, unknown>): RazorpayInstance;
}

declare global {
  interface Window {
    Razorpay: RazorpayConstructor;
  }
}

export default function CheckoutReviewPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const { items, address, getTotalPrice, getTotalItems, clearCart, isGuest } = useCartStore();

  
  const subtotal = getTotalPrice();
  const shipping = subtotal > 5000 ? 0 : 150;
  const total = subtotal + shipping;

  const hasCustomItems = items.some(item => item.size === 'Custom');
  const [orderType, setOrderType] = useState<'STANDARD' | 'RFQ'>('STANDARD');

  useEffect(() => {
    if (hasCustomItems) {
      setOrderType('RFQ');
    }
  }, [hasCustomItems]);


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
      // 1. Create order in our database
      const orderPayload = {
        address,
        items: items.map(item => ({
          productId: item.productId,
          variantId: item.product.variants?.find(v => v.size === item.size)?.id || null,
          size: item.size,
          quantity: item.quantity,
          price: item.product.sale && item.product.salePrice ? item.product.salePrice : item.product.price,
          customMeasurements: item.customMeasurements,
        })),
        totalAmount: total,
        isGuest,
        type: orderType,
      };


      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to create order');
      }

      const { data } = await response.json();
      
      if (orderType === 'RFQ') {
        clearCart();
        router.push(`/checkout/success?orderId=${data.id}&type=rfq`);
        return;
      }
      
      // 2. Initialize Razorpay Checkout (Only for Standard)
      if (!data.razorpayKeyId) {
        throw new Error('Razorpay key is not configured');
      }

      const options = {
        key: data.razorpayKeyId,
        amount: Math.round(total * 100),
        currency: "INR",
        name: "Divyafal Boutique",
        description: `Order #${data.id.substring(0, 8)}`,
        order_id: data.razorpayOrderId,
        handler: async function (response: RazorpayHandlerResponse) {
          try {
            setIsSubmitting(true);
            const verifyResponse = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            if (verifyResponse.ok) {
              clearCart();
              router.push(`/checkout/success?orderId=${data.id}`);
            } else {
              const errorData = await verifyResponse.json();
              setError(errorData.error || 'Payment verification failed. Please contact support.');
              setIsSubmitting(false);
            }
          } catch (err) {
            console.error('Verification error:', err);
            setError('An error occurred during payment verification.');
            setIsSubmitting(false);
          }
        },
        prefill: {
          name: address.fullName,
          email: address.email,
          contact: address.phone,
        },
        theme: {
          color: "#d97706", // amber-600
        },
        modal: {
          ondismiss: function() {
            setIsSubmitting(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
      
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while placing your order.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col pt-24 font-poppins bg-gray-50">
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12 max-w-6xl">
        <Script
          id="razorpay-checkout-js"
          src="https://checkout.razorpay.com/v1/checkout.js"
        />
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
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center shrink-0">
                  <CreditCard className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Checkout Method</h3>
                  <p className="text-gray-500 text-sm">Choose how you would like to proceed with this order.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  onClick={() => setOrderType('STANDARD')}
                  className={cn(
                    "p-4 rounded-2xl border-2 cursor-pointer transition-all",
                    orderType === 'STANDARD' ? "border-amber-600 bg-amber-50/30" : "border-gray-100 hover:border-amber-200"
                  )}
                >
                  <p className="font-bold text-gray-900">Pay Now (Online)</p>
                  <p className="text-xs text-gray-500 mt-1">Pay securely via Razorpay/GPay and confirm instantly.</p>
                </div>
                <div 
                  onClick={() => setOrderType('RFQ')}
                  className={cn(
                    "p-4 rounded-2xl border-2 cursor-pointer transition-all",
                    orderType === 'RFQ' ? "border-amber-600 bg-amber-50/30" : "border-gray-100 hover:border-amber-200"
                  )}
                >
                  <p className="font-bold text-gray-900">Request a Quote</p>
                  <p className="text-xs text-gray-500 mt-1">Recommended for custom orders. We will review and contact you for payment.</p>
                </div>
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
                    orderType === 'RFQ' ? 'Request Quote' : 'Place Order securely'
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
