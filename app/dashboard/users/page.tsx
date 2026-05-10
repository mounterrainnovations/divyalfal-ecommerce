import { Users, Search, Filter, MoreVertical, Shield, User, Mail, Calendar, Trash2, Edit3, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

async function getUsers() {
  return await prisma.profile.findMany({
    orderBy: { createdAt: 'desc' },
  })
}

export default async function CustomersPage() {
  const users = await getUsers()

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-serif font-bold text-stone-900 tracking-tight">Customers</h1>
          <p className="text-stone-500 font-poppins mt-2 text-[15px]">Manage and view user accounts for Divyafal.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Button variant="outline" className="border-stone-200 bg-white font-poppins font-semibold text-stone-700 hover:bg-stone-50 rounded-xl shadow-sm h-11 px-5">
            <Download className="w-4 h-4 mr-2 text-stone-500" /> Export Users
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-stone-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col min-h-[500px] relative">
        {/* Table Header / Toolbar */}
        <div className="p-6 md:px-8 border-b border-stone-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-stone-50/50">
          <div className="relative w-full sm:w-[400px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <Input 
              placeholder="Search by name or email..." 
              className="pl-11 h-12 bg-white border-stone-200 focus:ring-rose-950/20 focus:border-rose-900 rounded-xl font-poppins shadow-sm transition-all text-[15px]"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="hover:bg-stone-100 rounded-xl text-stone-400 hover:text-stone-700 transition-colors h-11 w-11 shadow-sm border border-stone-200 bg-white">
              <Filter className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Users Table */}
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#FDFBF7] border-b border-stone-100">
              <tr>
                <th className="px-8 py-5 text-[11px] font-poppins font-bold text-stone-500 uppercase tracking-[0.2em]">User</th>
                <th className="px-8 py-5 text-[11px] font-poppins font-bold text-stone-500 uppercase tracking-[0.2em]">Role</th>
                <th className="px-8 py-5 text-[11px] font-poppins font-bold text-stone-500 uppercase tracking-[0.2em]">Joined</th>
                <th className="px-8 py-5 text-right text-[11px] font-poppins font-bold text-stone-500 uppercase tracking-[0.2em]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100/60 font-poppins">
              {users.map((user) => (
                <tr key={user.id} className="group hover:bg-stone-50/50 transition-colors duration-300">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-center text-stone-700 font-bold font-serif text-lg shadow-sm">
                        {(user.fullName?.[0] || user.email?.[0] || 'U').toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-poppins font-bold text-stone-900 text-[15px] truncate">{user.fullName || 'No Name Set'}</p>
                        <p className="text-[12px] text-stone-500 font-poppins truncate tracking-tight flex items-center gap-1.5 mt-0.5">
                          <Mail className="w-3 h-3 text-stone-400" /> {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <Badge variant={user.role === 'ADMIN' ? 'warning' : 'outline'} className={`font-poppins font-bold uppercase tracking-[0.1em] text-[10px] px-2.5 py-1 gap-1.5 shadow-sm ${user.role === 'ADMIN' ? 'bg-amber-50 text-amber-800 border-amber-200/50' : 'bg-stone-50 text-stone-600 border-stone-200'}`}>
                      {user.role === 'ADMIN' && <ShieldAlert className="w-3 h-3" />}
                      {user.role}
                    </Badge>
                  </td>
                  <td className="px-8 py-5">
                    <p className="font-poppins font-medium text-stone-700 text-[15px] flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-stone-400" />
                      {new Date(user.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 text-stone-400 transition-colors">
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-stone-100 hover:text-stone-900 transition-colors">
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-rose-50 hover:text-rose-700 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Download(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  )
}
