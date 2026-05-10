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
    SAREE: 'bg-rose-50 text-rose-800 border-rose-200/50',
    LEHENGA: 'bg-emerald-50 text-emerald-800 border-emerald-200/50',
    SUIT: 'bg-stone-100 text-stone-800 border-stone-200',
    OTHER: 'bg-gray-50 text-gray-700 border-gray-200',
  }
  return (
    <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.15em] border font-poppins shadow-sm", colors[type] || colors.OTHER)}>
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-serif font-bold text-stone-900 tracking-tight">Inventory</h1>
          <p className="text-stone-500 font-poppins mt-2 text-[15px]">Manage and update your boutique collection.</p>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="outline" className="border-stone-200 bg-white font-poppins font-semibold text-stone-700 hover:bg-stone-50 rounded-xl shadow-sm h-11 px-5">
            <Download className="w-4 h-4 mr-2 text-stone-500" /> Export
          </Button>
          <Button 
            onClick={handleAddNew}
            className="bg-rose-950 hover:bg-rose-900 text-amber-50 font-bold font-poppins rounded-xl shadow-lg shadow-rose-900/20 transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95 h-11 px-6"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Product
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-stone-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col relative">
        {/* Table Header / Toolbar */}
        <div className="p-6 md:px-8 border-b border-stone-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-stone-50/50">
          <div className="relative w-full sm:w-[400px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <Input 
              placeholder="Search by name or ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchProducts(1, searchTerm)}
              className="pl-11 h-12 bg-white border-stone-200 focus:ring-rose-950/20 focus:border-rose-900 rounded-xl font-poppins shadow-sm transition-all text-[15px]"
            />
          </div>
          
          <div className="flex items-center gap-2 text-[11px] font-poppins font-bold text-stone-500 uppercase tracking-[0.2em] bg-white px-4 py-2.5 rounded-full border border-stone-200/60 shadow-sm">
            Total {totalProducts} Products
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#FDFBF7] border-b border-stone-100">
              <tr>
                <th className="px-8 py-5 text-[11px] font-poppins font-bold text-stone-500 uppercase tracking-[0.2em]">Product</th>
                <th className="px-8 py-5 text-[11px] font-poppins font-bold text-stone-500 uppercase tracking-[0.2em]">Category</th>
                <th className="px-8 py-5 text-[11px] font-poppins font-bold text-stone-500 uppercase tracking-[0.2em]">Price</th>
                <th className="px-8 py-5 text-[11px] font-poppins font-bold text-stone-500 uppercase tracking-[0.2em]">Status</th>
                <th className="px-8 py-5 text-right text-[11px] font-poppins font-bold text-stone-500 uppercase tracking-[0.2em]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100/60 font-poppins">
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
                  <tr key={product.id} className="group hover:bg-stone-50/50 transition-colors duration-300">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl border border-stone-200 overflow-hidden bg-stone-50 shrink-0 shadow-sm relative">
                          <Image 
                            src={product.image || '/mocks/mock_mostRecommended_common.jpg'} 
                            alt={product.name} 
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-3">
                            <p className="font-bold text-stone-900 text-[15px] truncate">{product.name}</p>
                            {product.isArchived && (
                              <Badge key="archived-badge" variant="outline" className="text-[9px] bg-stone-100 text-stone-500 border-stone-200 uppercase tracking-widest">
                                ARCHIVED
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-stone-400 truncate tracking-[0.1em] mt-1 font-mono">#{product.id.split('-')[0].toUpperCase()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <StatusBadge type={product.category as ProductType} />
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-stone-900 text-[15px]">₹{product.price.toLocaleString('en-IN')}</span>
                        {product.sale && <span className="text-[10px] text-rose-700 font-bold uppercase tracking-[0.15em] bg-rose-50 px-2 py-0.5 rounded-full inline-block w-fit">On Sale</span>}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      {(() => {
                        const totalStock = product.variants ? product.variants.reduce((acc, v) => acc + v.stock, 0) : 0;
                        return totalStock > 0 ? (
                          <Badge variant="success" className="gap-2 bg-emerald-50 text-emerald-800 border-emerald-200/50 uppercase tracking-[0.1em] text-[10px] shadow-sm py-1">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> In Stock ({totalStock})
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-2 bg-rose-50 text-rose-800 border-rose-200/50 uppercase tracking-[0.1em] text-[10px] shadow-sm py-1">
                            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" /> Out of Stock
                          </Badge>
                        );
                      })()}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          onClick={() => handleEdit(product)}
                          variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-stone-100 hover:text-stone-900 text-stone-400 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          onClick={() => handleDelete(product.id)}
                          variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-rose-50 hover:text-rose-700 text-stone-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Link href={`/product/${product.id}`} target="_blank" className="p-2 hover:bg-stone-100 rounded-xl text-stone-400 hover:text-stone-900 transition-colors">
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
          <div className="p-6 md:px-8 border-t border-stone-100 flex flex-col sm:flex-row gap-4 items-center justify-between bg-stone-50/30 font-poppins">
            <p className="text-[13px] font-medium text-stone-500">
              Showing <span className="text-stone-900 font-bold">{(currentPage - 1) * 10 + 1}-{Math.min(currentPage * 10, totalProducts)}</span> of <span className="text-stone-900 font-bold">{totalProducts}</span>
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage === 1}
                onClick={() => fetchProducts(currentPage - 1, searchTerm)}
                className="border-stone-200 h-9 px-4 rounded-xl text-[13px] font-bold text-stone-700 hover:bg-stone-100 transition-all shadow-sm"
              >
                <ChevronLeft className="w-4 h-4 mr-1.5" /> Prev
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => fetchProducts(currentPage + 1, searchTerm)}
                className="border-stone-200 h-9 px-4 rounded-xl text-[13px] font-bold text-stone-700 hover:bg-stone-100 transition-all shadow-sm"
              >
                Next <ChevronRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Edit/Add Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-2xl border-stone-100 rounded-[2rem] p-0 overflow-hidden shadow-2xl">
          <form onSubmit={handleSave}>
            <DialogHeader className="p-8 pb-6 bg-stone-50/50 border-b border-stone-100">
              <DialogTitle className="text-3xl font-serif font-bold text-stone-900">
                {editingProduct ? 'Edit Garment' : 'Add New Collection Item'}
              </DialogTitle>
              <p className="text-[15px] text-stone-500 font-poppins mt-2">Provide exquisite details for this premium item.</p>
            </DialogHeader>

            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[65vh] overflow-y-auto font-poppins">
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="name" className="text-[11px] font-bold text-stone-500 uppercase tracking-[0.15em]">Garment Name</Label>
                  <Input 
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Hand-embroidered Silk Saree"
                    required
                    className="border-stone-200 focus:ring-rose-900/20 focus:border-rose-900 rounded-xl h-12 text-[15px] shadow-sm"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="price" className="text-[11px] font-bold text-stone-500 uppercase tracking-[0.15em]">Price (INR)</Label>
                  <Input 
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    placeholder="4999.00"
                    required
                    className="border-stone-200 focus:ring-rose-900/20 focus:border-rose-900 rounded-xl h-12 text-[15px] shadow-sm"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="category" className="text-[11px] font-bold text-stone-500 uppercase tracking-[0.15em]">Category</Label>
                  <select 
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value as ProductType})}
                    className="w-full flex h-12 rounded-xl border border-stone-200 bg-white px-4 text-[15px] shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-900/20 focus:border-rose-900 transition-all cursor-pointer"
                  >
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>

                <div className="flex gap-8 pt-4">
                   <label className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded border-stone-300 text-rose-900 focus:ring-rose-900 transition-all cursor-pointer"
                      checked={formData.sale}
                      onChange={(e) => setFormData({...formData, sale: e.target.checked})}
                    />
                    <span className="text-[15px] font-medium text-stone-700 group-hover:text-rose-900 transition-colors">On Sale</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="checkbox"
                      className="w-5 h-5 rounded border-stone-300 text-rose-900 focus:ring-rose-900 transition-all cursor-pointer"
                      checked={formData.mostRecommended}
                      onChange={(e) => setFormData({...formData, mostRecommended: e.target.checked})}
                    />
                    <span className="text-[15px] font-medium text-stone-700 group-hover:text-rose-900 transition-colors">Featured</span>
                  </label>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-[11px] font-bold text-stone-500 uppercase tracking-[0.15em]">Garment Image</Label>
                  <div className="relative group overflow-hidden rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50/50 aspect-square flex flex-col items-center justify-center gap-4 transition-all hover:border-stone-400 hover:bg-stone-50 cursor-pointer">
                    {formData.image ? (
                      <>
                        <Image src={formData.image} alt="Preview" fill className="object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button 
                            type="button" 
                            variant="destructive" 
                            size="sm" 
                            className="font-bold rounded-xl shadow-lg"
                            onClick={(e) => { e.stopPropagation(); setFormData({...formData, image: ''}) }}
                          >
                            Remove
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-md text-stone-400">
                          <ImageIcon className="w-6 h-6" />
                        </div>
                        <div className="text-center px-6">
                          <p className="text-[13px] font-bold text-stone-600">Enter Image URL</p>
                          <p className="text-[10px] text-stone-400 mt-1.5 uppercase tracking-[0.15em] font-medium">Square format recommended</p>
                        </div>
                      </>
                    )}
                  </div>
                  <Input 
                    value={formData.image}
                    onChange={(e) => setFormData({...formData, image: e.target.value})}
                    placeholder="https://example.com/item.jpg"
                    className="border-stone-200 focus:ring-rose-900/20 focus:border-rose-900 rounded-xl h-12 text-[15px] shadow-sm"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="description" className="text-[11px] font-bold text-stone-500 uppercase tracking-[0.15em]">Garment Description</Label>
                  <textarea 
                    id="description"
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Detailed craftsmanship information..."
                    className="w-full flex rounded-xl border border-stone-200 bg-white px-4 py-3 text-[15px] shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-900/20 focus:border-rose-900 transition-all font-poppins resize-none"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="p-8 pt-5 bg-stone-50/50 border-t border-stone-100 mt-2">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setIsModalOpen(false)}
                className="font-poppins font-bold text-stone-500 hover:bg-stone-200/50 hover:text-stone-900 rounded-xl h-12 px-6 transition-colors"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSaving}
                className="bg-rose-950 hover:bg-rose-900 text-amber-50 font-bold font-poppins rounded-xl shadow-lg shadow-rose-950/20 px-8 h-12 transition-all transform hover:-translate-y-0.5"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : editingProduct ? 'Update Garment' : 'Create Garment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
