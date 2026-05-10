'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Shield,
  Bell,
  Search,
  ChevronRight
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const sidebarItems = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Products', href: '/dashboard/products', icon: Package },
  { name: 'Orders', href: '/dashboard/orders', icon: ShoppingCart },
  { name: 'Customers', href: '/dashboard/users', icon: Users },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      
      const { data: profile } = await supabase
        .from('Profile')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'ADMIN') {
        router.push('/profile')
        return
      }
      
      setUser(user)
    }
    getUser()
  }, [supabase, router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex selection:bg-rose-900 selection:text-white relative">
      <div className="fixed inset-0 pointer-events-none opacity-[0.025] mix-blend-multiply z-0" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} />
      {/* Desktop Sidebar */}
      <aside 
        className={cn(
          "hidden md:flex flex-col border-r border-stone-200/60 bg-white/90 backdrop-blur-2xl transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] relative z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]",
          isSidebarOpen ? "w-72" : "w-24"
        )}
      >
        <div className="p-8 flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-950 rounded-xl flex items-center justify-center shadow-xl shadow-rose-950/20 shrink-0 border border-rose-900/50">
            <Shield className="w-6 h-6 text-amber-200" />
          </div>
          {isSidebarOpen && (
            <motion.h1 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="text-2xl font-serif font-semibold text-stone-900 overflow-hidden whitespace-nowrap tracking-tight"
            >
              Divyafal
            </motion.h1>
          )}
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden",
                  isActive 
                    ? "bg-rose-950 text-amber-50 shadow-lg shadow-rose-950/15" 
                    : "text-stone-500 hover:bg-stone-100/80 hover:text-rose-900"
                )}
              >
                {isActive && <motion.div layoutId="active-nav" className="absolute inset-0 bg-rose-950" />}
                <item.icon className={cn("w-5 h-5 shrink-0 relative z-10", isActive ? "text-amber-200" : "group-hover:text-rose-900 transition-colors")} />
                {isSidebarOpen && (
                  <motion.span 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="font-poppins font-medium text-[15px] relative z-10"
                  >
                    {item.name}
                  </motion.span>
                )}
                {!isSidebarOpen && (
                  <div className="absolute left-full ml-4 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                    {item.name}
                  </div>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="p-6 border-t border-stone-200/60">
          <button
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-4 w-full px-4 py-3.5 rounded-xl text-stone-500 hover:bg-rose-50 hover:text-rose-700 transition-all duration-300 group",
              !isSidebarOpen && "justify-center"
            )}
          >
            <LogOut className="w-5 h-5 shrink-0 group-hover:rotate-12 transition-transform" />
            {isSidebarOpen && <span className="font-poppins font-medium text-[15px]">Logout</span>}
          </button>
        </div>

        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3.5 top-10 w-7 h-7 bg-white border border-stone-200 rounded-full flex items-center justify-center shadow-md hover:bg-stone-50 transition-colors z-30"
        >
          <ChevronRight className={cn("w-3.5 h-3.5 text-stone-600 transition-transform duration-500", isSidebarOpen && "rotate-180")} />
        </button>
      </aside>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Menu Sidebar */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 w-72 bg-white z-50 md:hidden shadow-2xl flex flex-col"
          >
            <div className="p-6 flex items-center justify-between border-b border-stone-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-rose-950 rounded-xl flex items-center justify-center shadow-lg">
                  <Shield className="w-6 h-6 text-amber-200" />
                </div>
                <h1 className="text-2xl font-serif font-semibold text-stone-900">Divyafal</h1>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-stone-500" />
              </button>
            </div>
            <nav className="flex-1 p-4 space-y-2">
              {sidebarItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300",
                      isActive 
                        ? "bg-rose-950 text-amber-50 shadow-md" 
                        : "text-stone-500 hover:bg-stone-100 hover:text-rose-900"
                    )}
                  >
                    <item.icon className={cn("w-5 h-5", isActive ? "text-amber-200" : "")} />
                    <span className="font-poppins font-medium text-[15px]">{item.name}</span>
                  </Link>
                )
              })}
            </nav>
            <div className="p-6 border-t border-stone-100">
              <button 
                onClick={handleLogout}
                className="flex items-center gap-4 w-full px-4 py-3.5 rounded-xl text-stone-500 hover:bg-rose-50 hover:text-rose-700 transition-all font-poppins font-medium text-[15px]"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <header className="h-20 border-b border-stone-200/60 bg-white/70 backdrop-blur-2xl flex items-center justify-between px-6 lg:px-10 sticky top-0 z-30 transition-all">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 hover:bg-stone-100 rounded-full md:hidden transition-colors"
            >
              <Menu className="w-6 h-6 text-stone-600" />
            </button>
            <div className="hidden sm:flex items-center bg-stone-100/80 hover:bg-stone-100 rounded-full px-4 py-2.5 w-72 border border-stone-200/50 transition-colors focus-within:ring-2 focus-within:ring-rose-950/20 focus-within:border-rose-950/30">
              <Search className="w-4 h-4 text-stone-400 mr-3" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="bg-transparent border-none focus:outline-none text-[15px] font-poppins w-full text-stone-800 placeholder:text-stone-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-5">
            <button className="p-2 hover:bg-stone-100 rounded-full text-stone-500 relative transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-600 rounded-full border-2 border-white" />
            </button>
            <div className="h-8 w-[1px] bg-stone-200 mx-1" />
            <div className="flex items-center gap-4 pl-1">
              <div className="text-right hidden sm:block">
                <p className="text-[15px] font-poppins font-semibold text-stone-900 leading-tight">
                  {user?.user_metadata?.full_name || 'Admin'}
                </p>
                <p className="text-[11px] font-poppins font-medium text-rose-800 uppercase tracking-[0.2em] mt-0.5">
                  Administrator
                </p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-b from-stone-100 to-stone-200 rounded-full border border-stone-300 shadow-inner flex items-center justify-center text-stone-700 font-serif font-bold text-lg">
                {(user?.user_metadata?.full_name?.[0] || 'A').toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-10 lg:p-12 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
