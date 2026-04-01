import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
import Link from 'next/link';
import Image from 'next/image';
import { notFound, redirect } from 'next/navigation';
import { ChevronLeft, MapPin, Package, CreditCard, ExternalLink, CalendarDays } from 'lucide-react';
import { formatPrice } from '@/lib/common/product-interfaces';

export default async function OrderDetailsPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { id } = params;

  const order = await prisma.order.findUnique({
    where: { 
      id,
      profileId: user.id 
    },
    include: {
      items: {
        include: {
          product: true,
          variant: true,
        }
      }
    }
  });

  if (!order) notFound();

  // Parse shipping address
  let address: any = order.shippingAddress;
  if (typeof address === 'string') {
    try { address = JSON.parse(address); } catch(e) {}
  }

  const shipping = order.totalAmount.toNumber() > 5000 ? 0 : 150;
  const subtotal = order.totalAmount.toNumber() - shipping;

  return (
    <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 min-h-full">
      <div className="flex items-center gap-4 mb-8 border-b pb-6">
        <Link 
          href="/profile/orders" 
          className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-900">
            Order #{order.id.split('-')[0].toUpperCase()}
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-1 flex items-center gap-2">
            <CalendarDays className="w-4 h-4" /> Placed on {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          
          {/* Status & Tracking */}
          <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-600" /> Order Status
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
              <div className="flex items-center gap-4">
                 <span className={`px-4 py-2 text-sm font-bold rounded-lg uppercase tracking-wider
                   ${order.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 
                     order.status === 'SHIPPED' ? 'bg-blue-100 text-blue-800 border border-blue-200' : 
                     order.status === 'CANCELLED' ? 'bg-red-100 text-red-800 border border-red-200' : 
                     'bg-white text-amber-800 border border-amber-200'}`}
                 >
                   {order.status}
                 </span>
                 <p className="text-sm text-gray-600 font-medium">
                   {order.status === 'PENDING' && 'We are processing your order.'}
                   {order.status === 'SHIPPED' && 'Your order is on the way!'}
                   {order.status === 'DELIVERED' && 'Your order has been delivered.'}
                 </p>
              </div>
              
              {order.trackingUrl && (
                <a 
                  href={order.trackingUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="px-6 py-3 bg-amber-600 text-white text-sm font-bold rounded-xl hover:bg-amber-700 transition flex items-center justify-center gap-2 shadow-sm"
                >
                  Track Package <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
            {order.trackingId && (
              <p className="text-sm font-medium text-gray-500 mt-4 bg-white/50 inline-block px-4 py-2 rounded-lg border border-amber-100/50">
                Tracking ID: <span className="font-mono text-gray-900">{order.trackingId}</span>
              </p>
            )}
          </div>

          {/* Items */}
          <div>
            <h2 className="text-xl font-serif font-bold text-gray-900 mb-6">Items Ordered</h2>
            <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl p-6 shrink-0">
              {order.items.map((item) => {
                const imageUrl = item.product.photos[0] || '/mocks/mock_mostRecommended_common.jpg';
                const customMeasurements = item.customMeasurements as any;

                return (
                   <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex gap-4">
                     <div className="w-20 h-28 shrink-0 rounded-xl overflow-hidden bg-gray-100 relative border">
                       <Image src={imageUrl} alt={item.product.name} fill className="object-cover" />
                     </div>
                     <div className="flex-1 min-w-0 flex flex-col justify-center">
                       <Link href={`/product/${item.product.id}`} className="font-bold text-gray-900 hover:text-amber-600 transition text-sm sm:text-base line-clamp-2 mb-1">
                         {item.product.name}
                       </Link>
                       <p className="text-xs text-gray-500 font-medium mb-1">
                         Size: <span className="text-gray-900 font-bold">{item.variant.size}</span>
                       </p>
                       <p className="text-xs text-gray-500 font-medium mb-2">
                         Qty: <span className="text-gray-900 font-bold">{item.quantity}</span>
                       </p>
                       
                       {/* Custom Measurements Display */}
                       {item.variant.size === 'Custom' && customMeasurements && (
                         <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg font-medium border border-amber-100 inline-flex flex-wrap gap-x-3 gap-y-1">
                           <span>Bust: {customMeasurements.bust}&quot;</span>
                           <span>Waist: {customMeasurements.waist}&quot;</span>
                           <span>Hips: {customMeasurements.hips}&quot;</span>
                         </div>
                       )}
                     </div>
                     <div className="text-right shrink-0">
                       <p className="font-bold text-gray-900">{formatPrice(item.price.toNumber() * item.quantity)}</p>
                     </div>
                   </div>
                );
              })}
            </div>
          </div>
          
        </div>

        {/* Sidebar info */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-gray-400" /> Order Summary
            </h3>
            <div className="space-y-3 text-sm font-medium text-gray-600 mb-4 border-b border-gray-200 pb-4">
               <div className="flex justify-between">
                 <span>Subtotal</span>
                 <span className="text-gray-900">{formatPrice(subtotal)}</span>
               </div>
               <div className="flex justify-between">
                 <span>Shipping Estimate</span>
                 <span className="text-gray-900">{shipping === 0 ? 'Free' : formatPrice(shipping)}</span>
               </div>
            </div>
            <div className="flex justify-between items-center">
               <span className="font-bold text-gray-900">Total</span>
               <span className="text-xl font-bold text-gray-900">{formatPrice(order.totalAmount.toNumber())}</span>
            </div>
            <p className="text-xs font-bold text-amber-600 mt-4 bg-amber-50 p-3 rounded-xl border border-amber-100 text-center uppercase tracking-widest">
              Payment: {order.paymentStatus}
            </p>
          </div>

          {address && (
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-gray-400" /> Shipping Address
              </h3>
              <p className="font-bold text-gray-900 text-sm mb-1">{address.fullName}</p>
              <p className="text-sm text-gray-600 leading-relaxed">
                {address.street}<br/>
                {address.city}, {address.state} {address.postalCode}<br/>
                India
              </p>
              <div className="mt-4 pt-4 border-t border-gray-200 text-sm font-medium text-gray-600">
                <p>Email: {address.email}</p>
                <p>Phone: {address.phone}</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
