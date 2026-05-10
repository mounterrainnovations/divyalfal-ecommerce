'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Download,
  Loader2,
  Image as ImageIcon,
  Archive,
  Eye,
  EyeOff,
  Star,
  Settings2
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
import type { Product, ProductType, ProductVariant } from '@/types'
import { toast, Toaster } from 'sonner'
import { AlertModal } from '@/components/ui/alert-modal'
import { ImageCropperModal } from '@/components/features/products/admin/image-cropper-modal'
import { VariantManager } from '@/components/features/products/admin/variant-manager'
import RichTextEditor from '@/components/ui/rich-text-editor'

const CATEGORIES: ProductType[] = ['SAREE', 'INDO_WESTERN', 'LEHENGA', 'SUIT', 'KURTA_PANT', 'WESTERN', 'OTHER']

const StatusBadge = ({ type }: { type: string }) => {
  const colors: Record<string, string> = {
    SAREE: 'bg-rose-50 text-rose-800 border-rose-200/50',
    INDO_WESTERN: 'bg-indigo-50 text-indigo-800 border-indigo-200/50',
    LEHENGA: 'bg-emerald-50 text-emerald-800 border-emerald-200/50',
    SUIT: 'bg-amber-50 text-amber-800 border-amber-200/50',
    KURTA_PANT: 'bg-blue-50 text-blue-800 border-blue-200/50',
    WESTERN: 'bg-stone-50 text-stone-800 border-stone-200',
    OTHER: 'bg-gray-50 text-gray-700 border-gray-200',
  }
  return (
    <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.15em] border font-poppins shadow-sm", colors[type] || colors.OTHER)}>
      {type.replace('_', ' ')}
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
  
  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<string | null>(null)
  
  // Image & Cropper state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [cropperOpen, setCropperOpen] = useState(false)
  const [tempImageSrc, setTempImageSrc] = useState('')
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    salePrice: '',
    category: 'SAREE' as ProductType,
    photos: [] as string[],
    sale: false,
    mostRecommended: false,
    isArchived: false,
    variants: [] as Partial<ProductVariant>[]
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
      toast.error('Failed to load products')
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
      description: product.specifications || product.description || '',
      price: product.price.toString(),
      salePrice: product.salePrice?.toString() || '',
      category: product.category as any,
      photos: product.photos || (product.image ? [product.image] : []),
      sale: product.sale || false,
      mostRecommended: product.mostRecommended || false,
      isArchived: product.isArchived || false,
      variants: product.variants || []
    })
    setIsModalOpen(true)
  }

  const handleAddNew = () => {
    setEditingProduct(null)
    setFormData({
      name: '',
      description: '',
      price: '',
      salePrice: '',
      category: 'SAREE',
      photos: [],
      sale: false,
      mostRecommended: false,
      isArchived: false,
      variants: [
        { size: 'S', stock: 10 },
        { size: 'M', stock: 10 },
        { size: 'L', stock: 10 },
        { size: 'Custom', stock: 999 }
      ]
    })
    setIsModalOpen(true)
  }
  
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.addEventListener('load', () => {
      setTempImageSrc(reader.result?.toString() || '')
      setCropperOpen(true)
    })
    reader.readAsDataURL(file)
  }

  const handleCropComplete = async (croppedBlob: Blob) => {
    setCropperOpen(false)
    setIsUploading(true)
    
    const file = new File([croppedBlob], 'cropped-image.jpg', { type: 'image/jpeg' })
    const formDataUpload = new FormData()
    formDataUpload.append('file', file)

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload,
      })

      if (response.ok) {
        const data = await response.json()
        setFormData(prev => ({ 
          ...prev, 
          photos: [...prev.photos, data.url]
        }))
        toast.success('Image uploaded successfully')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Upload failed')
      }
    } catch (err) {
      console.error('Error uploading image:', err)
      toast.error('Upload failed')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.price) {
      toast.error('Name and price are required')
      return
    }

    setIsSaving(true)
    
    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products'
      const method = editingProduct ? 'PATCH' : 'POST'
      
      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        salePrice: formData.salePrice ? parseFloat(formData.salePrice) : null,
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        setIsModalOpen(false)
        fetchProducts(currentPage, searchTerm)
        toast.success(editingProduct ? 'Product updated' : 'Product created')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to save product')
      }
    } catch (err) {
      console.error('Error saving product:', err)
      toast.error('Failed to save product')
    } finally {
      setIsSaving(false)
    }
  }

  const confirmDelete = (id: string) => {
    setProductToDelete(id)
    setIsDeleteModalOpen(true)
  }

  const handleDelete = async () => {
    if (!productToDelete) return
    
    try {
      const response = await fetch(`/api/products/${productToDelete}`, { method: 'DELETE' })
      if (response.ok) {
        fetchProducts(currentPage, searchTerm)
        toast.success('Product deleted successfully')
      } else {
        toast.error('Failed to delete product')
      }
    } catch (err) {
      console.error('Error deleting product:', err)
      toast.error('An error occurred')
    } finally {
      setIsDeleteModalOpen(false)
      setProductToDelete(null)
    }
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-10 min-h-screen bg-[#FDFCFB]">
      <Toaster position="top-center" richColors />
      
      <AlertModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Product"
        description="Are you sure you want to delete this product? This action cannot be undone."
      />

      <ImageCropperModal 
        isOpen={cropperOpen}
        onClose={() => setCropperOpen(false)}
        imageSrc={tempImageSrc}
        onCropComplete={handleCropComplete}
      />

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <h1 className="text-4xl font-serif font-light text-stone-900 tracking-tight">Inventory</h1>
          <p className="text-sm font-medium text-stone-500 uppercase tracking-widest flex items-center gap-2">
            Admin Dashboard <span className="w-1 h-1 rounded-full bg-rose-900/40" /> {totalProducts} Garments
          </p>
        </div>
        <div className="flex items-center gap-3">
           <Button 
            variant="outline" 
            className="hidden sm:flex border-stone-200 text-stone-600 hover:bg-stone-50 rounded-xl font-bold h-12 px-6 transition-all"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button 
            onClick={handleAddNew}
            className="bg-rose-950 hover:bg-rose-900 text-amber-50 font-bold rounded-xl shadow-lg shadow-rose-950/20 h-12 px-8 transition-all transform hover:-translate-y-0.5 active:scale-95"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Garment
          </Button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
          <Search className="w-5 h-5 text-stone-400 group-focus-within:text-rose-900 transition-colors" />
        </div>
        <Input 
          type="text"
          placeholder="Search by garment name, ID, or material..."
          className="pl-14 pr-6 h-16 bg-white border-stone-200 focus:ring-rose-900/10 focus:border-rose-900 rounded-2xl shadow-sm text-lg font-poppins placeholder:text-stone-400 transition-all"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            fetchProducts(1, e.target.value)
          }}
        />
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-[2rem] border border-stone-100 shadow-xl shadow-stone-200/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50/50">
                <th className="px-8 py-6 text-[11px] font-bold text-stone-400 uppercase tracking-[0.2em]">Garment Details</th>
                <th className="px-8 py-6 text-[11px] font-bold text-stone-400 uppercase tracking-[0.2em]">Category</th>
                <th className="px-8 py-6 text-[11px] font-bold text-stone-400 uppercase tracking-[0.2em]">Inventory</th>
                <th className="px-8 py-6 text-[11px] font-bold text-stone-400 uppercase tracking-[0.2em]">Pricing</th>
                <th className="px-8 py-6 text-[11px] font-bold text-stone-400 uppercase tracking-[0.2em]">Status</th>
                <th className="px-8 py-6 text-[11px] font-bold text-stone-400 uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="w-10 h-10 animate-spin text-rose-900" />
                      <p className="text-sm font-bold text-stone-400 uppercase tracking-widest">Loading Boutique Collection...</p>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-20 h-20 rounded-full bg-stone-50 flex items-center justify-center text-stone-300">
                        <Search className="w-8 h-8" />
                      </div>
                      <p className="text-lg font-serif text-stone-600">No garments found matching your search</p>
                      <Button variant="ghost" onClick={() => { setSearchTerm(''); fetchProducts(1, '') }} className="text-rose-900 font-bold hover:bg-rose-50 rounded-xl">Clear filters</Button>
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="group hover:bg-stone-50/80 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-5">
                        <div className="relative w-16 h-20 rounded-xl overflow-hidden bg-stone-100 border border-stone-200/50 shadow-sm">
                          <Image 
                            src={product.image || '/DivyafalLogo.png'} 
                            alt={product.name} 
                            fill 
                            className="object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <p className="font-serif text-lg text-stone-900 leading-tight">{product.name}</p>
                          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest font-poppins">ID: {product.id.slice(0, 8)}</p>
                          <div className="flex gap-2">
                             {product.mostRecommended && (
                               <Badge className="bg-amber-50 text-amber-700 border-amber-200/50 hover:bg-amber-50 text-[9px] h-5 rounded-md px-1.5 font-bold tracking-wider">
                                 <Star className="w-2.5 h-2.5 mr-1 fill-amber-500" /> FEATURED
                               </Badge>
                             )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <StatusBadge type={product.category} />
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1.5">
                        <p className={cn(
                          "text-[15px] font-bold",
                          product.variants?.reduce((acc, v) => acc + v.stock, 0) === 0 ? "text-rose-600" : "text-stone-900"
                        )}>
                          {product.variants?.reduce((acc, v) => acc + v.stock, 0) || 0} in stock
                        </p>
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Across {product.variants?.length || 0} sizes</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1">
                        <p className="text-[17px] font-bold text-stone-900 font-poppins">
                          ₹{product.sale && product.salePrice ? product.salePrice.toLocaleString() : product.price.toLocaleString()}
                        </p>
                        {product.sale && product.salePrice && (
                          <p className="text-[12px] font-bold text-rose-600 line-through opacity-60">
                            ₹{product.price.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          product.isArchived ? "bg-stone-300" : (product.variants?.some(v => v.stock > 0) ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]")
                        )} />
                        <span className="text-[13px] font-bold text-stone-700 uppercase tracking-wider">
                          {product.isArchived ? 'Paused' : (product.variants?.some(v => v.stock > 0) ? 'Active' : 'Out of Stock')}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleEdit(product)}
                          className="w-10 h-10 rounded-xl hover:bg-stone-200/50 hover:text-stone-900 text-stone-400 transition-colors"
                        >
                          <Edit className="w-4.5 h-4.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => confirmDelete(product.id)}
                          className="w-10 h-10 rounded-xl hover:bg-rose-50 hover:text-rose-600 text-stone-400 transition-colors"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Section */}
        <div className="px-8 py-6 border-t border-stone-100 bg-stone-50/30 flex items-center justify-between">
          <p className="text-sm font-medium text-stone-500 font-poppins">
            Showing <span className="text-stone-900 font-bold">{(currentPage-1)*10 + 1} - {Math.min(currentPage*10, totalProducts)}</span> of <span className="text-stone-900 font-bold">{totalProducts}</span> garments
          </p>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              disabled={currentPage === 1}
              onClick={() => fetchProducts(currentPage - 1, searchTerm)}
              className="w-10 h-10 rounded-xl border-stone-200 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-1.5 mx-2">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => fetchProducts(i + 1, searchTerm)}
                  className={cn(
                    "w-10 h-10 rounded-xl text-sm font-bold transition-all",
                    currentPage === i + 1 
                    ? "bg-rose-950 text-amber-50 shadow-md" 
                    : "text-stone-400 hover:bg-stone-100 hover:text-stone-900"
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              disabled={currentPage === totalPages}
              onClick={() => fetchProducts(currentPage + 1, searchTerm)}
              className="w-10 h-10 rounded-xl border-stone-200 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Edit/Create Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl rounded-3xl">
          <form onSubmit={handleSave}>
            <DialogHeader className="p-8 pb-6 border-b border-stone-100 bg-white sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-3xl font-serif font-light text-stone-900">
                    {editingProduct ? 'Refine Garment' : 'New Collection Piece'}
                  </DialogTitle>
                  <p className="text-[11px] font-bold text-stone-400 uppercase tracking-[0.2em] mt-2">
                    {editingProduct ? `Editing ID: ${editingProduct.id.slice(0, 12)}` : 'Enter craftsmanship details below'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                   <div className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all cursor-pointer",
                    formData.isArchived ? "bg-stone-100 border-stone-200 text-stone-500" : "bg-emerald-50 border-emerald-100 text-emerald-700"
                  )} onClick={() => setFormData(prev => ({...prev, isArchived: !prev.isArchived}))}>
                    {formData.isArchived ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span className="text-[10px] font-bold uppercase tracking-widest">{formData.isArchived ? 'Paused' : 'Public'}</span>
                  </div>
                </div>
              </div>
            </DialogHeader>

            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr,1fr] gap-0">
              {/* Left Column: Details */}
              <div className="p-8 space-y-8 border-r border-stone-100">
                <div className="space-y-6">
                   <div className="space-y-3">
                    <Label htmlFor="name" className="text-[11px] font-bold text-stone-500 uppercase tracking-[0.15em]">Garment Name</Label>
                    <Input 
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="e.g. Midnight Silk Saree with Gold Zari"
                      className="h-14 bg-white border-stone-200 focus:ring-rose-900/10 focus:border-rose-900 rounded-xl text-lg font-poppins shadow-sm"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="price" className="text-[11px] font-bold text-stone-500 uppercase tracking-[0.15em]">Compare Price (MRP) (₹)</Label>
                      <Input 
                        id="price"
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData({...formData, price: e.target.value})}
                        placeholder="0.00"
                        className="h-12 bg-white border-stone-200 focus:ring-rose-900/10 focus:border-rose-900 rounded-xl text-stone-500 shadow-sm"
                        required
                      />
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="salePrice" className="text-[11px] font-bold text-stone-500 uppercase tracking-[0.15em]">Listing Price (Sale) (₹)</Label>
                      <Input 
                        id="salePrice"
                        type="number"
                        value={formData.salePrice}
                        onChange={(e) => setFormData({...formData, salePrice: e.target.value})}
                        placeholder="Optional"
                        className="h-12 bg-white border-stone-200 focus:ring-rose-900/10 focus:border-rose-900 rounded-xl font-bold text-stone-900 shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[11px] font-bold text-stone-500 uppercase tracking-[0.15em]">Garment Category</Label>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setFormData({...formData, category: cat})}
                          className={cn(
                            "px-4 py-2.5 rounded-xl text-[12px] font-bold uppercase tracking-wider border transition-all",
                            formData.category === cat 
                            ? "bg-rose-950 border-rose-950 text-amber-50 shadow-md" 
                            : "bg-white border-stone-200 text-stone-500 hover:border-stone-400 hover:text-stone-900"
                          )}
                        >
                          {cat.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-10 p-5 bg-stone-50/50 rounded-2xl border border-stone-100">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className={cn(
                        "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                        formData.sale ? "bg-rose-900 border-rose-900" : "border-stone-300"
                      )}>
                        <input 
                          type="checkbox" 
                          className="hidden"
                          checked={formData.sale}
                          onChange={(e) => setFormData({...formData, sale: e.target.checked})}
                        />
                        {formData.sale && <div className="w-2.5 h-2.5 bg-white rounded-[1px]" />}
                      </div>
                      <span className="text-[14px] font-bold text-stone-700 uppercase tracking-widest">Active Sale</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className={cn(
                        "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                        formData.mostRecommended ? "bg-rose-900 border-rose-900" : "border-stone-300"
                      )}>
                        <input 
                          type="checkbox"
                          className="hidden"
                          checked={formData.mostRecommended}
                          onChange={(e) => setFormData({...formData, mostRecommended: e.target.checked})}
                        />
                        {formData.mostRecommended && <Star className="w-3.5 h-3.5 text-white fill-white" />}
                      </div>
                      <span className="text-[14px] font-bold text-stone-700 uppercase tracking-widest">Featured Piece</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-4">
                   <div className="flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-rose-900" />
                    <Label className="text-[11px] font-bold text-stone-500 uppercase tracking-[0.15em]">Product Story & Specifications</Label>
                  </div>
                  <RichTextEditor 
                    value={formData.description}
                    onChange={(val) => setFormData(prev => ({...prev, description: val}))}
                    placeholder="Describe the fabric, weave, and heritage of this piece..."
                  />
                </div>
              </div>

              {/* Right Column: Assets & Variants */}
              <div className="p-8 space-y-10 bg-stone-50/30">
                {/* Images */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-bold text-stone-500 uppercase tracking-[0.15em] flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-rose-900" />
                      Visual Assets ({formData.photos.length}/6)
                    </Label>
                    {formData.photos.length < 6 && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-rose-900 font-bold hover:bg-rose-50 h-8 rounded-lg"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add
                      </Button>
                    )}
                  </div>

                  <input 
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                    accept="image/*"
                    className="hidden"
                  />

                  <div className="grid grid-cols-2 gap-4">
                    {formData.photos.map((photo, i) => (
                      <div key={i} className="relative aspect-[4/5] rounded-2xl overflow-hidden group border border-stone-200 bg-white shadow-sm">
                        <Image src={photo} alt={`Preview ${i}`} fill className="object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button 
                            type="button" 
                            variant="destructive" 
                            size="icon" 
                            onClick={() => removePhoto(i)}
                            className="w-10 h-10 rounded-xl shadow-lg transform scale-90 group-hover:scale-100 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        {i === 0 && (
                          <div className="absolute top-2 left-2 px-2 py-1 bg-white/90 backdrop-blur-sm border border-stone-200 rounded-lg text-[9px] font-bold text-stone-900 uppercase tracking-widest">
                            Primary
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {formData.photos.length < 6 && !isUploading && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-[4/5] rounded-2xl border-2 border-dashed border-stone-200 bg-white hover:border-rose-300 hover:bg-rose-50/30 transition-all flex flex-col items-center justify-center gap-3"
                      >
                        <div className="w-10 h-10 rounded-full bg-stone-50 flex items-center justify-center text-stone-400 group-hover:text-rose-900">
                          <Plus className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Upload Asset</span>
                      </button>
                    )}

                    {isUploading && (
                      <div className="aspect-[4/5] rounded-2xl border-2 border-dashed border-rose-200 bg-rose-50/10 flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-rose-900" />
                        <span className="text-[10px] font-bold text-rose-900 uppercase tracking-widest">Uploading...</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="h-px bg-stone-100" />

                {/* Variants Manager */}
                <VariantManager 
                  variants={formData.variants}
                  onChange={(newVariants) => setFormData(prev => ({...prev, variants: newVariants}))}
                />
              </div>
            </div>

            <DialogFooter className="p-8 bg-white border-t border-stone-100 sticky bottom-0 z-10 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setIsModalOpen(false)}
                className="font-poppins font-bold text-stone-500 hover:bg-stone-100 hover:text-stone-900 rounded-xl h-14 px-8 transition-colors"
              >
                Discard Changes
              </Button>
              <Button 
                type="submit" 
                disabled={isSaving}
                className="bg-rose-950 hover:bg-rose-900 text-amber-50 font-bold font-poppins rounded-xl shadow-xl shadow-rose-950/30 px-12 h-14 transition-all transform hover:-translate-y-1 active:scale-95"
              >
                {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : editingProduct ? 'Save Improvements' : 'Finalize Garment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
