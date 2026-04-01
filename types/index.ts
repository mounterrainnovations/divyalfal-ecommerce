import { Prisma } from '@prisma/client';

// Centralized type definitions for the application

// Database Product type (matches Prisma schema)
export interface DbProduct {
  id: string;
  name: string;
  photos: string[];
  price: Prisma.Decimal | string | number; // Prisma.Decimal type - handled by transform functions
  sale?: boolean | null;
  salePrice?: Prisma.Decimal | string | number | null;
  specifications: string;
  category: ProductType;
  isArchived: boolean;
  variants?: DbProductVariant[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DbProductVariant {
  id: string;
  productId: string;
  size: string;
  color: string | null;
  stock: number;
  createdAt: Date;
  updatedAt: Date;
}

// Frontend Product type (transformed for UI)
export interface Product {
  id: string;
  name: string;
  price: number;
  sale?: boolean;
  salePrice?: number;
  image: string; // First photo for backward compatibility
  photos: string[]; // All photos
  category: string;
  specifications?: string;
  description?: string;
  mostRecommended?: boolean;
  isArchived?: boolean;
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  productId: string;
  size: string;
  color?: string | null;
  stock: number;
}

export type ProductType =
  | 'SAREE'
  | 'INDO_WESTERN'
  | 'LEHENGA'
  | 'SUIT'
  | 'KURTA_PANT'
  | 'WESTERN'
  | 'OTHER';

export type ProductCategory =
  | 'Sarees'
  | 'Indo-Western'
  | 'Lehengas'
  | 'Suits'
  | 'Kurta Pant'
  | 'Western';

// Filter state for frontend
export interface FilterState {
  search: string;
  categories: string[];
  priceRange: { min: number; max: number } | null;
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

// API Response types
export interface ProductsResponse {
  products: DbProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProductFilters {
  search?: string;
  categories?: ProductType[];
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Navigation link interface
export interface NavLink {
  name: string;
  href: string;
}
