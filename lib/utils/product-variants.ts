import type { ProductVariant } from '@/types';

type VariantInput = Partial<ProductVariant>;

export interface NormalizedVariantInput {
  id?: string;
  size: string;
  color: string | null;
  stock: number;
}

export function normalizeVariants(variants: VariantInput[]): NormalizedVariantInput[] {
  return variants.map((variant) => ({
    id: variant.id,
    size: String(variant.size || '').trim(),
    color: variant.color ? String(variant.color).trim() || null : null,
    stock: Math.max(0, Number(variant.stock) || 0),
  }));
}

export function validateVariants(variants: VariantInput[]): string | null {
  if (!Array.isArray(variants) || variants.length === 0) {
    return 'At least one product variant is required';
  }

  const normalized = normalizeVariants(variants);

  if (normalized.some((variant) => !variant.size)) {
    return 'Each variant must have a size';
  }

  const seenSizes = new Set<string>();
  for (const variant of normalized) {
    const sizeKey = variant.size.toLowerCase();
    if (seenSizes.has(sizeKey)) {
      return `Duplicate variant size: ${variant.size}`;
    }
    seenSizes.add(sizeKey);
  }

  return null;
}
