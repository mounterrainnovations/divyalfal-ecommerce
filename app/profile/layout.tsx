import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import NavBar from '@/components/layout/navbar';
import Footer from '@/components/layout/footer';
import { Package, User } from 'lucide-react';

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen flex flex-col font-poppins bg-gray-50">
      <NavBar />
      <div className="flex-1 container mx-auto px-4 py-8 md:py-12 mt-24 max-w-7xl">
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* Sidebar */}
          <aside className="w-full md:w-64 shrink-0">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sticky top-32">
              <h2 className="text-xl font-serif font-bold text-gray-900 mb-6">My Account</h2>
              <nav className="flex flex-col gap-2 relative z-10">
                <Link
                  href="/profile"
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-amber-50 hover:text-amber-600 rounded-xl transition font-medium"
                >
                  <User className="w-5 h-5" />
                  Profile Details
                </Link>
                <Link
                  href="/profile/orders"
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-amber-50 hover:text-amber-600 rounded-xl transition font-medium"
                >
                  <Package className="w-5 h-5" />
                  Order History
                </Link>
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 relative z-0">
            {children}
          </main>
          
        </div>
      </div>
      <Footer />
    </div>
  );
}
