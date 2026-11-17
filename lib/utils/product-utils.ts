import type { DbProduct, Product, ProductType, ProductCategory } from '@/types';

// Category mapping between database and frontend
export const CATEGORY_MAPPING: Record<ProductCategory, ProductType> = {
  Sarees: 'SAREE',
  'Indo-Western': 'INDO_WESTERN',
  Lehengas: 'LEHENGA',
  Suits: 'SUIT',
  'Kurta Pant': 'KURTA_PANT',
  Western: 'WESTERN',
  Other: 'OTHER',
};

/**
 * `OTHER` maps to its own label, not to `Western`.
 *
 * It used to read 'Western', and the mapping is used in both directions: the admin product
 * sheet turns a product's label back into the enum with `getDbCategory`, so opening an
 * uncategorised garment showed "Western" and saving it — saving anything else about it —
 * rewrote its category to WESTERN for good. `OTHER` is the schema default, so every product
 * created without a category was one edit away from being silently filed under Western.
 *
 * 'Other' is not one of the six shop categories and no storefront filter offers it, which is
 * correct: an uncategorised garment should not appear under a category that is not its own.
 */
export const CATEGORY_MAPPING_REVERSE: Record<ProductType, ProductCategory> = {
  SAREE: 'Sarees',
  INDO_WESTERN: 'Indo-Western',
  LEHENGA: 'Lehengas',
  SUIT: 'Suits',
  KURTA_PANT: 'Kurta Pant',
  WESTERN: 'Western',
  OTHER: 'Other',
};

// Transform database product to frontend product
export const transformDbProductToProduct = (dbProduct: DbProduct): Product => {
  return {
    id: dbProduct.id,
    name: dbProduct.name,
    price: typeof dbProduct.price === 'string' ? Number(dbProduct.price) : Number(dbProduct.price),
    sale: dbProduct.sale ?? undefined,
    salePrice: dbProduct.salePrice
      ? typeof dbProduct.salePrice === 'string'
        ? Number(dbProduct.salePrice)
        : Number(dbProduct.salePrice)
      : undefined,
    image:
      dbProduct.photos.length > 0 ? dbProduct.photos[0] : '/mocks/mock_mostRecommended_common.jpg',
    photos: dbProduct.photos, // Include all photos
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

/**
 * Photographed garments lead; the rest keep their order behind them.
 *
 * `ProductTile` renders an honest labelled frame for a product with no photos, and that is
 * right — but a 660px-wide empty frame cannot carry the opening moment of an editorial
 * sequence, and the live catalogue's newest product happens to have no photos at all. A
 * stable partition is the whole rule: nothing is hidden, nothing is reordered within a
 * group, and a sequence simply opens with a garment it can actually show.
 */
export const photographedFirst = (products: Product[]): Product[] => [
  ...products.filter(product => product.photos.length > 0),
  ...products.filter(product => product.photos.length === 0),
];

/**
 * Whether a set of products can carry a photography-led band at all.
 *
 * The homepage's two product movements compose around photographs, and the live catalogue
 * holds one product in `shopByStyle` with no photos whatsoever. Testing `products.length === 0`
 * before standing the composed placeholder tier up therefore rendered a single empty "image
 * coming soon" frame under a display heading, while the composed tier sat behind a condition
 * only a genuinely empty catalogue could satisfy — a half-empty grid, which spec §5 forbids.
 *
 * The frame itself stays right: a garment with no picture must say so rather than borrow a
 * stock one. This is the section-level question, which is a different one — is there anything
 * here to photograph a movement with?
 */
export const hasPhotographed = (products: Product[]): boolean =>
  products.some(product => product.photos.length > 0);
