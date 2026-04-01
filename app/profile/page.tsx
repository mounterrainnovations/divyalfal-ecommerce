import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
import { User, Mail } from 'lucide-react';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
  });

  return (
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 h-full">
      <h1 className="text-3xl font-serif font-bold text-gray-900 mb-8">Personal Information</h1>
      
      <div className="space-y-6">
        <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
            <User className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Account Role</p>
            <p className="font-medium text-gray-900 text-lg">{profile?.role || 'USER'}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
            <Mail className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Email Address</p>
            <p className="font-medium text-gray-900 text-lg">{user.email}</p>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-100">
          <p className="text-gray-500 text-sm">
            Note: Address book features will be available in a future update. For now, shipping addresses are collected during checkout.
          </p>
        </div>
      </div>
    </div>
  );
}
