'use client'

import { motion } from 'framer-motion'
import { Clock, ArrowRight, ChevronRight, TrendingUp, Package, Settings, LucideIcon, DollarSign, ShoppingBag, Users } from 'lucide-react'
import Link from 'next/link'

interface Stats {
  products: number
  orders: number
  revenue: number
  customers: number
}

interface StatCard {
  name: string
  value: string
  icon: LucideIcon
  change: string
  color: string
  lightColor: string
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as any, stiffness: 300, damping: 24 } }
}

export function DashboardOverviewClient({ stats }: { stats: Stats }) {
  const statCards: StatCard[] = [
    { name: 'Total Revenue', value: `₹${stats.revenue.toLocaleString('en-IN')}`, icon: DollarSign, change: '+0%', color: 'from-rose-900 to-rose-950', lightColor: 'bg-rose-50' },
    { name: 'Total Orders', value: stats.orders.toString(), icon: ShoppingBag, change: '+0%', color: 'from-stone-800 to-stone-900', lightColor: 'bg-stone-100' },
    { name: 'Total Products', value: stats.products.toString(), icon: Package, change: '+0%', color: 'from-amber-600 to-amber-700', lightColor: 'bg-amber-50' },
    { name: 'Total Customers', value: stats.customers.toString(), icon: Users, change: '+0%', color: 'from-zinc-800 to-zinc-900', lightColor: 'bg-zinc-100' },
  ]

  return (
    <div className="space-y-10">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div>
          <h1 className="text-4xl font-serif font-bold text-stone-900 tracking-tight">Store Overview</h1>
          <p className="text-stone-500 font-poppins mt-2 text-[15px]">Real-time performance metrics for Divyafal Boutique.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-white/80 backdrop-blur-md px-5 py-2.5 border border-stone-200/60 rounded-full shadow-sm flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-poppins font-bold text-stone-600 uppercase tracking-[0.2em]">Live Updates</span>
          </div>
        </div>
      </motion.div>

      {/* Metric Grid */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {statCards.map((stat) => (
          <motion.div 
            variants={itemVariants}
            key={stat.name}
            className="bg-white rounded-3xl p-7 border border-stone-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-500"
          >
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-[0.03] rounded-bl-[100px] group-hover:scale-110 transition-transform duration-700 ease-out`} />
            
            <div className="flex flex-col gap-5 relative">
              <div className={`w-14 h-14 rounded-2xl ${stat.lightColor} flex items-center justify-center group-hover:scale-110 transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]`}>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
              </div>
              
              <div className="space-y-1">
                <p className="text-[13px] font-poppins font-semibold text-stone-500 uppercase tracking-wider">{stat.name}</p>
                <div className="flex items-end gap-3">
                  <h3 className="text-3xl font-serif font-bold text-stone-900 tracking-tight">{stat.value}</h3>
                  <span className="text-xs font-poppins font-bold text-emerald-600 mb-1.5 bg-emerald-50 px-2 py-0.5 rounded-full">{stat.change}</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
      >
        {/* Recent Activity */}
        <motion.div variants={itemVariants} className="lg:col-span-2 bg-white rounded-[2rem] border border-stone-100 shadow-sm p-8 lg:p-10 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-900 via-rose-800 to-transparent opacity-20" />
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-2xl font-serif font-bold text-stone-900">Recent Transactions</h3>
            <Link href="/dashboard/orders" className="text-sm text-rose-900 font-bold hover:text-rose-800 flex items-center gap-1.5 font-poppins group transition-colors">
              View All <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          
          <div className="flex flex-col items-center justify-center py-24 text-center text-stone-400 bg-stone-50/50 rounded-3xl border border-dashed border-stone-200">
            <Clock className="w-12 h-12 mb-5 opacity-20" />
            <p className="font-poppins font-medium text-stone-600">No recent transactions to display.</p>
            <p className="text-[15px] font-poppins mt-1 text-stone-500">When customers place orders, they will appear here.</p>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants} className="bg-white rounded-[2rem] border border-stone-100 shadow-sm p-8 lg:p-10 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-stone-800 via-stone-600 to-transparent opacity-20" />
          <h3 className="text-2xl font-serif font-bold text-stone-900 mb-10">Quick Actions</h3>
          
          <div className="space-y-4">
            <Link href="/dashboard/products" className="flex items-center gap-5 p-5 rounded-2xl bg-stone-50 hover:bg-stone-100 border border-transparent transition-all group">
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm text-stone-700 group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
                <Package className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-[15px] font-poppins font-bold text-stone-900">Manage Inventory</p>
                <p className="text-xs font-poppins text-stone-500 mt-0.5">Add or edit products</p>
              </div>
              <ChevronRight className="w-5 h-5 text-stone-300 group-hover:text-stone-600 group-hover:translate-x-1 transition-all" />
            </Link>

            <Link href="/dashboard/settings" className="flex items-center gap-5 p-5 rounded-2xl bg-stone-50 hover:bg-stone-100 border border-transparent transition-all group">
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm text-stone-700 group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
                <Settings className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-[15px] font-poppins font-bold text-stone-900">Store Settings</p>
                <p className="text-xs font-poppins text-stone-500 mt-0.5">Configure your boutique</p>
              </div>
              <ChevronRight className="w-5 h-5 text-stone-300 group-hover:text-stone-600 group-hover:translate-x-1 transition-all" />
            </Link>

            <div className="p-6 rounded-2xl bg-rose-50/50 border border-rose-100/50 mt-6 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-16 h-16 bg-rose-100 rounded-full blur-2xl group-hover:bg-rose-200 transition-colors" />
              <div className="flex items-center gap-2.5 mb-3 relative z-10">
                <TrendingUp className="w-4 h-4 text-rose-700" />
                <span className="text-[11px] font-poppins font-bold text-rose-900 uppercase tracking-[0.2em]">Growth Hint</span>
              </div>
              <p className="text-sm font-poppins text-rose-800/80 leading-relaxed relative z-10">
                Add more <strong>SAREES</strong> to your inventory to boost visibility during festive seasons!
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
