import { Users, Search, Filter, MoreVertical, Shield, User, Mail, Calendar, Trash2, Edit3, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { prisma } from '@/lib/db'

async function getUsers() {
  return await prisma.profile.findMany({
    orderBy: { createdAt: 'desc' },
  })
}

export default async function CustomersPage() {
  const users = await getUsers()

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500 font-poppins mt-1">Manage and view user accounts for Divyafal.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-amber-100 bg-white font-poppins font-bold text-amber-600 hover:bg-amber-50 rounded-xl">
            <Download className="w-4 h-4 mr-2" /> Export Users
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-amber-50 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        {/* Table Header / Toolbar */}
        <div className="p-6 border-b border-amber-50 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/30">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="Search by name or email..." 
              className="pl-10 h-10 bg-white border-amber-100 focus:ring-amber-500 rounded-xl font-poppins"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="hover:bg-amber-50 rounded-lg text-gray-400 hover:text-amber-600">
              <Filter className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Users Table */}
        <div className="flex-1 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#fcf9f6] border-b border-amber-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-poppins font-bold text-gray-500 uppercase tracking-widest">User</th>
                <th className="px-6 py-4 text-left text-xs font-poppins font-bold text-gray-500 uppercase tracking-widest">Role</th>
                <th className="px-6 py-4 text-left text-xs font-poppins font-bold text-gray-500 uppercase tracking-widest">Joined</th>
                <th className="px-6 py-4 text-right text-xs font-poppins font-bold text-gray-500 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-50">
              {users.map((user) => (
                <tr key={user.id} className="group hover:bg-amber-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 font-bold font-serif text-lg">
                        {(user.fullName?.[0] || user.email?.[0] || 'U').toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-poppins font-bold text-gray-900 truncate">{user.fullName || 'No Name Set'}</p>
                        <p className="text-[10px] text-gray-400 font-poppins truncate tracking-tight flex items-center gap-1">
                          <Mail className="w-2.5 h-2.5" /> {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={user.role === 'ADMIN' ? 'warning' : 'outline'} className="font-poppins gap-1">
                      {user.role === 'ADMIN' && <ShieldAlert className="w-3 h-3" />}
                      {user.role}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-poppins font-medium text-gray-700 text-sm flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 text-gray-400 group-hover:text-gray-900 transition-colors">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-amber-100 hover:text-amber-600">
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-600">
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
