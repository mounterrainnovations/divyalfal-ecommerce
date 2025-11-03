import type { PriceRange, SortOption, ProductCategory } from '@/types';

// Static configuration data for filters - categories and options
export const categories: ProductCategory[] = [
  'Sarees',
  'Indo-Western',
  'Lehengas',
  'Suits',
  'Kurta Pant',
  'Western',
];

// Price filter options
export const priceRanges: PriceRange[] = [
  { label: 'Under ₹25,000', min: 0, max: 25000 },
  { label: '₹25,000 - ₹50,000', min: 25000, max: 50000 },
  { label: '₹50,000 - ₹75,000', min: 50000, max: 75000 },
  { label: '₹75,000 - ₹1,00,000', min: 75000, max: 100000 },
  { label: 'Above ₹1,00,000', min: 100000, max: 200000 },
];

// Sort options
export const sortOptions: SortOption[] = [
  { value: 'default', label: 'Default' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest First' },
];
