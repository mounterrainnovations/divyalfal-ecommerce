'use client';

import { useState, useEffect } from 'react';
import { X, Menu, User, LogOut, LayoutDashboard, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { NavLink } from '@/types';
import { Button } from '@/components/ui/button';

const NavBar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const closeMenu = () => {
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const navLinks: NavLink[] = [
    { name: 'Home', href: '/' },
    { name: 'All Products', href: '/products' },
    { name: 'Sale', href: '/sale' },
    { name: 'Virasat Academy', href: '/virasat-academy' },
    { name: 'Contact', href: '/contact-us' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-lg font-poppins">
      <div className="mx-auto px-4 sm:px-6 lg:px-34">
        {/* Desktop Layout */}
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

          <div className="text-base font-medium flex space-x-8 items-center">
            {navLinks.map(link => (
              <Link
                key={link.name}
                href={link.href}
                className="relative text-gray-700 hover:text-amber-600 transition group"
              >
                {link.name}
                <span
                  className="absolute left-0 bottom-[-4px] h-0.5 w-full bg-amber-600
                    transform scale-x-0 transition-transform duration-300
                    origin-right group-hover:scale-x-100 group-hover:origin-left"
                ></span>
              </Link>
            ))}
          </div>

          <div className="flex items-center space-x-4">
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
            ) : user ? (
              <div className="flex items-center gap-4">
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm" className="text-gray-700 hover:text-amber-600 gap-2 font-medium">
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </Button>
                </Link>
                <Button 
                  onClick={handleLogout} 
                  variant="outline" 
                  size="sm" 
                  className="border-amber-600 text-amber-600 hover:bg-amber-50 gap-2 font-bold"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/login">
                  <Button variant="ghost" className="text-gray-700 hover:text-amber-600 font-medium">
                    Login
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button className="bg-amber-600 text-white hover:bg-amber-700 font-bold shadow-md px-6">
                    Join Now
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden flex items-center justify-between h-24 relative">
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <Link href="/">
              <Image
                src="/DivyafalLogo.png"
                alt="DivyaFal Logo"
                width={140}
                height={60}
                className="h-10 w-auto object-contain sm:h-12"
                priority
              />
            </Link>
          </div>

          <button
            aria-label="Open menu"
            className="p-3 rounded-lg hover:bg-amber-50 transition ml-auto"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="text-gray-900" size={24} />
          </button>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      <div
        className={`fixed inset-0 z-50 flex transition-opacity duration-300 ${
          isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
      >
        <div
          className={`bg-white w-full h-full shadow-lg transition-transform duration-500 ease-in-out transform ${
            isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex justify-end px-6 h-24 items-center">
            <button
              onClick={closeMenu}
              className="p-3 rounded-lg hover:bg-amber-50 transition"
            >
              <X className="text-gray-900" size={28} />
            </button>
          </div>

          <div className="flex flex-col space-y-4 px-8 pt-4">
            {navLinks.map(link => (
              <Link
                key={link.name}
                href={link.href}
                className="text-gray-700 hover:text-amber-600 transition text-xl font-medium py-3 border-b border-gray-50 flex items-center"
                onClick={closeMenu}
              >
                {link.name}
              </Link>
            ))}

            <div className="pt-8 flex flex-col gap-4">
              {user ? (
                <>
                  <Link href="/dashboard" onClick={closeMenu}>
                    <Button variant="outline" className="w-full h-12 border-amber-600 text-amber-600 font-bold">
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      Admin Dashboard
                    </Button>
                  </Link>
                  <Button onClick={handleLogout} variant="ghost" className="w-full h-12 text-red-600 font-bold">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={closeMenu}>
                    <Button variant="outline" className="w-full h-12 border-amber-600 text-amber-600 font-bold">
                      Log In
                    </Button>
                  </Link>
                  <Link href="/signup" onClick={closeMenu}>
                    <Button className="w-full h-12 bg-amber-600 text-white font-bold">
                      Create Account
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
