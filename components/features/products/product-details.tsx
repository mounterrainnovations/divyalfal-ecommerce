'use client';

import { useState, useMemo } from 'react';
import { Minus, Plus, ChevronDown, ChevronUp, Star, ShieldCheck, Truck, RotateCcw, AlertCircle, Quote } from 'lucide-react';
import { formatPrice } from '@/lib/common/product-interfaces';
import { useCartStore } from '@/lib/store/cart';
import type { Product } from '@/types';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'sonner';

interface ProductDetailsProps {
  product: Product;
}

const CollapsibleSection = ({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-stone-100 last:border-0 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-6 group text-left"
      >
        <span className="text-[13px] font-bold text-stone-900 uppercase tracking-[0.2em] group-hover:text-rose-900 transition-colors">
          {title}
        </span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-stone-400 group-hover:text-rose-900 transition-colors" />
        ) : (
          <ChevronDown className="w-4 h-4 text-stone-400 group-hover:text-rose-900 transition-colors" />
        )}
      </button>
      <div className={cn(
        "transition-all duration-300 ease-in-out",
        isOpen ? "max-h-[1000px] pb-8 opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="prose prose-sm max-w-none text-stone-500 font-poppins space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
};

const ProductDetails = ({ product }: ProductDetailsProps) => {
  const router = useRouter();
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [measurements, setMeasurements] = useState({
    bust: '',
    waist: '',
    hips: '',
  });

  const availableVariants = useMemo(() => {
    return product.variants || [];
  }, [product.variants]);

  const selectedVariant = useMemo(() => {
    return availableVariants.find(v => v.size === selectedSize);
  }, [availableVariants, selectedSize]);

  const isOutOfStock = useMemo(() => {
    if (!selectedSize) return !availableVariants.some(v => v.stock > 0);
    return selectedVariant ? selectedVariant.stock <= 0 : true;
  }, [selectedSize, selectedVariant, availableVariants]);

  const incrementQuantity = () => {
    const max = selectedVariant?.stock || 999;
    setQuantity(prev => (prev < max ? prev + 1 : prev));
  };
  
  const decrementQuantity = () => setQuantity(prev => (prev > 1 ? prev - 1 : 1));

  const handleAddToCart = () => {
    if (!selectedSize) {
      toast.error('Please select a size first');
      return;
    }

    if (selectedSize === 'Custom' && (!measurements.bust || !measurements.waist || !measurements.hips)) {
      toast.error('Please fill in your custom measurements');
      return;
    }

    if (isOutOfStock) {
      toast.error('This size is currently unavailable');
      return;
    }

    useCartStore.getState().addItem({
      productId: product.id,
      product,
      size: selectedSize,
      quantity,
      customMeasurements: selectedSize === 'Custom' ? measurements : undefined,
    });
    toast.success('Added to your collection');
  };

  const handleRFQ = () => {
    const params = new URLSearchParams({
      productId: product.id,
      size: selectedSize || 'Custom',
      quantity: quantity.toString(),
    });
    router.push(`/checkout/rfq?${params.toString()}`);
  };

  return (
    <div className="space-y-10 font-poppins">
      <Toaster position="top-center" richColors />
      
      {/* Brand & Title */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold text-rose-900 uppercase tracking-[0.3em] bg-rose-50 px-3 py-1 rounded-full">
            Divyafal Heritage
          </span>
          {product.mostRecommended && (
            <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
              <Star className="w-3 h-3 fill-amber-600" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Featured</span>
            </div>
          )}
        </div>
        <h1 className="text-4xl md:text-5xl font-serif font-light text-stone-900 tracking-tight leading-tight">
          {product.name}
        </h1>
        <p className="text-stone-400 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
          SKU: {product.id.slice(0, 8).toUpperCase()} <span className="w-1 h-1 rounded-full bg-stone-200" /> {product.category}
        </p>
      </div>

      {/* Pricing */}
      <div className="flex items-end gap-5">
        <div className="space-y-1">
          <p className="text-4xl font-serif font-bold text-stone-900">
            {formatPrice(product.sale && product.salePrice ? product.salePrice : product.price)}
          </p>
          {product.sale && product.salePrice && (
            <div className="flex items-center gap-3">
              <span className="text-stone-400 line-through text-lg">
                {formatPrice(product.price)}
              </span>
              <span className="text-rose-900 font-bold text-sm bg-rose-50 px-2 py-0.5 rounded">
                -{Math.round(((product.price - product.salePrice) / product.price) * 100)}% OFF
              </span>
            </div>
          )}
        </div>
        {!product.isArchived && (
          <div className="mb-2">
             <div className={cn(
                "flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest",
                isOutOfStock ? "bg-amber-50 border-amber-100 text-amber-700" : "bg-emerald-50 border-emerald-100 text-emerald-700"
              )}>
                <div className={cn("w-1.5 h-1.5 rounded-full", isOutOfStock ? "bg-amber-500" : "bg-emerald-500")} />
                {isOutOfStock ? 'Waitlist Available' : 'In Stock'}
              </div>
          </div>
        )}
      </div>

      <div className="h-px bg-stone-100" />

      {/* Size Selector */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold text-stone-400 uppercase tracking-[0.2em]">Select Size</p>
          <Link href="#" className="text-[10px] font-bold text-rose-950 uppercase tracking-widest border-b border-rose-950/20 pb-0.5 hover:border-rose-950 transition-all">
            Size Guide
          </Link>
        </div>
        <div className="flex flex-wrap gap-3">
          {availableVariants.map(variant => (
            <button
              key={variant.id}
              disabled={variant.stock <= 0 && variant.size !== 'Custom'}
              onClick={() => setSelectedSize(variant.size)}
              className={cn(
                "relative group px-8 h-14 rounded-2xl border-2 transition-all font-bold flex items-center justify-center min-w-[100px]",
                selectedSize === variant.size
                  ? "bg-rose-950 border-rose-950 text-amber-50 shadow-xl shadow-rose-950/20"
                  : variant.stock <= 0 && variant.size !== 'Custom'
                    ? "bg-stone-50 border-stone-100 text-stone-300 cursor-not-allowed"
                    : "bg-white border-stone-100 text-stone-500 hover:border-stone-300 hover:text-stone-900"
              )}
            >
              {variant.size}
              {variant.stock <= 0 && variant.size !== 'Custom' && (
                <div className="absolute inset-x-2 h-px bg-stone-300 rotate-12 top-1/2" />
              )}
            </button>
          ))}
        </div>

        {selectedSize === 'Custom' && (
          <div className="p-8 bg-stone-50 border border-stone-100 rounded-[2rem] space-y-6 animate-in fade-in slide-in-from-top-4">
             <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-rose-900 flex items-center justify-center text-amber-50 shadow-lg">
                <Quote className="w-4 h-4" />
              </div>
              <p className="text-sm font-bold text-stone-900 uppercase tracking-widest">Bespoke Measurements (Inches)</p>
            </div>
            <div className="grid grid-cols-3 gap-6">
              {[
                { label: 'Bust', key: 'bust' },
                { label: 'Waist', key: 'waist' },
                { label: 'Hips', key: 'hips' }
              ].map(({ label, key }) => (
                <div key={key} className="space-y-2">
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">{label}</label>
                  <input
                    type="number"
                    placeholder="0.0"
                    className="w-full px-4 h-12 border border-stone-200 rounded-xl bg-white focus:ring-4 focus:ring-rose-900/5 focus:border-rose-900 outline-none transition-all text-sm font-bold"
                    value={measurements[key as keyof typeof measurements]}
                    onChange={e => setMeasurements(prev => ({ ...prev, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <p className="text-[10px] text-stone-400 font-medium italic">Hand-crafted pieces require precise dimensions. Our team will verify these via call.</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-white border border-stone-200 rounded-2xl h-16 px-2 shadow-sm">
            <button
              onClick={decrementQuantity}
              className="w-12 h-12 flex items-center justify-center hover:bg-stone-50 rounded-xl transition-all text-stone-400 hover:text-stone-900"
            >
              <Minus className="w-4 h-4" />
            </button>
            <input
              type="number"
              value={quantity}
              readOnly
              className="w-12 text-center bg-transparent font-bold text-stone-900 outline-none"
            />
            <button
              onClick={incrementQuantity}
              className="w-12 h-12 flex items-center justify-center hover:bg-stone-50 rounded-xl transition-all text-stone-400 hover:text-stone-900"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className={cn(
              "flex-1 h-16 rounded-2xl font-bold transition-all shadow-xl flex items-center justify-center gap-3 active:scale-[0.98]",
              isOutOfStock 
                ? "bg-stone-900 text-amber-50 opacity-40 cursor-not-allowed" 
                : "bg-rose-950 hover:bg-rose-900 text-amber-50 shadow-rose-950/20"
            )}
          >
            {isOutOfStock ? 'Sold Out' : 'Reserve & Buy Now'}
          </button>
        </div>
        
        <button
          onClick={handleRFQ}
          className="w-full h-16 bg-white border-2 border-stone-100 text-stone-900 rounded-2xl font-bold hover:bg-stone-50 hover:border-stone-200 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
        >
          <Quote className="w-5 h-5 text-rose-900" /> Request Custom Quote
        </button>
      </div>

      {/* Heritage Details */}
      <div className="pt-10 border-t border-stone-100">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {[
            { icon: ShieldCheck, label: 'Quality Assured', sub: 'Heritage Weaves' },
            { icon: Truck, label: 'Express Delivery', sub: 'Global Shipping' },
            { icon: RotateCcw, label: 'Authentic Exchange', sub: 'Standard Sizes' },
            { icon: AlertCircle, label: 'Secure Checkout', sub: 'Razorpay Verified' }
          ].map((item, i) => (
            <div key={i} className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-stone-50 flex items-center justify-center">
                <item.icon className="w-5 h-5 text-rose-900" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-stone-900 uppercase tracking-widest">{item.label}</p>
                <p className="text-[10px] text-stone-400 font-medium uppercase tracking-widest mt-0.5">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
           <CollapsibleSection title="The Craftsmanship" defaultOpen>
             {product.specifications ? (
                <div
                  className="product-description font-poppins leading-relaxed text-stone-600"
                  dangerouslySetInnerHTML={{ __html: product.specifications }}
                />
             ) : (
               <p>{product.description}</p>
             )}
          </CollapsibleSection>

          <CollapsibleSection title="Shipping & Returns">
            <p>Our artisans carefully inspect every garment before dispatch. Standard delivery across India takes 5-7 business days.</p>
            <p>For custom orders (Bespoke/RFQ), please allow 14-21 business days for hand-weaving and tailoring.</p>
            <p>Returns are accepted for standard sizes within 7 days of delivery. Custom-made pieces are final sale.</p>
          </CollapsibleSection>

          <CollapsibleSection title="Care Instruction">
            <p>Preserve the heritage of your garment with care:</p>
            <ul className="list-disc pl-4 space-y-2">
              <li>Strictly dry clean only.</li>
              <li>Store in provided muslin bags to allow fabric to breathe.</li>
              <li>Avoid direct sunlight for prolonged periods.</li>
              <li>Iron on silk setting with a protective layer.</li>
            </ul>
          </CollapsibleSection>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
