import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { 
  User, 
  Mail, 
  ShoppingBag, 
  MapPin, 
  ChevronRight, 
  Clock, 
  Edit3, 
  Camera,
  ShieldCheck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    include: {
      orders: {
        orderBy: { createdAt: 'desc' },
        take: 5
      }
    }
  })

  return (
    <div className="min-h-screen bg-[#fcf9f6] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Header / Intro */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <div className="w-24 h-24 rounded-3xl bg-amber-100 border-2 border-amber-200 flex items-center justify-center text-amber-700 font-serif text-3xl font-bold shadow-xl overflow-hidden relative">
                {profile?.avatarUrl ? (
                  <Image src={profile.avatarUrl} alt={profile.fullName || 'User'} fill className="object-cover" />
                ) : (
                  (profile?.fullName?.[0] || user.email?.[0] || 'U').toUpperCase()
                )}
              </div>
              <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-white border border-amber-100 rounded-xl flex items-center justify-center shadow-lg text-amber-600 hover:scale-110 transition-transform">
                <Camera className="w-4 h-4" />
              </button>
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-serif font-bold text-gray-900">{profile?.fullName || 'Valued Customer'}</h1>
                {profile?.role === 'ADMIN' && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-widest border border-amber-200">
                    <ShieldCheck className="w-3 h-3" /> Admin
                  </span>
                )}
              </div>
              <p className="text-gray-500 font-poppins flex items-center gap-2 text-sm mt-1">
                <Mail className="w-3.5 h-3.5 text-amber-500" /> {user.email}
              </p>
            </div>
          </div>

          <Button className="bg-white border border-amber-100 text-amber-600 font-bold hover:bg-amber-50 font-poppins rounded-xl px-6 h-11 shadow-sm">
            <Edit3 className="w-4 h-4 mr-2" /> Edit Profile
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Account Details */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-3xl border border-amber-50 shadow-sm p-6">
              <h3 className="text-lg font-serif font-bold text-gray-900 mb-6 pb-2 border-b border-amber-50">Account Summary</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-poppins font-bold text-gray-400 uppercase tracking-widest">Join Date</span>
                  <span className="text-sm font-poppins font-medium text-gray-900">{new Date(user.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-poppins font-bold text-gray-400 uppercase tracking-widest">Total Orders</span>
                  <span className="text-sm font-poppins font-medium text-gray-900">{profile?.orders?.length || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-poppins font-bold text-gray-400 uppercase tracking-widest">Rewards</span>
                  <span className="text-sm font-poppins font-bold text-amber-600">540 Points</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-600 to-orange-600 rounded-3xl p-6 text-white shadow-xl shadow-amber-200/50">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
              </div>
              <h4 className="font-serif font-bold text-xl mb-1">My Address</h4>
              <p className="text-white/80 text-xs font-poppins leading-relaxed">
                Add your primary delivery address for faster checkout at Divyafal.
              </p>
              <Button size="sm" className="w-full mt-6 bg-white text-amber-600 hover:bg-amber-50 font-bold font-poppins rounded-xl">
                Add Address
              </Button>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-amber-50 shadow-sm p-8 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-serif font-bold text-gray-900">Recent Orders</h3>
              <Button variant="ghost" className="text-amber-600 font-bold hover:bg-amber-50 font-poppins rounded-lg">
                See all <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            <div className="flex-1">
              {!profile?.orders || profile.orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                  <ShoppingBag className="w-12 h-12 text-gray-200 mb-4" />
                  <p className="font-poppins font-bold text-gray-900">No orders yet</p>
                  <p className="text-sm text-gray-500 font-poppins mt-1 max-w-[200px]">Your boutique selections will appear here after your first purchase.</p>
                  <Button className="mt-6 bg-amber-600 text-white font-bold font-poppins rounded-xl px-8 shadow-lg shadow-amber-200">
                    Browse Collection
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Order List Here */}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
