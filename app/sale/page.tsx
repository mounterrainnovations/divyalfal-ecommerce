'use client';

import Link from 'next/link';
import { ChevronRight, Flame } from 'lucide-react';
import { useState, useMemo, useCallback, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Filter, X, SlidersHorizontal } from 'lucide-react';
import ProductCard from '@/components/features/products/product-card';
import { SortDropdown } from '@/components/ui/sort-dropdown';
import { categories } from '@/lib/data/mock-products';
import { useImagePreloader } from '@/lib/hooks/useImagePreloader';
import type { Product } from '@/types';

interface FilterState {
  search: string;
  categories: string[];
  discountRange: { min: number; max: number } | null;
  sortBy: string;
}

interface ApiResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Discount ranges for sale products
const discountRanges = [
  { label: '10-25% OFF', min: 10, max: 25 },
  { label: '25-50% OFF', min: 25, max: 50 },
  { label: '50-75% OFF', min: 50, max: 75 },
  { label: '75%+ OFF', min: 75, max: 100 },
];

// Sort options including discount-based sorting
const saleSortOptions = [
  { value: 'default', label: 'Default' },
  { value: 'discount-high', label: 'Highest Discount' },
  { value: 'discount-low', label: 'Lowest Discount' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest First' },
];

// Calculate discount percentage
const calculateDiscountPercentage = (price: number, salePrice: number): number => {
  return Math.round(((price - salePrice) / price) * 100);
};

const SalePage = () => {
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    categories: [],
    discountRange: null,
    sortBy: 'discount-high', // Default to highest discount
  });

  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [isMobileFiltersAnimating, setIsMobileFiltersAnimating] = useState(false);

  // API data states
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize filters from URL params
  useEffect(() => {
    const categoriesParam = searchParams.get('categories');
    if (categoriesParam) {
      const categoryList = categoriesParam.split(',').map(cat => decodeURIComponent(cat.trim()));
      setFilters(prev => ({
        ...prev,
        categories: categoryList,
      }));
    }
  }, [searchParams]);

  // Control Animation
  const closeMobileFilters = () => {
    setIsMobileFiltersAnimating(true);
    setTimeout(() => {
      setShowMobileFilters(false);
      setIsMobileFiltersAnimating(false);
    }, 600);
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobileFilters();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // Fetch products from API
  const fetchProducts = useCallback(
    async (retryCount = 0) => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();

        if (filters.search) params.append('search', filters.search);
        if (filters.categories.length > 0)
          params.append('categories', filters.categories.join(','));
        params.append('limit', '50');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(`/api/products?${params.toString()}`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 500 && retryCount < 2) {
            setTimeout(() => fetchProducts(retryCount + 1), 1000);
            return;
          }
          throw new Error(`Failed to fetch products: ${response.statusText}`);
        }

        const data: ApiResponse = await response.json();
        // Filter only products on sale
        const saleProducts = data.products.filter(p => p.sale && p.salePrice);
        setProducts(saleProducts);
      } catch (err) {
        if (err instanceof Error && err.name === 'TypeError' && retryCount < 2) {
          setTimeout(() => fetchProducts(retryCount + 1), 1000);
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to fetch products');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    },
    [filters.search, filters.categories]
  );

  // Fetch products when filters change
  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      fetchProducts();
    }, 300);

    return () => clearTimeout(debounceTimeout);
  }, [fetchProducts]);

  // Preload images
  const imageUrls = useMemo(() => {
    return products
      .slice(0, 12)
      .map(p => p.image)
      .filter(Boolean) as string[];
  }, [products]);

  useImagePreloader({ urls: imageUrls, maxConcurrent: 4 });

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    if (loading || error) return [];

    let result = [...products];

    // Apply discount range filter
    if (filters.discountRange) {
      result = result.filter(product => {
        if (!product.salePrice) return false;
        const discount = calculateDiscountPercentage(product.price, product.salePrice);
        return discount >= filters.discountRange!.min && discount <= filters.discountRange!.max;
      });
    }

    // Apply sorting
    switch (filters.sortBy) {
      case 'discount-high':
        result.sort((a, b) => {
          const discountA = a.salePrice ? calculateDiscountPercentage(a.price, a.salePrice) : 0;
          const discountB = b.salePrice ? calculateDiscountPercentage(b.price, b.salePrice) : 0;
          return discountB - discountA;
        });
        break;
      case 'discount-low':
        result.sort((a, b) => {
          const discountA = a.salePrice ? calculateDiscountPercentage(a.price, a.salePrice) : 0;
          const discountB = b.salePrice ? calculateDiscountPercentage(b.price, b.salePrice) : 0;
          return discountA - discountB;
        });
        break;
      case 'price-low':
        result.sort((a, b) => (a.salePrice || a.price) - (b.salePrice || b.price));
        break;
      case 'price-high':
        result.sort((a, b) => (b.salePrice || b.price) - (a.salePrice || a.price));
        break;
      default:
        break;
    }

    return result;
  }, [products, filters.discountRange, filters.sortBy, loading, error]);

  // Filter handlers
  const handleSearchChange = useCallback((value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
  }, []);

  const handleCategoryToggle = useCallback((category: string) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category],
    }));
  }, []);

  const handleDiscountRangeChange = useCallback(
    (discountRange: { min: number; max: number } | null) => {
      setFilters(prev => ({ ...prev, discountRange }));
    },
    []
  );

  const handleSortChange = useCallback((sortBy: string) => {
    setFilters(prev => ({ ...prev, sortBy }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({
      search: '',
      categories: [],
      discountRange: null,
      sortBy: 'discount-high',
    });
  }, []);

  const activeFiltersCount =
    (filters.search ? 1 : 0) + filters.categories.length + (filters.discountRange ? 1 : 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
      {/* Hero Section */}
      <section className="relative w-full py-20 md:py-32 border-b border-red-200">
        <div className="container mx-auto px-4 lg:px-12 xl:px-16">
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center justify-center gap-2 mb-8 text-sm md:text-base">
            <Link href="/" className="hover:underline transition-all">
              Home
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-muted-foreground">Sale</span>
          </nav>

          {/* Hero Heading */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              <Flame className="w-12 h-12 md:w-16 md:h-16 text-red-500 animate-pulse" />
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                Sale
              </h1>
              <Flame className="w-12 h-12 md:w-16 md:h-16 text-red-500 animate-pulse" />
            </div>
            <p className="text-lg md:text-xl text-gray-700 font-medium">
              🎉 Exclusive deals and discounts on premium products
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 lg:px-12 xl:px-16 py-8">
        {/* Search and Mobile Filter Button */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search sale products..."
              value={filters.search}
              onChange={e => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          {/* Mobile Filter Button */}
          <button
            onClick={() => setShowMobileFilters(true)}
            className="flex items-center gap-2 px-4 py-3 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors lg:hidden"
          >
            <SlidersHorizontal className="w-5 h-5" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-12">
          {/* Desktop Sidebar Filters */}
          <div className="hidden lg:block w-80 shrink-0">
            <SaleFilters
              filters={filters}
              onCategoryToggle={handleCategoryToggle}
              onDiscountRangeChange={handleDiscountRangeChange}
              onClearFilters={clearAllFilters}
              activeFiltersCount={activeFiltersCount}
            />
          </div>

          {/* Mobile slide-in filters */}
          <div
            className={`fixed inset-0 z-50 flex transition-opacity duration-300 lg:hidden ${
              showMobileFilters ? 'opacity-100 visible' : 'opacity-0 invisible'
            }`}
          >
            <div
              className={`bg-white w-full h-full shadow-lg transform transition-transform duration-600 ease-in-out
                ${
                  isMobileFiltersAnimating
                    ? 'translate-x-full'
                    : showMobileFilters
                      ? 'translate-x-0'
                      : 'translate-x-full'
                }`}
            >
              <div className="flex justify-end px-6 h-24 border-b">
                <button
                  aria-label="Close filters"
                  onClick={closeMobileFilters}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={28} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto h-[calc(100vh-6rem)]">
                <SaleFilters
                  filters={filters}
                  onCategoryToggle={handleCategoryToggle}
                  onDiscountRangeChange={handleDiscountRangeChange}
                  onClearFilters={clearAllFilters}
                  activeFiltersCount={activeFiltersCount}
                  isMobile={true}
                  onClose={closeMobileFilters}
                />
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1">
            {/* Sort and Results Count */}
            <div className="flex items-center justify-between mb-8">
              <p className="text-gray-600">
                {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}{' '}
                on sale
              </p>
              <SortDropdown
                options={saleSortOptions}
                value={filters.sortBy}
                onValueChange={handleSortChange}
              />
            </div>

            {/* Active Filters */}
            {activeFiltersCount > 0 && (
              <div className="mb-8 p-4 bg-white rounded-lg border border-red-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">Active Filters</h3>
                  <button
                    onClick={clearAllFilters}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Clear all
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {filters.search && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 rounded-full text-sm">
                      Search: {filters.search}
                      <button onClick={() => handleSearchChange('')}>
                        <X className="w-4 h-4" />
                      </button>
                    </span>
                  )}
                  {filters.categories.map(category => (
                    <span
                      key={category}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 rounded-full text-sm"
                    >
                      {category}
                      <button onClick={() => handleCategoryToggle(category)}>
                        <X className="w-4 h-4" />
                      </button>
                    </span>
                  ))}
                  {filters.discountRange && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 rounded-full text-sm">
                      {filters.discountRange.min}-{filters.discountRange.max}% OFF
                      <button onClick={() => handleDiscountRangeChange(null)}>
                        <X className="w-4 h-4" />
                      </button>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="text-center py-16">
                <div className="w-24 h-24 mx-auto mb-6 border-4 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
                <h3 className="text-xl font-poppins font-semibold text-gray-900 mb-2">
                  Loading Sale Products...
                </h3>
                <p className="text-gray-600">Finding the best deals for you!</p>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="text-center py-16">
                <div className="w-24 h-24 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
                  <Filter className="w-12 h-12 text-red-400" />
                </div>
                <h3 className="text-xl font-poppins font-semibold text-gray-900 mb-2">
                  Something went wrong
                </h3>
                <p className="text-gray-600 mb-6">{error}</p>
                <button
                  onClick={() => fetchProducts()}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* No Results State */}
            {!loading && !error && filteredProducts.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 mx-auto mb-6 bg-orange-100 rounded-full flex items-center justify-center">
                  <Flame className="w-12 h-12 text-orange-400" />
                </div>
                <h3 className="text-xl font-poppins font-semibold text-gray-900 mb-2">
                  No sale products found
                </h3>
                <p className="text-gray-600 mb-6">
                  Check back soon for amazing deals and discounts!
                </p>
                <button
                  onClick={clearAllFilters}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            ) : null}

            {/* Products Grid */}
            {!loading && !error && filteredProducts.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {filteredProducts.map((product, index) => (
                  <ProductCard key={product.id} product={product} priority={index < 8} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Filter Components
interface SaleFiltersProps {
  filters: FilterState;
  onCategoryToggle: (category: string) => void;
  onDiscountRangeChange: (discountRange: { min: number; max: number } | null) => void;
  onClearFilters: () => void;
  activeFiltersCount: number;
  isMobile?: boolean;
  onClose?: () => void;
}

const SaleFilters = ({
  filters,
  onCategoryToggle,
  onDiscountRangeChange,
  onClearFilters,
  activeFiltersCount,
  isMobile = false,
  onClose,
}: SaleFiltersProps) => {
  return (
    <div className="space-y-6">
      {/* Category Filter */}
      <div className="bg-white p-6 rounded-lg border border-red-200">
        <h3 className="font-poppins font-semibold mb-4">Categories</h3>
        <div className="space-y-2">
          {categories.map(category => (
            <label key={category} className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.categories.includes(category)}
                onChange={() => onCategoryToggle(category)}
                className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
              />
              <span className="text-gray-700">{category}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Discount Range Filter */}
      <div className="bg-white p-6 rounded-lg border border-red-200">
        <h3 className="font-poppins font-semibold mb-4">Discount</h3>
        <div className="space-y-3">
          {discountRanges.map(range => (
            <label key={range.label} className="flex items-center space-x-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="radio"
                  name="discountRange"
                  checked={
                    filters.discountRange?.min === range.min &&
                    filters.discountRange?.max === range.max
                  }
                  onChange={() => onDiscountRangeChange({ min: range.min, max: range.max })}
                  className="sr-only"
                />
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                    filters.discountRange?.min === range.min &&
                    filters.discountRange?.max === range.max
                      ? 'border-red-600 bg-red-600'
                      : 'border-gray-300 group-hover:border-red-400'
                  }`}
                >
                  {filters.discountRange?.min === range.min &&
                    filters.discountRange?.max === range.max && (
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    )}
                </div>
              </div>
              <span
                className={`text-sm transition-colors duration-200 ${
                  filters.discountRange?.min === range.min &&
                  filters.discountRange?.max === range.max
                    ? 'text-red-600 font-medium'
                    : 'text-gray-700 group-hover:text-red-600'
                }`}
              >
                {range.label}
              </span>
            </label>
          ))}
          <label className="flex items-center space-x-3 cursor-pointer group">
            <div className="relative">
              <input
                type="radio"
                name="discountRange"
                checked={filters.discountRange === null}
                onChange={() => onDiscountRangeChange(null)}
                className="sr-only"
              />
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                  filters.discountRange === null
                    ? 'border-red-600 bg-red-600'
                    : 'border-gray-300 group-hover:border-red-400'
                }`}
              >
                {filters.discountRange === null && (
                  <div className="w-2 h-2 rounded-full bg-white"></div>
                )}
              </div>
            </div>
            <span
              className={`text-sm transition-colors duration-200 ${
                filters.discountRange === null
                  ? 'text-red-600 font-medium'
                  : 'text-gray-700 group-hover:text-red-600'
              }`}
            >
              All Discounts
            </span>
          </label>
        </div>
      </div>

      {/* Clear Filters */}
      {activeFiltersCount > 0 && (
        <div className="bg-white p-6 rounded-lg border border-red-200">
          <button
            onClick={onClearFilters}
            className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Clear all filters ({activeFiltersCount})
          </button>
        </div>
      )}

      {isMobile && (
        <div className="bg-white p-6 rounded-lg border border-red-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Apply Filters
          </button>
        </div>
      )}
    </div>
  );
};

// Wrapper component with Suspense boundary
export default function SalePageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-6 border-4 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
            <p className="text-gray-600">Loading sale products...</p>
          </div>
        </div>
      }
    >
      <SalePage />
    </Suspense>
  );
}
