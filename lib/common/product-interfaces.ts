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

// Utility function to format price consistently across components
export const formatPrice = (price: number | string): string => {
  const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
  return `₹${numericPrice.toLocaleString('en-IN')}`;
};

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
  { name: 'Sarees', image: '/categories/saree.jpg' },
  { name: 'Indo-Western', image: '/categories/indo_western.jpg' },
  { name: 'Lehengas', image: '/categories/lehenge.webp' },
  { name: 'Suits', image: '/categories/suits.jpg' },
  { name: 'Kurta Pant', image: '/categories/kurta.jpg' },
  { name: 'Western', image: '/categories/western.png' },
];
