'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Download,
  ExternalLink,
  Loader2,
  Image as ImageIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { Product, ProductType } from '@/types'

const CATEGORIES: ProductType[] = ['SAREE', 'LEHENGA', 'SUIT', 'OTHER']

const StatusBadge = ({ type }: { type: ProductType }) => {
  const colors: Record<string, string> = {
    SAREE: 'bg-amber-100 text-amber-700 border-amber-200',
    LEHENGA: 'bg-rose-100 text-rose-700 border-rose-200',
    SUIT: 'bg-blue-100 text-blue-700 border-blue-200',
    OTHER: 'bg-gray-100 text-gray-700 border-gray-200',
  }
  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border font-poppins", colors[type] || colors.OTHER)}>
      {type}
    </span>
  )
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'SAREE' as ProductType,
    image: '',
    sale: false,
    mostRecommended: false
  })

  const fetchProducts = useCallback(async (page = 1, search = '') => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        includeArchived: 'true',
        ...(search && { search }),
      })
      const response = await fetch(`/api/products?${params}`)
      if (response.ok) {
        const data = await response.json()
        setProducts(data.products)
        setTotalPages(data.totalPages)
        setTotalProducts(data.total)
        setCurrentPage(data.page)
      }
    } catch (err) {
      console.error('Error fetching products:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      category: product.category as ProductType,
      image: product.image || '',
      sale: product.sale || false,
      mostRecommended: product.mostRecommended || false
    })
    setIsModalOpen(true)
  }

  const handleAddNew = () => {
    setEditingProduct(null)
    setFormData({
      name: '',
      description: '',
      price: '',
      category: 'SAREE',
      image: '',
      sale: false,
      mostRecommended: false
    })
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    
    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products'
      const method = editingProduct ? 'PUT' : 'POST'
      
      const payload = {
        ...formData,
        price: parseFloat(formData.price)
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        setIsModalOpen(false)
        fetchProducts(currentPage, searchTerm)
      }
    } catch (err) {
      console.error('Error saving product:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return
    try {
      const response = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      if (response.ok) {
        fetchProducts(currentPage, searchTerm)
      }
    } catch (err) {
      console.error('Error deleting product:', err)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-500 font-poppins mt-1">Manage and update your boutique collection.</p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-amber-100 bg-white font-poppins font-bold text-amber-600 hover:bg-amber-50 rounded-xl">
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
          <Button 
            onClick={handleAddNew}
            className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold font-poppins rounded-xl shadow-lg shadow-amber-200 transition-all transform hover:-translate-y-0.5 active:scale-95"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Product
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-amber-50 shadow-sm overflow-hidden flex flex-col">
        {/* Table Header / Toolbar */}
        <div className="p-6 border-b border-amber-50 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/30">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="Search by name or ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchProducts(1, searchTerm)}
              className="pl-10 h-10 bg-white border-amber-100 focus:ring-amber-500 rounded-xl font-poppins shadow-sm"
            />
          </div>
          
          <div className="flex items-center gap-2 text-xs font-poppins font-bold text-gray-400 uppercase tracking-widest">
            Total {totalProducts} Products
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#fcf9f6] border-b border-amber-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-poppins font-bold text-gray-500 uppercase tracking-widest">Product</th>
                <th className="px-6 py-4 text-left text-xs font-poppins font-bold text-gray-500 uppercase tracking-widest">Category</th>
                <th className="px-6 py-4 text-left text-xs font-poppins font-bold text-gray-500 uppercase tracking-widest">Price</th>
                <th className="px-6 py-4 text-left text-xs font-poppins font-bold text-gray-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-right text-xs font-poppins font-bold text-gray-500 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-50 font-poppins">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-8">
                      <div className="h-8 bg-gray-100 rounded-lg w-full" />
                    </td>
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-gray-400">
                    No products found matching your criteria.
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="group hover:bg-amber-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl border border-amber-100 overflow-hidden bg-amber-50 shrink-0 shadow-sm">
                          <Image 
                            src={product.image || '/mocks/mock_mostRecommended_common.jpg'} 
                            alt={product.name} 
                            width={48} 
                            height={48} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 shadow-sm"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-gray-900 truncate">{product.name}</p>
                            {product.isArchived && (
                              <Badge key="archived-badge" variant="outline" className="text-[10px] bg-gray-100 text-gray-500 border-gray-200">
                                ARCHIVED
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-400 truncate tracking-wide">#{product.id.split('-')[0].toUpperCase()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge type={product.category as ProductType} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900">₹{product.price.toLocaleString()}</span>
                        {product.sale && <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider animate-pulse">On Sale</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const totalStock = product.variants ? product.variants.reduce((acc, v) => acc + v.stock, 0) : 0;
                        return totalStock > 0 ? (
                          <Badge variant="success" className="gap-1 bg-emerald-50 text-emerald-700 border-emerald-100 uppercase tracking-tighter shadow-sm">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> In Stock ({totalStock})
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1 bg-red-50 text-red-700 border-red-100 uppercase tracking-tighter shadow-sm">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full" /> Out of Stock
                          </Badge>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 px-1">
                        <Button 
                          onClick={() => handleEdit(product)}
                          variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-amber-100 hover:text-amber-600 text-gray-400"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          onClick={() => handleDelete(product.id)}
                          variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-600 text-gray-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Link href={`/product/${product.id}`} target="_blank" className="p-2 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-blue-600 transition-colors">
                           <ExternalLink className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-6 border-t border-amber-50 flex items-center justify-between bg-gray-50/10 font-poppins">
            <p className="text-xs font-medium text-gray-500">
              Showing <span className="text-gray-900 font-bold">{(currentPage - 1) * 10 + 1}-{Math.min(currentPage * 10, totalProducts)}</span> of <span className="text-gray-900 font-bold">{totalProducts}</span>
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage === 1}
                onClick={() => fetchProducts(currentPage - 1, searchTerm)}
                className="border-amber-100 h-8 rounded-lg text-xs font-bold hover:bg-amber-50"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Prev
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => fetchProducts(currentPage + 1, searchTerm)}
                className="border-amber-100 h-8 rounded-lg text-xs font-bold hover:bg-amber-50"
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Edit/Add Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-xl border-amber-100 rounded-3xl p-0 overflow-hidden shadow-2xl">
          <form onSubmit={handleSave}>
            <DialogHeader className="p-8 pb-4 bg-amber-50/50 border-b border-amber-50">
              <DialogTitle className="text-2xl font-serif font-bold text-gray-900">
                {editingProduct ? 'Edit Boutique Item' : 'Add New Collection Item'}
              </DialogTitle>
              <p className="text-sm text-gray-500 font-poppins">Fill in the details for your premium garment.</p>
            </DialogHeader>

            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[70vh] overflow-y-auto font-poppins">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-bold text-amber-900 uppercase tracking-widest">Garment Name</Label>
                  <Input 
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Hand-embroidered Silk Saree"
                    required
                    className="border-amber-100 focus:ring-amber-500 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price" className="text-xs font-bold text-amber-900 uppercase tracking-widest">Price (INR)</Label>
                  <Input 
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    placeholder="4999.00"
                    required
                    className="border-amber-100 focus:ring-amber-500 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category" className="text-xs font-bold text-amber-900 uppercase tracking-widest">Category</Label>
                  <select 
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value as ProductType})}
                    className="w-full flex h-10 rounded-xl border border-amber-100 bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all cursor-pointer"
                  >
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>

                <div className="flex gap-6 pt-4">
                   <label className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded-md border-amber-200 text-amber-600 focus:ring-amber-500 transition-all cursor-pointer"
                      checked={formData.sale}
                      onChange={(e) => setFormData({...formData, sale: e.target.checked})}
                    />
                    <span className="text-sm font-medium text-gray-700 group-hover:text-amber-600 transition-colors">On Sale</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="checkbox"
                      className="w-5 h-5 rounded-md border-amber-200 text-amber-600 focus:ring-amber-500 transition-all cursor-pointer"
                      checked={formData.mostRecommended}
                      onChange={(e) => setFormData({...formData, mostRecommended: e.target.checked})}
                    />
                    <span className="text-sm font-medium text-gray-700 group-hover:text-amber-600 transition-colors">Featured</span>
                  </label>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-amber-900 uppercase tracking-widest">Garment Image URL</Label>
                  <div className="relative group overflow-hidden rounded-2xl border-2 border-dashed border-amber-100 bg-amber-50/30 aspect-square flex flex-col items-center justify-center gap-4 transition-all hover:border-amber-300 hover:bg-amber-50 cursor-pointer">
                    {formData.image ? (
                      <>
                        <Image src={formData.image} alt="Preview" fill className="object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            className="bg-white border-none text-red-600 font-bold hover:bg-red-50"
                            onClick={(e) => { e.stopPropagation(); setFormData({...formData, image: ''}) }}
                          >
                            Remove
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-md text-amber-500">
                          <ImageIcon className="w-6 h-6" />
                        </div>
                        <div className="text-center px-4">
                          <p className="text-xs font-bold text-gray-600">Enter Image URL Below</p>
                          <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest font-bold">Square aspect ratio recommended</p>
                        </div>
                      </>
                    )}
                  </div>
                  <Input 
                    value={formData.image}
                    onChange={(e) => setFormData({...formData, image: e.target.value})}
                    placeholder="https://example.com/item.jpg"
                    className="mt-2 border-amber-100 focus:ring-amber-500 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-xs font-bold text-amber-900 uppercase tracking-widest">Garment Description</Label>
                  <textarea 
                    id="description"
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Detailed craftsmanship information..."
                    className="w-full flex rounded-xl border border-amber-100 bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all font-poppins"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="p-8 pt-4 bg-gray-50/50 border-t border-amber-50 mt-4">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setIsModalOpen(false)}
                className="font-poppins font-bold text-gray-500 hover:bg-white hover:text-gray-900 rounded-xl"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSaving}
                className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold font-poppins rounded-xl shadow-lg shadow-amber-200 px-8"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingProduct ? 'Update Garment' : 'Create Garment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
