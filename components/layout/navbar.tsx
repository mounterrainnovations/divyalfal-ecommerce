'use client';

import { useState, useEffect } from 'react';
import { X, Menu } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { NavLink } from '@/types';

const NavBar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Control Animation
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
    { name: 'Virasath Academy', href: '/virasath-academy' },
    { name: 'Contact', href: '/contact-us' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-lg font-poppins">
      <div className="mx-auto px-4 sm:px-6 lg:px-34">
        {/* Desktop Layout */}
        <div className="hidden md:flex justify-between items-center h-24">
          <div className="shrink-0 flex items-center">
            <Link key="Home" href="/">
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

          <div className="text-xl font-semibold flex space-x-8">
            {navLinks.map(link => (
              <Link
                key={link.name}
                href={link.href}
                className="relative text-gray-900 transition group"
              >
                {link.name}
                <span
                  className="absolute left-0 bottom-0 h-px w-full bg-gray-900
                    transform scale-x-0 transition-transform duration-300
                    origin-right group-hover:scale-x-100 group-hover:origin-left"
                ></span>
              </Link>
            ))}
          </div>

          <div className="flex items-center space-x-4">
            {/*
            //! Later - Shopping Cart
             */}
            {/* <button aria-label="Cart" className="p-2 rounded hover:bg-gray-100 transition">
              <ShoppingCart size={24} />
            </button> */}
          </div>
        </div>

        {/* Mobile Layout - Logo Center, Menu Right */}
        <div className="md:hidden flex items-center justify-between h-24">
          {/* Center: Logo */}
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <Link key="Home" href="/">
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

          {/* Right: Menu Icon */}
          <button
            aria-label="Open menu"
            className="p-3 rounded-lg hover:bg-gray-100 transition min-w-[48px] min-h-[48px] flex items-center justify-center"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu size={24} />
          </button>
        </div>
      </div>

      {/* Mobile slide-in menu (always rendered) */}
      <div
        className={`fixed inset-0 z-50 flex transition-opacity duration-300 ${
          isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
      >
        {/* Panel */}
        <div
          className={`bg-white w-full h-full shadow-lg transition-transform duration-600 ease-in-out transform ${
            isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex justify-end px-6 h-24 items-center">
            <button
              aria-label="Close menu"
              onClick={closeMenu}
              className="p-3 rounded-lg hover:bg-gray-100 transition min-w-[48px] min-h-[48px] flex items-center justify-center"
            >
              <X size={28} />
            </button>
          </div>

          <div className="flex flex-col space-y-6 px-8 sm:px-10">
            {navLinks.map(link => (
              <Link
                key={link.name}
                href={link.href}
                className="text-gray-700 hover:text-gray-900 transition text-xl py-3 px-2 -mx-2 rounded-lg hover:bg-gray-50 min-h-[48px] flex items-center"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
