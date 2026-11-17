// Common product interfaces and utilities for the application

export interface BaseProduct {
  id: string | number;
  name: string;
  price: number | string;
  image: string;
  category?: string;
  specifications?: string;
}

export interface CategoryItem {
  name: string;
  image: string;
  href?: string;
}

// Price formatting lives in lib/utils/price.ts, the single implementation. Re-exported
// here so existing importers keep working.
export { formatPrice } from '@/lib/utils/price';

// Utility function to format display price (for mock data)
export const formatDisplayPrice = (price: string | number): string => {
  if (typeof price === 'string') {
    return price; // Already formatted as "Rs. 10,999.00"
  }
  return `Rs. ${price.toLocaleString('en-IN', { minimumFractionDigits: 0 })}.00`;
};

// Common image fallback
export const DEFAULT_IMAGE_FALLBACK = '/mocks/mock_mostRecommended_common.jpg';

// Standard category definitions
export const CATEGORY_CONFIG: CategoryItem[] = [
  { name: 'Sarees', image: '/samples/categories/category-sarees-embroidered-stole.webp' },
  { name: 'Indo-Western', image: '/samples/categories/category-indo-western-gold-silk-daylight.webp' },
  { name: 'Lehengas', image: '/samples/categories/category-lehengas-hung-on-the-door.webp' },
  { name: 'Suits', image: '/samples/categories/category-suits-ivory-on-wooden-hangers.webp' },
  { name: 'Kurta Pant', image: '/samples/categories/category-kurta-pant-hung-set.webp' },
  { name: 'Western', image: '/samples/categories/category-western-pale-rail.webp' },
];

// Homepage product interface with mock fallback support
export interface HomepageProduct extends BaseProduct {
  isMock?: boolean;
  thumbnail?: string;
  bgColor?: string;
  backImage?: string;
  frontImage?: string;
}
