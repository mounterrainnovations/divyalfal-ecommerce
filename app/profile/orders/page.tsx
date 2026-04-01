import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { Package, ChevronRight } from 'lucide-react';
import { formatPrice } from '@/lib/common/product-interfaces';

export default async function OrderHistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Retrieve orders descending by creation
  const orders = await prisma.order.findMany({
    where: { profileId: user.id },
    include: {
      items: {
        include: {
          product: true,
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 min-h-full">
      <h1 className="text-2xl md:text-3xl font-serif font-bold text-gray-900 mb-8">Order History</h1>
      
      {orders.length === 0 ? (
        <div className="py-16 text-center bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center">
           <Package className="w-12 h-12 text-gray-400 mb-4" />
           <p className="text-gray-500 font-medium mb-6">You haven&apos;t placed any orders yet.</p>
           <Link href="/products" className="px-6 py-3 bg-amber-600 text-white rounded-full font-bold hover:bg-amber-700 transition">
             Start Shopping
           </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order: any) => {
            const itemCount = order.items.reduce((acc: number, item: any) => acc + item.quantity, 0);
            return (
              <div key={order.id} className="border border-gray-200 rounded-2xl overflow-hidden hover:border-amber-300 transition group">
                {/* Order Header */}
                <div className="bg-gray-50 p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 flex-1">
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Date Placed</p>
                      <p className="text-sm font-medium text-gray-900">{new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Total Amount</p>
                      <p className="text-sm font-medium text-gray-900">{formatPrice(order.totalAmount.toNumber())}</p>
                    </div>
                    <div className="col-span-2 sm:col-span-2">
                       <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Order #</p>
                       <p className="text-sm font-medium text-gray-900 font-mono tracking-tight">{order.id.split('-')[0].toUpperCase()}</p>
                    </div>
                  </div>
                  
                  <Link 
                    href={`/profile/orders/${order.id}`}
                    className="shrink-0 text-sm font-bold text-amber-600 bg-amber-50 px-4 py-2 rounded-xl hover:bg-amber-100 transition flex items-center justify-center sm:w-auto w-full group-hover:bg-amber-100"
                  >
                    View Details <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </div>

                {/* Order Status & Main Item */}
                <div className="p-4 sm:px-6 flex flex-col sm:flex-row gap-6 sm:items-center">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider
                        ${order.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800' : 
                          order.status === 'SHIPPED' ? 'bg-blue-100 text-blue-800' : 
                          order.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : 
                          'bg-amber-100 text-amber-800'}`}
                      >
                        {order.status}
                      </span>
                      {order.trackingUrl && (
                        <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-amber-600 hover:text-amber-800 transition underline">
                          Track Package
                        </a>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 font-medium">
                      {itemCount} {itemCount === 1 ? 'item' : 'items'} in this order.
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
