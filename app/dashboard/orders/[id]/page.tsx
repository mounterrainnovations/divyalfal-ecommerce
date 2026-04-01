'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  ChevronLeft, 
  Package, 
  Truck, 
  CreditCard, 
  User, 
  MapPin, 
  Calendar,
  ExternalLink,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import Image from 'next/image'

const ORDER_STATUSES = ['PENDING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED']
const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'REFUNDED']

export default function AdminOrderDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form states
  const [status, setStatus] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('')
  const [trackingId, setTrackingId] = useState('')
  const [trackingUrl, setTrackingUrl] = useState('')

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await fetch(`/api/orders/${params.id}`)
        if (!response.ok) throw new Error('Order not found')
        const data = await response.json()
        setOrder(data)
        setStatus(data.status)
        setPaymentStatus(data.paymentStatus)
        setTrackingId(data.trackingId || '')
        setTrackingUrl(data.trackingUrl || '')
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (params.id) fetchOrder()
  }, [params.id])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdating(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/orders/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status,
          paymentStatus,
          trackingId,
          trackingUrl
        })
      })

      if (!response.ok) throw new Error('Failed to update order')
      const updatedData = await response.json()
      setOrder({ ...order, ...updatedData })
      setSuccess('Order updated successfully')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    )
  }

  if (error && !order) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-amber-50">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-serif font-bold text-gray-900">Something went wrong</h2>
        <p className="text-gray-500 mt-2">{error}</p>
        <Button 
          variant="outline" 
          className="mt-6 border-amber-100 font-poppins"
          onClick={() => router.push('/dashboard/orders')}
        >
          <ChevronLeft className="w-4 h-4 mr-2" /> Back to Orders
        </Button>
      </div>
    )
  }

  const subtotal = Number(order.totalAmount)
  const items = order.items || []
  const shippingAddress = order.shippingAddress || {}

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.push('/dashboard/orders')}
            className="hover:bg-amber-50 rounded-xl"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </Button>
          <div>
            <h1 className="text-3xl font-serif font-bold text-gray-900">
              Order #{order.id.slice(0, 8).toUpperCase()}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-1">
              <span className="text-gray-500 font-poppins text-sm flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> {new Date(order.createdAt).toLocaleDateString()}
              </span>
              <Badge 
                variant="outline" 
                className={cn(
                  "border-none px-3 font-poppins font-bold",
                  order.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800' : 
                  order.status === 'SHIPPED' ? 'bg-blue-100 text-blue-800' : 
                  order.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : 
                  'bg-amber-100 text-amber-800'
                )}
              >
                {order.status}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Details */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Order Items */}
          <div className="bg-white rounded-3xl border border-amber-50 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-amber-50 bg-gray-50/30">
              <h2 className="text-lg font-serif font-bold text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-600" /> Ordered Items
              </h2>
            </div>
            <div className="divide-y divide-amber-50">
              {items.map((item: any) => (
                <div key={item.id} className="p-6 flex gap-6">
                  <div className="relative w-24 h-32 bg-gray-100 rounded-xl overflow-hidden border border-amber-50 shrink-0">
                    <Image 
                      src={item.product?.photos?.[0] || '/DivyafalLogo.png'} 
                      alt={item.product?.name || 'Product'} 
                      fill 
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between items-start">
                      <h3 className="font-poppins font-bold text-gray-900">{item.product?.name}</h3>
                      <p className="font-poppins font-bold text-gray-900">₹{Number(item.price).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-poppins text-gray-500">
                      <span>Size: <span className="font-bold text-amber-600">{item.variant?.size}</span></span>
                      <span>Quantity: <span className="font-bold text-gray-700">{item.quantity}</span></span>
                    </div>
                    {item.variant?.size === 'Custom' && item.customMeasurements && (
                      <div className="mt-2 p-3 bg-amber-50 rounded-xl border border-amber-100 grid grid-cols-3 gap-4">
                        {Object.entries(item.customMeasurements).map(([key, value]) => (
                          <div key={key}>
                            <p className="text-[10px] uppercase font-bold text-amber-600 tracking-wider font-poppins">{key}</p>
                            <p className="text-sm font-bold text-gray-700 font-poppins">{value as string} &quot;</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-6 bg-gray-50/30 border-t border-amber-50">
              <div className="flex justify-between items-center max-w-xs ml-auto">
                <span className="text-gray-500 font-poppins">Total Amount</span>
                <span className="text-2xl font-serif font-bold text-amber-600">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Shipping and Customer Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Shipping Address */}
            <div className="bg-white rounded-3xl border border-amber-50 shadow-sm overflow-hidden">
               <div className="p-6 border-b border-amber-50 bg-gray-50/30">
                <h2 className="text-lg font-serif font-bold text-gray-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-amber-600" /> Shipping Details
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest font-poppins">Recipient</p>
                  <p className="font-poppins font-bold text-gray-900 mt-1">{shippingAddress.fullName || order.profile?.fullName}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest font-poppins">Address</p>
                  <p className="font-poppins text-gray-600 mt-1 leading-relaxed">
                    {shippingAddress.street}<br />
                    {shippingAddress.city}, {shippingAddress.state} {shippingAddress.postalCode}<br />
                    {shippingAddress.country || 'India'}
                  </p>
                </div>
              </div>
            </div>

            {/* Customer Information */}
            <div className="bg-white rounded-3xl border border-amber-50 shadow-sm overflow-hidden">
               <div className="p-6 border-b border-amber-50 bg-gray-50/30">
                <h2 className="text-lg font-serif font-bold text-gray-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-amber-600" /> Customer Account
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest font-poppins">Email</p>
                  <p className="font-poppins font-bold text-gray-900 mt-1">{order.profile?.email}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest font-poppins">Phone</p>
                  <p className="font-poppins font-bold text-gray-900 mt-1">{shippingAddress.phone || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Admin Actions */}
        <div className="space-y-8">
          <form onSubmit={handleUpdate} className="bg-white rounded-3xl border border-amber-200 shadow-xl shadow-amber-500/5 overflow-hidden">
            <div className="p-6 border-b border-amber-100 bg-amber-50/50">
              <h2 className="text-lg font-serif font-bold text-gray-900">Manage Order</h2>
            </div>
            <div className="p-6 space-y-6">
              
              {/* Notifications */}
              {success && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl text-sm font-poppins flex items-center gap-2 animate-in fade-in zoom-in duration-300">
                  <CheckCircle className="w-4 h-4" /> {success}
                </div>
              )}

              {/* Status Update */}
              <div className="space-y-2">
                <Label htmlFor="status" className="text-xs font-bold text-gray-500 uppercase tracking-widest font-poppins">Order Status</Label>
                <select 
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full h-11 bg-white border border-amber-100 rounded-xl px-3 font-poppins focus:ring-2 focus:ring-amber-500 outline-none transition"
                >
                  {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Payment Status Update */}
              <div className="space-y-2">
                <Label htmlFor="paymentStatus" className="text-xs font-bold text-gray-500 uppercase tracking-widest font-poppins flex items-center gap-2">
                  <CreditCard className="w-3 h-3" /> Payment Status
                </Label>
                <select 
                  id="paymentStatus"
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="w-full h-11 bg-white border border-amber-100 rounded-xl px-3 font-poppins focus:ring-2 focus:ring-amber-500 outline-none transition"
                >
                  {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="h-[1px] bg-amber-100" />

              {/* Tracking ID */}
              <div className="space-y-2">
                <Label htmlFor="trackingId" className="text-xs font-bold text-gray-500 uppercase tracking-widest font-poppins flex items-center gap-2">
                  <Truck className="w-3 h-3" /> Tracking ID
                </Label>
                <Input 
                  id="trackingId"
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value)}
                  placeholder="e.g. DTDC-12345"
                  className="h-11 bg-white border-amber-100 rounded-xl font-poppins"
                />
              </div>

              {/* Tracking URL */}
              <div className="space-y-2">
                <Label htmlFor="trackingUrl" className="text-xs font-bold text-gray-500 uppercase tracking-widest font-poppins">Tracking Details Link</Label>
                <Input 
                  id="trackingUrl"
                  value={trackingUrl}
                  onChange={(e) => setTrackingUrl(e.target.value)}
                  placeholder="https://tracker.mtdc.in/xyz"
                  className="h-11 bg-white border-amber-100 rounded-xl font-poppins"
                />
                {trackingUrl && (
                  <a href={trackingUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-amber-600 font-bold hover:underline flex items-center gap-1 mt-1">
                    <ExternalLink className="w-2.5 h-2.5" /> Test tracking link
                  </a>
                )}
              </div>

              <Button 
                type="submit" 
                disabled={updating}
                className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-lg shadow-amber-200 transition-all font-poppins font-bold"
              >
                {updating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating...</> : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
