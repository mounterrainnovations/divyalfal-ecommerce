// Centralized type definitions for the application

export interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
  category: string;
}

export interface FilterState {
  categories: string[];
  priceRange: [number, number];
  sortBy: string;
}

export interface PriceRange {
  label: string;
  min: number;
  max: number;
}

export interface SortOption {
  value: string;
  label: string;
}

export type ProductCategory =
  | 'Sarees'
  | 'Indo-Western'
  | 'Lehengas'
  | 'Suits'
  | 'Kurta Pant'
  | 'Western';

// Navigation link interface
export interface NavLink {
  name: string;
  href: string;
}
