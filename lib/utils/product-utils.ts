import type { Product, ProductType, ProductCategory } from '@/types';
import { Prisma } from '@prisma/client';

// Database Product type (matches actual Prisma response)
export type DbProduct = {
  id: string;
  name: string;
  photos: string[];
  price: Prisma.Decimal;
  specifications: string;
  category: ProductType;
  createdAt: Date;
  updatedAt: Date;
};

// Category mapping between database and frontend
export const CATEGORY_MAPPING: Record<ProductCategory, ProductType> = {
  Sarees: 'SAREE',
  'Indo-Western': 'INDO_WESTERN',
  Lehengas: 'LEHENGA',
  Suits: 'SUIT',
  'Kurta Pant': 'KURTA_PANT',
  Western: 'WESTERN',
};

export const CATEGORY_MAPPING_REVERSE: Record<ProductType, ProductCategory> = {
  SAREE: 'Sarees',
  INDO_WESTERN: 'Indo-Western',
  LEHENGA: 'Lehengas',
  SUIT: 'Suits',
  KURTA_PANT: 'Kurta Pant',
  WESTERN: 'Western',
  OTHER: 'Western',
};

// Transform database product to frontend product
export const transformDbProductToProduct = (dbProduct: DbProduct): Product => {
  return {
    id: dbProduct.id,
    name: dbProduct.name,
    price: Number(dbProduct.price),
    image:
      dbProduct.photos.length > 0 ? dbProduct.photos[0] : '/mocks/mock_mostRecommended_common.jpg',
    category: CATEGORY_MAPPING_REVERSE[dbProduct.category] || 'Western',
    specifications: dbProduct.specifications,
  };
};

// Transform array of database products to frontend products
export const transformDbProductsToProducts = (dbProducts: DbProduct[]): Product[] => {
  return dbProducts.map(transformDbProductToProduct);
};

// Convert frontend category to database category
export const getDbCategory = (frontendCategory: ProductCategory): ProductType => {
  return CATEGORY_MAPPING[frontendCategory] || 'OTHER';
};

// Convert frontend categories to database categories
export const getDbCategories = (frontendCategories: ProductCategory[]): ProductType[] => {
  return frontendCategories.map(getDbCategory);
};

// Get frontend category from database category
export const getFrontendCategory = (dbCategory: ProductType): ProductCategory => {
  return CATEGORY_MAPPING_REVERSE[dbCategory] || 'Western';
};

// Sort products by the specified criteria
export const sortProducts = (products: Product[], sortBy: string): Product[] => {
  const sortedProducts = [...products];

  switch (sortBy) {
    case 'price-low':
      return sortedProducts.sort((a, b) => a.price - b.price);
    case 'price-high':
      return sortedProducts.sort((a, b) => b.price - a.price);
    case 'newest':
      // Since we can't sort by ID (string), we'll sort by name as fallback
      return sortedProducts.sort((a, b) => b.name.localeCompare(a.name));
    default:
      return sortedProducts;
  }
};

// Filter products by search term
export const filterProductsBySearch = (products: Product[], search: string): Product[] => {
  if (!search.trim()) return products;

  const searchLower = search.toLowerCase();
  return products.filter(
    product =>
      product.name.toLowerCase().includes(searchLower) ||
      product.specifications?.toLowerCase().includes(searchLower) ||
      product.category.toLowerCase().includes(searchLower)
  );
};

// Filter products by categories
export const filterProductsByCategories = (
  products: Product[],
  categories: ProductCategory[]
): Product[] => {
  if (categories.length === 0) return products;

  return products.filter(product => categories.includes(product.category as ProductCategory));
};

// Filter products by price range
export const filterProductsByPriceRange = (
  products: Product[],
  priceRange: { min: number; max: number } | null
): Product[] => {
  if (!priceRange) return products;

  return products.filter(
    product => product.price >= priceRange.min && product.price <= priceRange.max
  );
};

// Get all available categories from products
export const getAvailableCategories = (products: Product[]): ProductCategory[] => {
  const categories = new Set<ProductCategory>();
  products.forEach(product => {
    if (product.category) {
      categories.add(product.category as ProductCategory);
    }
  });
  return Array.from(categories).sort();
};
