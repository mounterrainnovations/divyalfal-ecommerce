import { ShoppingBag, TrendingUp, Users, DollarSign, Package, Clock, ArrowRight, ChevronRight, Settings } from 'lucide-react'
import Link from 'next/link'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

async function getStats() {
  const prodCount = await prisma.product.count()
  // Mocking other stats for initial setup as tables are fresh
  return {
    products: prodCount,
    orders: 0,
    revenue: 0,
    customers: await prisma.profile.count()
  }
}

export default async function DashboardOverview() {
  const stats = await getStats()

  const statCards = [
    { name: 'Total Revenue', value: `₹${stats.revenue}`, icon: DollarSign, change: '+0%', color: 'from-emerald-500 to-teal-600' },
    { name: 'Total Orders', value: stats.orders.toString(), icon: ShoppingBag, change: '+0%', color: 'from-blue-500 to-indigo-600' },
    { name: 'Total Products', value: stats.products.toString(), icon: Package, change: '+0%', color: 'from-amber-500 to-orange-600' },
    { name: 'Total Customers', value: stats.customers.toString(), icon: Users, change: '+0%', color: 'from-rose-500 to-pink-600' },
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900">Store Overview</h1>
          <p className="text-gray-500 font-poppins mt-1">Real-time performance metrics for Divyafal Boutique.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-white px-4 py-2 border border-amber-100 rounded-xl shadow-sm flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs font-poppins font-bold text-gray-600 uppercase tracking-widest">Live Updates</span>
          </div>
        </div>
      </div>

      {/* Metric Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div 
            key={stat.name}
            className="bg-white rounded-3xl p-6 border border-amber-50 shadow-[0_10px_30px_-10px_rgba(217,119,6,0.05)] relative overflow-hidden group hover:shadow-xl hover:shadow-amber-100/50 transition-all duration-300"
          >
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.color} opacity-[0.03] rounded-bl-[100px] group-hover:scale-110 transition-transform duration-500`} />
            
            <div className="flex flex-col gap-4 relative">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              
              <div>
                <p className="text-sm font-poppins font-medium text-gray-500">{stat.name}</p>
                <div className="flex items-end gap-2 mt-1">
                  <h3 className="text-2xl font-serif font-bold text-gray-900">{stat.value}</h3>
                  <span className="text-xs font-poppins font-bold text-emerald-600 mb-1">{stat.change}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity / Pending Orders Placeholder */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-amber-50 shadow-sm p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-serif font-bold text-gray-900">Recent Transactions</h3>
            <Link href="/dashboard/orders" className="text-sm text-amber-600 font-bold hover:underline flex items-center gap-1 font-poppins">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
            <Clock className="w-12 h-12 mb-4 opacity-20" />
            <p className="font-poppins font-medium">No recent transactions to display.</p>
            <p className="text-sm font-poppins mt-1">When customers place orders, they will appear here.</p>
          </div>
        </div>

        {/* Inventory Quick Glance */}
        <div className="bg-white rounded-3xl border border-amber-50 shadow-sm p-8">
          <h3 className="text-xl font-serif font-bold text-gray-900 mb-8">Quick Actions</h3>
          
          <div className="space-y-4">
            <Link href="/dashboard/products" className="flex items-center gap-4 p-4 rounded-2xl bg-amber-50/50 hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-amber-600 group-hover:scale-110 transition-transform">
                <Package className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-poppins font-bold text-gray-900">Manage Inventory</p>
                <p className="text-xs font-poppins text-gray-500">Add or edit products</p>
              </div>
              <ChevronRight className="w-4 h-4 text-amber-300 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
            </Link>

            <Link href="/dashboard/settings" className="flex items-center gap-4 p-4 rounded-2xl bg-orange-50/50 hover:bg-orange-50 border border-transparent hover:border-orange-200 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-orange-600 group-hover:scale-110 transition-transform">
                <Settings className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-poppins font-bold text-gray-900">Store Settings</p>
                <p className="text-xs font-poppins text-gray-500">Configure your boutique</p>
              </div>
              <ChevronRight className="w-4 h-4 text-orange-300 group-hover:text-orange-600 group-hover:translate-x-1 transition-all" />
            </Link>

            <div className="p-4 rounded-2xl bg-gray-50/50 border border-gray-100 mt-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-poppins font-bold text-gray-700 uppercase tracking-widest">Growth Hint</span>
              </div>
              <p className="text-xs font-poppins text-gray-500 leading-relaxed">
                Add more SAREES to your inventory to boost visibility during festive seasons!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
