import Image from 'next/image';
import Link from 'next/link';
import Footer from '@/components/layout/footer';
import DashboardClient from './dashboard-client';

export default function DashboardPage() {
  return (
    <>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-lg font-poppins">
        <div className="mx-auto px-4 sm:px-6 lg:px-34">
          <div className="hidden md:flex justify-between items-center h-24">
            <div className="shrink-0 flex items-center">
              <Link href="/">
                <Image
                  src="/DivyafalLogo.png"
                  alt="DivyaFal Logo"
                  width={140}
                  height={60}
                  className="h-12 w-auto sm:h-12 md:h-14 lg:h-16 object-contain"
                  priority
                />
              </Link>
            </div>

            <div className="text-lg font-semibold text-gray-900">Admin Dashboard</div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-24">
        <DashboardClient />
      </main>

      {/* Footer */}
      <Footer />
    </>
  );
}
