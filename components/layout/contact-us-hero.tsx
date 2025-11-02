'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

const ContactUsHero = () => {
  return (
    <section className="relative w-full py-20 md:py-32 border-b">
      <div className="container mx-auto px-4">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center justify-center gap-2 mb-8 text-sm md:text-base">
          <Link href="/" className="hover:underline transition-all">
            Home
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-muted-foreground">Contact Us</span>
        </nav>

        {/* Hero Heading */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif text-center">Contact Us</h1>
      </div>
    </section>
  );
};

export default ContactUsHero;
