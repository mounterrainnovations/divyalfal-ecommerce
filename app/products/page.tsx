'use client';

import { useState, useMemo, useCallback } from 'react';
import { Search, Filter, X, SlidersHorizontal } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import { mockProducts, categories, priceRanges, sortOptions } from '@/lib/data/mockProducts';

interface FilterState {
  search: string;
  categories: string[];
  priceRange: { min: number; max: number } | null;
  sortBy: string;
}

const ProductsPage = () => {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    categories: [],
    priceRange: null,
    sortBy: 'default',
  });

  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = [...mockProducts];

    // Apply search filter
    if (filters.search) {
      result = result.filter(product =>
        product.name.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // Apply category filter (AND logic - must match all selected categories)
    if (filters.categories.length > 0) {
      result = result.filter(product => filters.categories.includes(product.category));
    }

    // Apply price range filter
    if (filters.priceRange) {
      result = result.filter(
        product =>
          product.price >= filters.priceRange!.min && product.price <= filters.priceRange!.max
      );
    }

    // Apply sorting
    switch (filters.sortBy) {
      case 'price-low':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        result.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
        break;
      default:
        // Default order
        break;
    }

    return result;
  }, [filters]);

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
    <div className="min-h-screen bg-gray-50 pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-poppins font-bold text-gray-900 mb-4">
            All Products
          </h1>
          <p className="text-gray-600">
            Discover our complete collection of traditional and contemporary fashion
          </p>
        </div>

        {/* Search and Mobile Filter Button */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
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
            onClick={() => setShowMobileFilters(!showMobileFilters)}
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

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Desktop Sidebar Filters */}
          <div className="hidden lg:block w-80 flex-shrink-0">
            <ProductFilters
              filters={filters}
              onCategoryToggle={handleCategoryToggle}
              onPriceRangeChange={handlePriceRangeChange}
              onSortChange={handleSortChange}
              onClearFilters={clearAllFilters}
              activeFiltersCount={activeFiltersCount}
            />
          </div>

          {/* Mobile Filters Overlay */}
          {showMobileFilters && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div
                className="fixed inset-0 bg-black bg-opacity-50"
                onClick={() => setShowMobileFilters(false)}
              />
              <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl overflow-y-auto">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-poppins font-bold">Filters</h2>
                    <button
                      onClick={() => setShowMobileFilters(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <ProductFilters
                    filters={filters}
                    onCategoryToggle={handleCategoryToggle}
                    onPriceRangeChange={handlePriceRangeChange}
                    onSortChange={handleSortChange}
                    onClearFilters={clearAllFilters}
                    activeFiltersCount={activeFiltersCount}
                    isMobile={true}
                    onClose={() => setShowMobileFilters(false)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Products Grid */}
          <div className="flex-1">
            {/* Sort and Results Count */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-gray-600">
                {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}{' '}
                found
              </p>
              <select
                value={filters.sortBy}
                onChange={e => handleSortChange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Active Filters */}
            {activeFiltersCount > 0 && (
              <div className="mb-6 p-4 bg-white rounded-lg border">
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

            {/* Products Grid */}
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
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
  onSortChange: (sortBy: string) => void;
  onClearFilters: () => void;
  activeFiltersCount: number;
  isMobile?: boolean;
  onClose?: () => void;
}

const ProductFilters = ({
  filters,
  onCategoryToggle,
  onPriceRangeChange,
  onSortChange,
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
        <div className="space-y-2">
          {priceRanges.map(range => (
            <label key={range.label} className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="priceRange"
                checked={
                  filters.priceRange?.min === range.min && filters.priceRange?.max === range.max
                }
                onChange={() => onPriceRangeChange({ min: range.min, max: range.max })}
                className="w-4 h-4 text-gray-900 border-gray-300 focus:ring-gray-900"
              />
              <span className="text-gray-700">{range.label}</span>
            </label>
          ))}
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="radio"
              name="priceRange"
              checked={filters.priceRange === null}
              onChange={() => onPriceRangeChange(null)}
              className="w-4 h-4 text-gray-900 border-gray-300 focus:ring-gray-900"
            />
            <span className="text-gray-700">All Prices</span>
          </label>
        </div>
      </div>

      {/* Custom Price Range Input */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="font-poppins font-semibold mb-4">Custom Price Range</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Min Price</label>
            <input
              type="number"
              placeholder="0"
              min="0"
              max="100000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Max Price</label>
            <input
              type="number"
              placeholder="100000"
              min="0"
              max="100000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
          <button className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">
            Apply Range
          </button>
        </div>
      </div>

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

export default ProductsPage;
