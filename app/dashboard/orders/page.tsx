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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-serif font-bold text-stone-900 tracking-tight">Orders</h1>
          <p className="text-stone-500 font-poppins mt-2 text-[15px]">Track and manage customer transactions.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Button variant="outline" className="border-stone-200 bg-white font-poppins font-semibold text-stone-700 hover:bg-stone-50 rounded-xl shadow-sm h-11 px-5">
             <History className="w-4 h-4 mr-2 text-stone-500" /> Order History
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-stone-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col min-h-[500px] relative">
        {/* Table Header / Toolbar */}
        <div className="p-6 md:px-8 border-b border-stone-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-stone-50/50">
          <div className="relative w-full sm:w-[400px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <Input 
              placeholder="Search by Order ID or Customer..." 
              className="pl-11 h-12 bg-white border-stone-200 focus:ring-rose-950/20 focus:border-rose-900 rounded-xl font-poppins shadow-sm transition-all text-[15px]"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="hover:bg-stone-100 rounded-xl text-stone-400 hover:text-stone-700 transition-colors h-11 w-11 shadow-sm border border-stone-200 bg-white">
              <Filter className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Orders Table */}
         <div className="flex-1">
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center bg-stone-50/30">
              <div className="w-16 h-16 bg-white border border-stone-100 shadow-sm rounded-2xl flex items-center justify-center mb-5 relative">
                <div className="absolute inset-0 bg-rose-900/5 rounded-2xl" />
                <ShoppingCart className="w-6 h-6 text-stone-300 relative z-10" />
              </div>
              <h3 className="font-serif font-bold text-stone-900 text-2xl tracking-tight">No active orders</h3>
              <p className="text-[15px] text-stone-500 font-poppins mt-2">When customers start shopping, you&apos;ll see them here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#FDFBF7] border-b border-stone-100">
                  <tr>
                    <th className="px-8 py-5 text-[11px] font-poppins font-bold text-stone-500 uppercase tracking-[0.2em]">Order ID</th>
                    <th className="px-8 py-5 text-[11px] font-poppins font-bold text-stone-500 uppercase tracking-[0.2em]">Customer</th>
                    <th className="px-8 py-5 text-[11px] font-poppins font-bold text-stone-500 uppercase tracking-[0.2em]">Items</th>
                    <th className="px-8 py-5 text-[11px] font-poppins font-bold text-stone-500 uppercase tracking-[0.2em]">Total</th>
                    <th className="px-8 py-5 text-[11px] font-poppins font-bold text-stone-500 uppercase tracking-[0.2em]">Status</th>
                    <th className="px-8 py-5 text-right text-[11px] font-poppins font-bold text-stone-500 uppercase tracking-[0.2em]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100/60 font-poppins">
                  {orders.map((order) => (
                    <tr key={order.id} className="group hover:bg-stone-50/50 transition-colors duration-300">
                      <td className="px-8 py-5">
                        <span className="font-mono text-[13px] font-bold text-stone-900 tracking-wider">#{order.id.slice(0, 8).toUpperCase()}</span>
                        <p className="text-[11px] text-stone-400 font-poppins mt-1 tracking-[0.1em] uppercase">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </td>
                      <td className="px-8 py-5">
                        <p className="font-poppins font-bold text-stone-900 text-[15px] flex items-center gap-2">
                          {order.profile?.fullName || order.guestName || 'Guest User'}
                          {order.isGuest && <Badge variant="outline" className="bg-stone-50 text-stone-500 border-stone-200 text-[9px] uppercase tracking-widest px-2 py-0">GUEST</Badge>}
                        </p>
                        <p className="text-[12px] text-stone-500 font-poppins mt-0.5">{order.profile?.email || order.guestEmail}</p>
                      </td>
                      <td className="px-8 py-5">
                        <span className="font-poppins text-[15px] text-stone-600 font-medium bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-100 shadow-sm">
                          {order.items.reduce((acc, item) => acc + item.quantity, 0)} Items
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <span className="font-poppins font-bold text-stone-900 text-[15px]">₹{order.totalAmount.toNumber().toLocaleString('en-IN')}</span>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col gap-1.5 items-start">
                          <Badge variant="outline" className={`font-poppins font-bold uppercase tracking-[0.15em] text-[10px] px-2.5 py-1 shadow-sm
                            ${order.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200/50' : 
                              order.status === 'SHIPPED' ? 'bg-blue-50 text-blue-800 border-blue-200/50' : 
                              order.status === 'CANCELLED' ? 'bg-red-50 text-red-800 border-red-200/50' : 
                              order.status === 'QUOTE_REQUESTED' ? 'bg-purple-50 text-purple-800 border-purple-200/50' :
                              'bg-stone-100 text-stone-800 border-stone-200'}
                          `}>
                            {order.status}
                          </Badge>
                          <span className="text-[9px] font-bold text-stone-400 px-1 uppercase tracking-widest flex items-center gap-1">
                            {order.type === 'RFQ' ? <AlertCircle className="w-3 h-3 text-stone-300" /> : <CreditCard className="w-3 h-3 text-stone-300" />}
                            {order.type}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                         <div className="flex items-center justify-end gap-2">
                           <Link href={`/dashboard/orders/${order.id}`}>
                             <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-stone-100 hover:text-stone-900 text-stone-400 transition-colors cursor-pointer border border-transparent hover:border-stone-200">
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
