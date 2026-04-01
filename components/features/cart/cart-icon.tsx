'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { useCartStore } from '@/lib/store/cart';

export default function CartIcon() {
  const [mounted, setMounted] = useState(false);
  const totalItems = useCartStore((state) => state.getTotalItems());

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Link href="/cart" className="relative p-2 text-gray-700 hover:text-amber-600 transition flex items-center justify-center group">
      <ShoppingCart className="w-6 h-6 sm:w-7 sm:h-7 transition-transform group-hover:scale-110" />
      {mounted && totalItems > 0 && (
        <span className="absolute top-0 right-0 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-amber-600 text-[10px] sm:text-xs font-bold text-white shadow-sm ring-2 ring-white transform translate-x-1/4 -translate-y-1/4">
          {totalItems > 99 ? '99+' : totalItems}
        </span>
      )}
    </Link>
  );
}
