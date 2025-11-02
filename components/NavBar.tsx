'use client';

import { useState, useEffect } from 'react';
import { X, Menu, Search } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const NavBar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Control Animation
  const closeMenu = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setIsMobileMenuOpen(false);
      setIsAnimating(false);
    }, 600);
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Catalogue', href: '/catalogue' },
    { name: 'All Products', href: '/products' },
    { name: 'Contact', href: '/contact-us' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-lg font-poppins">
      <div className="mx-auto px-4 sm:px-6 lg:px-34">
        <div className="flex justify-between items-center h-24">
          <div className="shrink-0 flex items-center">
            <Image
              src="/DivyafalLogo.png"
              alt="DivyaFal Logo"
              width={140}
              height={60}
              className="h-12 w-auto sm:h-12 md:h-14 lg:h-16 object-contain"
              priority
            />
          </div>

          <div className="hidden text-xl font-semibold md:flex space-x-8">
            {navLinks.map(link => (
              <Link key={link.name} href={link.href} className="relative text-gray-900 transition group">
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
            <button aria-label="Search" className="p-2 rounded hover:bg-gray-100 transition">
              <Search size={24} />
            </button>

            {/*
            //! Later - Shopping Cart
             */}
            {/* <button aria-label="Cart" className="p-2 rounded hover:bg-gray-100 transition">
              <ShoppingCart size={24} />
            </button> */}

            <button
              aria-label="Open menu"
              className="md:hidden p-2 rounded hover:bg-gray-100 transition"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
          </div>
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
          className={`bg-white w-full h-full shadow-lg transform transition-transform duration-600 ease-in-out 
            ${
              isAnimating
                ? 'translate-x-full'
                : isMobileMenuOpen
                  ? 'translate-x-0'
                  : 'translate-x-full'
            }`}
        >
          <div className="flex justify-end px-6 h-24">
            <button aria-label="Close menu" onClick={closeMenu}>
              <X size={28} />
            </button>
          </div>

          <div className="flex flex-col space-y-4 px-10">
            {navLinks.map(link => (
              <Link
                key={link.name}
                href={link.href}
                className="text-gray-700 hover:text-gray-900 transition text-xl"
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
