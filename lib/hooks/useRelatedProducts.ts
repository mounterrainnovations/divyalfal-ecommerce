'use client';

import { useEffect, useState } from 'react';
import type { Product } from '@/types';

/** The request the product page has always made; its shape is unchanged. */
export const RELATED_PRODUCTS_ENDPOINT = '/api/products?limit=4';

/**
 * Up to four other products to close the detail page with.
 *
 * It asks for the first four products and drops the one being viewed, so a catalogue that
 * includes the current garment yields three, exactly as the page always did. Every failure
 * (network, non-2xx, a payload of the wrong shape) ends in an empty list, and the strip
 * simply does not render: the page is complete without it.
 */
export function useRelatedProducts(currentProductId: string): { products: Product[]; loading: boolean } {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch(RELATED_PRODUCTS_ENDPOINT);
        if (!response.ok) return;
        const data: unknown = await response.json();
        const list = (data as { products?: unknown } | null)?.products;
        if (!Array.isArray(list) || cancelled) return;
        setProducts(
          list
            .filter(
              (p): p is Product =>
                !!p && typeof p === 'object' && typeof (p as Product).id === 'string' && (p as Product).id !== currentProductId
            )
            .map(p => ({ ...p, photos: Array.isArray(p.photos) ? p.photos : [] }))
            .slice(0, 4)
        );
      } catch (error) {
        console.error('Error fetching related products:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [currentProductId]);

  return { products, loading };
}
