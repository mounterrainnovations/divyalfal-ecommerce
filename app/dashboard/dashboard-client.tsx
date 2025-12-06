'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Lock,
  Mail,
  LogOut,
  Shield,
  Plus,
  Search,
  Edit,
  Trash2,
  Package,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Prisma } from '@prisma/client';
import type { Product, ProductCategory, ProductType } from '@/types';
import { getDbCategory } from '@/lib/utils/product-utils';

export default function DashboardClient() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
  });
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Product management state
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    specifications: '',
    category: 'OTHER' as ProductType,
    photos: [''],
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  // Check if user is already authenticated on page load
  useEffect(() => {
    const checkAuthStatus = () => {
      // Check if auth token cookie exists
      const cookies = document.cookie.split(';');
      const authCookie = cookies.find(cookie => cookie.trim().startsWith('auth-token='));

      if (authCookie) {
        // Token exists, assume user is logged in
        setIsLoggedIn(true);
      }

      setIsCheckingAuth(false);
    };

    checkAuthStatus();
  }, []);

  const handleLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      setLoginError('');

      try {
        const response = await fetch('/api/admin/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(credentials),
        });

        if (response.ok) {
          setIsLoggedIn(true);
        } else {
          const data = await response.json();
          setLoginError(data.error || 'Login failed');
        }
      } catch {
        setLoginError('Network error occurred');
      } finally {
        setIsLoading(false);
      }
    },
    [credentials]
  );

  const handleLogout = useCallback(async () => {
    try {
      // Call logout API if needed (optional, since we're just clearing the cookie)
      await fetch('/api/admin/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch {
      // Ignore logout API errors, just clear the cookie
      console.log('Logout API call failed, clearing cookie anyway');
    } finally {
      // Clear the auth token cookie
      document.cookie = 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      setIsLoggedIn(false);
      setCredentials({ email: '', password: '' });
    }
  }, []);

  // Product management functions
  const fetchProducts = useCallback(async (page = 1, search = '') => {
    setLoadingProducts(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search && { search }),
      });
      const response = await fetch(`/api/products?${params}`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products);
        setTotalPages(data.totalPages);
        setTotalProducts(data.total);
        setCurrentPage(data.page);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const handleAddProduct = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFormErrors({});
      setSubmitting(true);

      // Validation
      const errors: Record<string, string> = {};
      if (!formData.name.trim()) errors.name = 'Name is required';
      if (!formData.price || isNaN(Number(formData.price)))
        errors.price = 'Valid price is required';
      if (!formData.photos[0].trim()) errors.photos = 'At least one photo URL is required';

      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        setSubmitting(false);
        return;
      }

      try {
        const response = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            price: Number(formData.price),
            photos: formData.photos.filter(url => url.trim()),
          }),
        });

        if (response.ok) {
          setShowAddModal(false);
          resetForm();
          fetchProducts(currentPage, searchTerm);
        } else {
          const data = await response.json();
          setFormErrors({ general: data.error || 'Failed to add product' });
        }
      } catch {
        setFormErrors({ general: 'Network error occurred' });
      } finally {
        setSubmitting(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentPage, formData, searchTerm]
  );

  const handleEditProduct = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingProduct) return;

      setFormErrors({});
      setSubmitting(true);

      // Validation
      const errors: Record<string, string> = {};
      if (!formData.name.trim()) errors.name = 'Name is required';
      if (!formData.price || isNaN(Number(formData.price)))
        errors.price = 'Valid price is required';
      if (!formData.photos[0].trim()) errors.photos = 'At least one photo URL is required';

      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        setSubmitting(false);
        return;
      }

      try {
        const response = await fetch(`/api/products/${editingProduct.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            price: new Prisma.Decimal(formData.price),
            photos: formData.photos.filter(url => url.trim()),
          }),
        });

        if (response.ok) {
          setShowEditModal(false);
          setEditingProduct(null);
          resetForm();
          fetchProducts(currentPage, searchTerm);
        } else {
          const data = await response.json();
          setFormErrors({ general: data.error || 'Failed to update product' });
        }
      } catch {
        setFormErrors({ general: 'Network error occurred' });
      } finally {
        setSubmitting(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentPage, editingProduct, formData, searchTerm]
  );

  const handleDeleteProduct = useCallback(
    async (productId: string) => {
      if (!confirm('Are you sure you want to delete this product?')) return;

      try {
        const response = await fetch(`/api/products/${productId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          fetchProducts(currentPage, searchTerm);
        } else {
          alert('Failed to delete product');
        }
      } catch {
        alert('Network error occurred');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentPage, searchTerm]
  );

  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      price: '',
      specifications: '',
      category: 'OTHER',
      photos: [''],
    });
    setFormErrors({});
  }, []);

  const openEditModal = useCallback((product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price.toString(),
      specifications: product.specifications || '',
      category: getDbCategory(product.category as ProductCategory),
      photos: product.photos && product.photos.length > 0 ? product.photos : [''],
    });
    setShowEditModal(true);
  }, []);

  const addPhotoField = useCallback(() => {
    setFormData(prev => ({ ...prev, photos: [...prev.photos, ''] }));
  }, []);

  const removePhotoField = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  }, []);

  const updatePhotoField = useCallback((index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.map((photo, i) => (i === index ? value : photo)),
    }));
  }, []);

  const handleFileUpload = useCallback(
    async (file: File, index: number) => {
      setUploadingIndex(index);
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const { url } = await response.json();
          updatePhotoField(index, url);
        } else {
          const { error } = await response.json();
          alert(`Upload failed: ${error}`);
        }
      } catch (error) {
        console.error('Upload error:', error);
        alert('Upload failed. Please try again.');
      } finally {
        setUploadingIndex(null);
      }
    },
    [updatePhotoField]
  );

  // Fetch products on login
  useEffect(() => {
    if (isLoggedIn) {
      fetchProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  // Show loading spinner while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-poppins">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Login Page
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-linear-to-br from-amber-50 to-orange-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Logo and Brand */}
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-600 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
                <Shield className="w-10 h-10 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-serif font-bold text-gray-900 mb-2">Admin Access</h2>
            <p className="text-gray-600 font-poppins">Divyafal Dashboard Portal</p>
          </div>

          {/* Login Form */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-amber-100">
            <form className="space-y-6" onSubmit={handleLogin}>
              {/* Email Field */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-2 font-poppins"
                >
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all font-poppins"
                    placeholder="Enter your email"
                    value={credentials.email}
                    onChange={e => setCredentials({ ...credentials, email: e.target.value })}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-2 font-poppins"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all font-poppins"
                    placeholder="Enter your password"
                    value={credentials.password}
                    onChange={e => setCredentials({ ...credentials, password: e.target.value })}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      {showPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {loginError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm text-center font-poppins">{loginError}</p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed font-poppins"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Signing in...
                  </div>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </div>

          {/* Security Note */}
          <div className="text-center">
            <p className="text-xs text-gray-500 font-poppins">
              🔒 Secure admin access • Protected by JWT authentication
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard Page (when logged in)
  return (
    <div className="min-h-screen bg-linear-to-br from-amber-50 to-orange-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-amber-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-linear-to-br from-amber-600 to-orange-600 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-serif font-bold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-600 font-poppins">Welcome back, Administrator</p>
              </div>
            </div>

            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-poppins"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Product Management */}
        <div className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-4 flex justify-between items-center">
            <h2 className="text-xl font-serif font-bold text-white flex items-center gap-2">
              <Package className="w-5 h-5" />
              Product Management
            </h2>
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-white text-amber-600 hover:bg-amber-50 font-poppins"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </div>

          <div className="p-6">
            {/* Search and Filters */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && fetchProducts(1, searchTerm)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent font-poppins"
                />
              </div>
              <Button
                onClick={() => fetchProducts(1, searchTerm)}
                variant="outline"
                className="border-amber-200 text-amber-600 hover:bg-amber-50 font-poppins"
              >
                Search
              </Button>
            </div>

            {/* Products Table/List */}
            {loadingProducts ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600 font-poppins">Loading products...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2 font-poppins">
                  No products found
                </h3>
                <p className="text-gray-600 font-poppins">
                  Get started by adding your first product.
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-poppins">
                          Image
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-poppins">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-poppins">
                          Category
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-poppins">
                          Price
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider font-poppins">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {products.map(product => (
                        <tr key={product.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <Image
                              src={product.image}
                              alt={product.name}
                              width={48}
                              height={48}
                              className="w-12 h-12 object-cover rounded-lg"
                            />
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 font-poppins">
                              {product.name}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 font-poppins">
                              {product.category}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-poppins">
                            ₹{product.price.toLocaleString()}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex gap-2">
                              <Button
                                onClick={() => openEditModal(product)}
                                variant="outline"
                                size="sm"
                                className="border-blue-200 text-blue-600 hover:bg-blue-50"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                onClick={() => handleDeleteProduct(product.id)}
                                variant="outline"
                                size="sm"
                                className="border-red-200 text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-4">
                  {products.map(product => (
                    <div key={product.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex gap-4">
                        <Image
                          src={product.image}
                          alt={product.name}
                          width={64}
                          height={64}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 font-poppins">
                            {product.name}
                          </h3>
                          <p className="text-sm text-gray-600 font-poppins">{product.category}</p>
                          <p className="text-lg font-bold text-amber-600 font-poppins">
                            ₹{product.price.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            onClick={() => openEditModal(product)}
                            variant="outline"
                            size="sm"
                            className="border-blue-200 text-blue-600 hover:bg-blue-50"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => handleDeleteProduct(product.id)}
                            variant="outline"
                            size="sm"
                            className="border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-between items-center mt-6">
                    <p className="text-sm text-gray-700 font-poppins">
                      Showing {(currentPage - 1) * 10 + 1} to{' '}
                      {Math.min(currentPage * 10, totalProducts)} of {totalProducts} products
                    </p>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => fetchProducts(currentPage - 1, searchTerm)}
                        disabled={currentPage === 1}
                        variant="outline"
                        size="sm"
                        className="border-amber-200 text-amber-600 hover:bg-amber-50 disabled:opacity-50"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </Button>
                      <Button
                        onClick={() => fetchProducts(currentPage + 1, searchTerm)}
                        disabled={currentPage === totalPages}
                        variant="outline"
                        size="sm"
                        className="border-amber-200 text-amber-600 hover:bg-amber-50 disabled:opacity-50"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-4">
              <h2 className="text-xl font-serif font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Add New Product
              </h2>
            </div>

            <form onSubmit={handleAddProduct} className="p-6 space-y-6">
              {formErrors.general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm font-poppins">{formErrors.general}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-poppins">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent font-poppins"
                    placeholder="Enter product name"
                  />
                  {formErrors.name && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-poppins">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={e => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent font-poppins"
                    placeholder="0.00"
                  />
                  {formErrors.price && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.price}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-poppins">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, category: e.target.value as ProductType }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent font-poppins"
                >
                  <option value="SAREE">Sarees</option>
                  <option value="INDO_WESTERN">Indo-Western</option>
                  <option value="LEHENGA">Lehengas</option>
                  <option value="SUIT">Suits</option>
                  <option value="KURTA_PANT">Kurta Pant</option>
                  <option value="WESTERN">Western</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-poppins">
                  Specifications
                </label>
                <textarea
                  value={formData.specifications}
                  onChange={e => setFormData(prev => ({ ...prev, specifications: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent font-poppins"
                  placeholder="Product specifications..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-poppins">
                  Photos *
                </label>
                {formData.photos.map((photo, index) => (
                  <div key={index} className="mb-4">
                    {photo && (
                      <div className="mb-2">
                        <Image
                          src={photo}
                          alt={`Photo ${index + 1}`}
                          width={120}
                          height={120}
                          className="w-30 h-30 object-cover rounded-lg border-2 border-gray-200"
                          onError={e => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <div className="flex gap-2 mb-2">
                      <label className="flex-1 cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, index);
                          }}
                          disabled={uploadingIndex === index}
                        />
                        <div className="px-4 py-3 border-2 border-dashed border-amber-300 rounded-lg text-center hover:bg-amber-50 transition-colors">
                          {uploadingIndex === index ? (
                            <span className="text-sm text-gray-600">⏳ Uploading...</span>
                          ) : (
                            <span className="text-sm text-amber-600 font-medium">
                              📤 Upload Image
                            </span>
                          )}
                        </div>
                      </label>
                      {formData.photos.length > 1 && (
                        <Button
                          type="button"
                          onClick={() => removePhotoField(index)}
                          variant="outline"
                          size="sm"
                          className="border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 text-center mb-2">or paste URL</div>
                    <input
                      type="url"
                      value={photo}
                      onChange={e => updatePhotoField(index, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent font-poppins text-sm"
                      placeholder="https://example.com/image.jpg"
                      disabled={uploadingIndex === index}
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  onClick={addPhotoField}
                  variant="outline"
                  size="sm"
                  className="border-amber-200 text-amber-600 hover:bg-amber-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Photo
                </Button>
                {formErrors.photos && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.photos}</p>
                )}
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  variant="outline"
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
                >
                  {submitting ? 'Adding...' : 'Add Product'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditModal && editingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-4">
              <h2 className="text-xl font-serif font-bold text-white flex items-center gap-2">
                <Edit className="w-5 h-5" />
                Edit Product
              </h2>
            </div>

            <form onSubmit={handleEditProduct} className="p-6 space-y-6">
              {formErrors.general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm font-poppins">{formErrors.general}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-poppins">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent font-poppins"
                    placeholder="Enter product name"
                  />
                  {formErrors.name && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-poppins">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={e => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent font-poppins"
                    placeholder="0.00"
                  />
                  {formErrors.price && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.price}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-poppins">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, category: e.target.value as ProductType }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent font-poppins"
                >
                  <option value="SAREE">Sarees</option>
                  <option value="INDO_WESTERN">Indo-Western</option>
                  <option value="LEHENGA">Lehengas</option>
                  <option value="SUIT">Suits</option>
                  <option value="KURTA_PANT">Kurta Pant</option>
                  <option value="WESTERN">Western</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-poppins">
                  Specifications
                </label>
                <textarea
                  value={formData.specifications}
                  onChange={e => setFormData(prev => ({ ...prev, specifications: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent font-poppins"
                  placeholder="Product specifications..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-poppins">
                  Photos *
                </label>
                {formData.photos.map((photo, index) => (
                  <div key={index} className="mb-4">
                    {photo && (
                      <div className="mb-2">
                        <Image
                          src={photo}
                          alt={`Photo ${index + 1}`}
                          width={120}
                          height={120}
                          className="w-30 h-30 object-cover rounded-lg border-2 border-gray-200"
                          onError={e => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <div className="flex gap-2 mb-2">
                      <label className="flex-1 cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, index);
                          }}
                          disabled={uploadingIndex === index}
                        />
                        <div className="px-4 py-3 border-2 border-dashed border-amber-300 rounded-lg text-center hover:bg-amber-50 transition-colors">
                          {uploadingIndex === index ? (
                            <span className="text-sm text-gray-600">⏳ Uploading...</span>
                          ) : (
                            <span className="text-sm text-amber-600 font-medium">
                              📤 Upload Image
                            </span>
                          )}
                        </div>
                      </label>
                      {formData.photos.length > 1 && (
                        <Button
                          type="button"
                          onClick={() => removePhotoField(index)}
                          variant="outline"
                          size="sm"
                          className="border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 text-center mb-2">or paste URL</div>
                    <input
                      type="url"
                      value={photo}
                      onChange={e => updatePhotoField(index, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent font-poppins text-sm"
                      placeholder="https://example.com/image.jpg"
                      disabled={uploadingIndex === index}
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  onClick={addPhotoField}
                  variant="outline"
                  size="sm"
                  className="border-amber-200 text-amber-600 hover:bg-amber-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Photo
                </Button>
                {formErrors.photos && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.photos}</p>
                )}
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingProduct(null);
                    resetForm();
                  }}
                  variant="outline"
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
                >
                  {submitting ? 'Updating...' : 'Update Product'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
