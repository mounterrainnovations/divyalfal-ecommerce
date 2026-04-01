'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Package, ArrowRight, Grid3X3 } from 'lucide-react';
import Footer from '@/components/layout/footer';

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams?.get('orderId');

  return (
    <main className="flex-1 container mx-auto px-4 py-16 md:py-24 max-w-3xl text-center">
      
      <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner shadow-emerald-200">
        <CheckCircle className="w-12 h-12 text-emerald-600" />
      </div>
      
      <h1 className="text-3xl md:text-5xl font-serif font-bold text-gray-900 mb-4">
        Order Confirmed!
      </h1>
      
      <p className="text-gray-500 text-base md:text-lg max-w-lg mx-auto mb-10">
        Thank you for choosing Divyafal. Your premium heritage order has been placed and is being processed.
      </p>

      <div className="bg-white p-8 border border-gray-100 shadow-sm rounded-3xl max-w-md mx-auto mb-10">
        <div className="flex items-center justify-center space-x-3 mb-2">
           <Package className="w-5 h-5 text-gray-400" />
           <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Order Reference</span>
        </div>
        <p className="text-xl font-mono text-gray-800 tracking-tight">
          {orderId ? `#${orderId.split('-')[0].toUpperCase()}` : 'Generating...'}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
        <Link
          href="/dashboard/orders"
          className="w-full sm:w-auto px-8 py-4 border-2 border-gray-200 text-gray-700 rounded-full font-bold hover:bg-gray-50 hover:border-gray-300 transition flex items-center justify-center gap-2"
        >
          <Grid3X3 className="w-5 h-5" /> View Order Status
        </Link>
        <Link
          href="/products"
          className="w-full sm:w-auto px-8 py-4 bg-amber-600 text-white rounded-full font-bold hover:bg-amber-700 transition shadow-lg shadow-amber-200 flex items-center justify-center gap-2"
        >
          Continue Shopping <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    </main>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen flex flex-col pt-24 font-poppins bg-gray-50">
      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-600"></div>
        </div>
      }>
        <SuccessContent />
      </Suspense>
      <Footer />
    </div>
  );
}
