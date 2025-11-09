'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useState, useMemo, useCallback, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Filter, X, SlidersHorizontal } from 'lucide-react';
import ProductCard from '@/components/features/products/product-card';
import { SortDropdown } from '@/components/ui/sort-dropdown';
import { categories, priceRanges, sortOptions } from '@/lib/data/mock-products';
import { useImagePreloader } from '@/lib/hooks/useImagePreloader';
import type { Product } from '@/types';

interface FilterState {
  search: string;
  categories: string[];
  priceRange: { min: number; max: number } | null;
  sortBy: string;
}

interface ApiResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const ProductsPage = () => {
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    categories: [],
    priceRange: null,
    sortBy: 'default',
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

  // Control Animation - Similar to navbar
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
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      if (filters.search) params.append('search', filters.search);
      if (filters.categories.length > 0) params.append('categories', filters.categories.join(','));
      if (filters.priceRange) {
        params.append('minPrice', filters.priceRange.min.toString());
        params.append('maxPrice', filters.priceRange.max.toString());
      }
      if (filters.sortBy !== 'default') params.append('sortBy', filters.sortBy);
      params.append('limit', '50'); // Load more products initially

      const response = await fetch(`/api/products?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.statusText}`);
      }

      const data: ApiResponse = await response.json();
      setProducts(data.products);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Fetch products when filters change
  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      fetchProducts();
    }, 300); // Debounce API calls

    return () => clearTimeout(debounceTimeout);
  }, [fetchProducts]);

  // Preload images for better UX (preload first 12 images)
  const imageUrls = useMemo(() => {
    return products
      .slice(0, 12)
      .map(p => p.image)
      .filter(Boolean) as string[];
  }, [products]);

  useImagePreloader({ urls: imageUrls, maxConcurrent: 4 });

  // Filter and sort products locally if needed
  const filteredProducts = useMemo(() => {
    if (loading || error) return [];

    const result = [...products];

    // Apply client-side sorting as fallback
    switch (filters.sortBy) {
      case 'price-low':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        // Sort by created date (this will be handled by API mostly)
        break;
      default:
        // Default order from API
        break;
    }

    return result;
  }, [products, filters.sortBy, loading, error]);

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

  const handlePriceRangeChange = useCallback((priceRange: { min: number; max: number } | null) => {
    setFilters(prev => ({ ...prev, priceRange }));
  }, []);

  const handleSortChange = useCallback((sortBy: string) => {
    setFilters(prev => ({ ...prev, sortBy }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({
      search: '',
      categories: [],
      priceRange: null,
      sortBy: 'default',
    });
  }, []);

  const activeFiltersCount =
    (filters.search ? 1 : 0) + filters.categories.length + (filters.priceRange ? 1 : 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section - Similar to Contact Us */}
      <section className="relative w-full py-20 md:py-32 border-b">
        <div className="container mx-auto px-4 lg:px-12 xl:px-16">
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center justify-center gap-2 mb-8 text-sm md:text-base">
            <Link href="/" className="hover:underline transition-all">
              Home
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-muted-foreground">All Products</span>
          </nav>

          {/* Hero Heading */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif text-center">All Products</h1>
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
              placeholder="Search products..."
              value={filters.search}
              onChange={e => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>

          {/* Mobile Filter Button */}
          <button
            onClick={() => setShowMobileFilters(true)}
            className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors lg:hidden"
          >
            <SlidersHorizontal className="w-5 h-5" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="bg-gray-900 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-12">
          {/* Desktop Sidebar Filters */}
          <div className="hidden lg:block w-80 shrink-0">
            <ProductFilters
              filters={filters}
              onCategoryToggle={handleCategoryToggle}
              onPriceRangeChange={handlePriceRangeChange}
              onClearFilters={clearAllFilters}
              activeFiltersCount={activeFiltersCount}
            />
          </div>

          {/* Mobile slide-in filters (always rendered) - Similar to navbar */}
          <div
            className={`fixed inset-0 z-50 flex transition-opacity duration-300 lg:hidden ${
              showMobileFilters ? 'opacity-100 visible' : 'opacity-0 invisible'
            }`}
          >
            {/* Panel */}
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
              {/* Header */}
              <div className="flex justify-end px-6 h-24 border-b">
                <button
                  aria-label="Close filters"
                  onClick={closeMobileFilters}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={28} />
                </button>
              </div>

              {/* Filters Content */}
              <div className="p-6 overflow-y-auto h-[calc(100vh-6rem)]">
                <ProductFilters
                  filters={filters}
                  onCategoryToggle={handleCategoryToggle}
                  onPriceRangeChange={handlePriceRangeChange}
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
                found
              </p>
              <SortDropdown
                options={sortOptions}
                value={filters.sortBy}
                onValueChange={handleSortChange}
              />
            </div>

            {/* Active Filters */}
            {activeFiltersCount > 0 && (
              <div className="mb-8 p-4 bg-white rounded-lg border">
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
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm">
                      Search: {filters.search}
                      <button onClick={() => handleSearchChange('')}>
                        <X className="w-4 h-4" />
                      </button>
                    </span>
                  )}
                  {filters.categories.map(category => (
                    <span
                      key={category}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm"
                    >
                      {category}
                      <button onClick={() => handleCategoryToggle(category)}>
                        <X className="w-4 h-4" />
                      </button>
                    </span>
                  ))}
                  {filters.priceRange && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm">
                      ₹{filters.priceRange.min.toLocaleString()} - ₹
                      {filters.priceRange.max.toLocaleString()}
                      <button onClick={() => handlePriceRangeChange(null)}>
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
                <div className="w-24 h-24 mx-auto mb-6 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
                <h3 className="text-xl font-poppins font-semibold text-gray-900 mb-2">
                  Loading Products...
                </h3>
                <p className="text-gray-600">Please wait while we fetch the latest collection.</p>
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
                  onClick={fetchProducts}
                  className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* No Results State */}
            {!loading && !error && filteredProducts.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                  <Filter className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-poppins font-semibold text-gray-900 mb-2">
                  No products found
                </h3>
                <p className="text-gray-600 mb-6">Stay Tuned! What you want might be on its way!</p>
                <button
                  onClick={clearAllFilters}
                  className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
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
interface ProductFiltersProps {
  filters: FilterState;
  onCategoryToggle: (category: string) => void;
  onPriceRangeChange: (priceRange: { min: number; max: number } | null) => void;
  onClearFilters: () => void;
  activeFiltersCount: number;
  isMobile?: boolean;
  onClose?: () => void;
}

const ProductFilters = ({
  filters,
  onCategoryToggle,
  onPriceRangeChange,
  onClearFilters,
  activeFiltersCount,
  isMobile = false,
  onClose,
}: ProductFiltersProps) => {
  return (
    <div className="space-y-6">
      {/* Category Filter */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="font-poppins font-semibold mb-4">Categories</h3>
        <div className="space-y-2">
          {categories.map(category => (
            <label key={category} className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.categories.includes(category)}
                onChange={() => onCategoryToggle(category)}
                className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
              />
              <span className="text-gray-700">{category}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Price Range Filter */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="font-poppins font-semibold mb-4">Price Range</h3>
        <div className="space-y-3">
          {priceRanges.map(range => (
            <label key={range.label} className="flex items-center space-x-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="radio"
                  name="priceRange"
                  checked={
                    filters.priceRange?.min === range.min && filters.priceRange?.max === range.max
                  }
                  onChange={() => onPriceRangeChange({ min: range.min, max: range.max })}
                  className="sr-only"
                />
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                    filters.priceRange?.min === range.min && filters.priceRange?.max === range.max
                      ? 'border-blue-600 bg-blue-600'
                      : 'border-gray-300 group-hover:border-blue-400'
                  }`}
                >
                  {filters.priceRange?.min === range.min &&
                    filters.priceRange?.max === range.max && (
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    )}
                </div>
              </div>
              <span
                className={`text-sm transition-colors duration-200 ${
                  filters.priceRange?.min === range.min && filters.priceRange?.max === range.max
                    ? 'text-blue-600 font-medium'
                    : 'text-gray-700 group-hover:text-blue-600'
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
                name="priceRange"
                checked={filters.priceRange === null}
                onChange={() => onPriceRangeChange(null)}
                className="sr-only"
              />
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                  filters.priceRange === null
                    ? 'border-blue-600 bg-blue-600'
                    : 'border-gray-300 group-hover:border-blue-400'
                }`}
              >
                {filters.priceRange === null && (
                  <div className="w-2 h-2 rounded-full bg-white"></div>
                )}
              </div>
            </div>
            <span
              className={`text-sm transition-colors duration-200 ${
                filters.priceRange === null
                  ? 'text-blue-600 font-medium'
                  : 'text-gray-700 group-hover:text-blue-600'
              }`}
            >
              All Prices
            </span>
          </label>
        </div>
      </div>

      {/* Clear Filters */}
      {activeFiltersCount > 0 && (
        <div className="bg-white p-6 rounded-lg border">
          <button
            onClick={onClearFilters}
            className="w-full px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Clear all filters ({activeFiltersCount})
          </button>
        </div>
      )}

      {isMobile && (
        <div className="bg-white p-6 rounded-lg border">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Apply Filters
          </button>
        </div>
      )}
    </div>
  );
};

// Wrapper component with Suspense boundary
export default function ProductsPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-6 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
            <p className="text-gray-600">Loading products...</p>
          </div>
        </div>
      }
    >
      <ProductsPage />
    </Suspense>
  );
}
