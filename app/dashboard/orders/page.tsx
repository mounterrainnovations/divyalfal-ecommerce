import { ShoppingCart, Search, Filter, History, ChevronRight, MoreVertical, CreditCard, Truck, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'
import Link from 'next/link'

async function getOrders() {
  return await prisma.order.findMany({
    include: {
      profile: true,
      items: true
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  })
}

export default async function OrdersPage() {
  const orders = await getOrders()

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900">Orders</h1>
          <p className="text-gray-500 font-poppins mt-1">Track and manage customer transactions.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-amber-100 bg-white font-poppins font-bold text-amber-600 hover:bg-amber-50 rounded-xl">
             <History className="w-4 h-4 mr-2" /> Order History
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-amber-50 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        {/* Table Header / Toolbar */}
        <div className="p-6 border-b border-amber-50 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/30">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="Search by Order ID or Customer..." 
              className="pl-10 h-10 bg-white border-amber-100 focus:ring-amber-500 rounded-xl font-poppins"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="hover:bg-amber-50 rounded-lg text-gray-400 hover:text-amber-600">
              <Filter className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Orders Table */}
         <div className="flex-1">
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-4">
                <ShoppingCart className="w-8 h-8 text-amber-200" />
              </div>
              <h3 className="font-serif font-bold text-gray-900 text-xl">No active orders</h3>
              <p className="text-sm text-gray-500 font-poppins mt-1">When customers start shopping, you&apos;ll see them here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#fcf9f6] border-b border-amber-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-poppins font-bold text-gray-500 uppercase tracking-widest">Order ID</th>
                    <th className="px-6 py-4 text-left text-xs font-poppins font-bold text-gray-500 uppercase tracking-widest">Customer</th>
                    <th className="px-6 py-4 text-left text-xs font-poppins font-bold text-gray-500 uppercase tracking-widest">Items</th>
                    <th className="px-6 py-4 text-left text-xs font-poppins font-bold text-gray-500 uppercase tracking-widest">Total</th>
                    <th className="px-6 py-4 text-left text-xs font-poppins font-bold text-gray-500 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-poppins font-bold text-gray-500 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-50">
                  {orders.map((order) => (
                    <tr key={order.id} className="group hover:bg-amber-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-poppins font-bold text-gray-900">#{order.id.slice(0, 8).toUpperCase()}</span>
                        <p className="text-[10px] text-gray-400 font-poppins">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-poppins font-bold text-gray-900">{order.profile.fullName || 'User'}</p>
                        <p className="text-[10px] text-gray-400 font-poppins">{order.profile.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-poppins text-sm text-gray-600 font-medium">
                          {order.items.reduce((acc, item) => acc + item.quantity, 0)} Items
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-poppins font-bold text-gray-900">₹{order.totalAmount.toNumber().toLocaleString('en-IN')}</span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className={`
                          ${order.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800 border-none' : 
                            order.status === 'SHIPPED' ? 'bg-blue-100 text-blue-800 border-none' : 
                            order.status === 'CANCELLED' ? 'bg-red-100 text-red-800 border-none' : 
                            'bg-amber-100 text-amber-800 border-none'}
                        `}>
                          {order.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                         <div className="flex items-center justify-end gap-2">
                           <Link href={`/dashboard/orders/${order.id}`}>
                             <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-amber-100 hover:text-amber-600 text-gray-400 transition cursor-pointer">
                              <ChevronRight className="w-5 h-5" />
                             </Button>
                           </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
