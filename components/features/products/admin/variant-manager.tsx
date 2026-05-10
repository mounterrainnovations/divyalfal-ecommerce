'use client';

import { useState } from 'react';
import { Plus, Trash2, Package, Ruler, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProductVariant } from '@/types';

interface VariantManagerProps {
  variants: Partial<ProductVariant>[];
  onChange: (variants: Partial<ProductVariant>[]) => void;
}

export function VariantManager({ variants, onChange }: VariantManagerProps) {
  const addVariant = () => {
    onChange([...variants, { size: '', stock: 0, color: '' }]);
  };

  const removeVariant = (index: number) => {
    const newVariants = [...variants];
    newVariants.splice(index, 1);
    onChange(newVariants);
  };

  const updateVariant = (index: number, field: keyof ProductVariant, value: string | number) => {
    const newVariants = [...variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    onChange(newVariants);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-[11px] font-bold text-stone-500 uppercase tracking-[0.15em] flex items-center gap-2">
          <Package className="w-4 h-4 text-rose-900" />
          Variants & Inventory
        </Label>
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={addVariant}
          className="border-rose-200 text-rose-900 hover:bg-rose-50 rounded-xl font-bold transition-all h-9"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Variant
        </Button>
      </div>

      <div className="space-y-3">
        {variants.length === 0 ? (
          <div className="text-center py-8 bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200">
            <p className="text-[13px] font-bold text-stone-400 uppercase tracking-widest">No variants added yet</p>
            <p className="text-[11px] text-stone-400 mt-1">Add sizes like S, M, L, XL or Custom</p>
          </div>
        ) : (
          variants.map((variant, index) => (
            <div 
              key={index} 
              className="group grid grid-cols-1 sm:grid-cols-[1fr,1fr,100px,44px] gap-3 p-4 bg-white border border-stone-200 rounded-2xl shadow-sm hover:border-rose-200 hover:shadow-md transition-all items-end"
            >
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Ruler className="w-3 h-3" />
                  Size
                </Label>
                <Input 
                  value={variant.size} 
                  onChange={(e) => updateVariant(index, 'size', e.target.value)}
                  placeholder="e.g. XL"
                  className="h-10 rounded-xl border-stone-100 focus:ring-rose-900/10 focus:border-rose-900 transition-all text-sm font-medium"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Palette className="w-3 h-3" />
                  Color (Opt.)
                </Label>
                <Input 
                  value={variant.color || ''} 
                  onChange={(e) => updateVariant(index, 'color', e.target.value)}
                  placeholder="e.g. Royal Blue"
                  className="h-10 rounded-xl border-stone-100 focus:ring-rose-900/10 focus:border-rose-900 transition-all text-sm font-medium"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                  Stock
                </Label>
                <Input 
                  type="number"
                  value={variant.stock} 
                  onChange={(e) => updateVariant(index, 'stock', parseInt(e.target.value) || 0)}
                  className="h-10 rounded-xl border-stone-100 focus:ring-rose-900/10 focus:border-rose-900 transition-all text-sm font-bold text-stone-900"
                />
              </div>

              <Button 
                type="button" 
                variant="ghost" 
                size="icon"
                onClick={() => removeVariant(index)}
                className="h-10 w-10 text-stone-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
