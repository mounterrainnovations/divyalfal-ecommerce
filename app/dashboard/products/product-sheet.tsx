'use client';

import { useState } from 'react';
import Sheet from '@/components/admin/Sheet';
import Field, { CheckboxField, SelectInput, TextInput } from '@/components/admin/Field';
import SpecEditor from '@/components/admin/SpecEditor';
import { ACTION, ACTION_SOFT, LABEL } from '@/components/admin/styles';
import { cn } from '@/lib/utils';
import type { Product, ProductCategory, ProductType } from '@/types';
import { getDbCategory } from '@/lib/utils/product-utils';
import PhotoList from './photo-list';

const CATEGORIES: { value: ProductType; label: string }[] = [
  { value: 'SAREE', label: 'Sarees' },
  { value: 'INDO_WESTERN', label: 'Indo-Western' },
  { value: 'LEHENGA', label: 'Lehengas' },
  { value: 'SUIT', label: 'Suits' },
  { value: 'KURTA_PANT', label: 'Kurta Pant' },
  { value: 'WESTERN', label: 'Western' },
  { value: 'OTHER', label: 'Other' },
];

interface Draft {
  name: string;
  price: string;
  sale: boolean;
  salePrice: string;
  specifications: string;
  category: ProductType;
  photos: string[];
}

export function emptyDraft(): Draft {
  return {
    name: '',
    price: '',
    sale: false,
    salePrice: '',
    specifications: '',
    category: 'OTHER',
    photos: [''],
  };
}

export function draftFrom(product: Product): Draft {
  return {
    name: product.name,
    price: String(product.price),
    sale: product.sale ?? false,
    salePrice: product.salePrice ? String(product.salePrice) : '',
    specifications: product.specifications ?? '',
    category: getDbCategory(product.category as ProductCategory),
    photos: product.photos && product.photos.length > 0 ? product.photos : [''],
  };
}

/** The same four rules the previous dashboard enforced, kept verbatim. */
function validate(draft: Draft): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!draft.name.trim()) errors.name = 'A name is required';
  if (!draft.price || Number.isNaN(Number(draft.price))) errors.price = 'A valid price is required';
  if (draft.sale && (!draft.salePrice || Number.isNaN(Number(draft.salePrice)))) {
    errors.salePrice = 'A valid sale price is required while the sale is on';
  } else if (draft.sale && Number(draft.salePrice) >= Number(draft.price)) {
    errors.salePrice = 'The sale price must be below the full price';
  }
  if (!draft.photos[0]?.trim()) errors.photos = 'At least one photograph is required';
  return errors;
}

/**
 * Add or edit a product, in the portal's slide-over rather than a centred modal, so the row
 * being edited stays visible beside it.
 *
 * THE API IS UNTOUCHED. This is a rebuild of the screen, not of the endpoints: a new product
 * is `POST /api/products` and an edit is `PATCH /api/products/[id]`, with exactly the body
 * the previous dashboard sent — `name`, `price`, `sale`, `salePrice`, `specifications`,
 * `category` (the database enum) and `photos`. The one difference is that `price` and
 * `salePrice` go over the wire as JSON numbers rather than as `Prisma.Decimal` instances
 * serialised to strings; Prisma accepts both for a `Decimal` column, and it keeps the Prisma
 * client out of the browser bundle.
 *
 * A failed save leaves the sheet open with the work in it and reports the reason upward for
 * the toast. Losing a half-written product to a 500 is not an acceptable failure mode.
 */
export default function ProductSheet({
  open,
  mode,
  productId,
  draft,
  onDraftChange,
  onClose,
  onSaved,
  onError,
}: {
  open: boolean;
  mode: 'create' | 'edit';
  /** Required when editing; the PATCH target. */
  productId?: string;
  draft: Draft;
  onDraftChange: (draft: Draft) => void;
  onClose: () => void;
  onSaved: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function patch(change: Partial<Draft>) {
    onDraftChange({ ...draft, ...change });
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const found = validate(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      const body = JSON.stringify({
        name: draft.name,
        price: Number(draft.price),
        sale: draft.sale,
        salePrice: draft.sale && draft.salePrice ? Number(draft.salePrice) : null,
        specifications: draft.specifications,
        category: draft.category,
        photos: draft.photos.filter(photo => photo.trim()),
      });

      const response =
        mode === 'create'
          ? await fetch('/api/products', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body,
            })
          : await fetch(`/api/products/${productId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body,
            });

      if (response.ok) {
        setErrors({});
        onSaved(
          mode === 'create' ? `“${draft.name}” was added.` : `“${draft.name}” was updated.`
        );
        return;
      }

      const data = await response.json().catch(() => ({}));
      onError(data.error || 'The product could not be saved.');
    } catch {
      onError('The save request could not be sent.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={() => {
        if (saving) return;
        setErrors({});
        onClose();
      }}
      eyebrow="Products"
      title={mode === 'create' ? 'Add a product' : draft.name || 'Edit product'}
      footer={
        <>
          <button type="submit" form="product-form" disabled={saving} className={ACTION}>
            {saving ? 'Saving' : mode === 'create' ? 'Add product' : 'Save changes'}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              setErrors({});
              onClose();
            }}
            className={ACTION_SOFT}
          >
            Cancel
          </button>
        </>
      }
    >
      <form id="product-form" onSubmit={onSubmit} noValidate className="space-y-6">
        <Field id="product-name" label="Name" required error={errors.name}>
          <TextInput
            id="product-name"
            value={draft.name}
            invalid={Boolean(errors.name)}
            onChange={event => patch({ name: event.target.value })}
          />
        </Field>

        <div className="grid grid-cols-2 gap-5">
          <Field id="product-price" label="Price (₹)" required error={errors.price}>
            <TextInput
              id="product-price"
              type="number"
              step="0.01"
              inputMode="decimal"
              value={draft.price}
              invalid={Boolean(errors.price)}
              onChange={event => patch({ price: event.target.value })}
            />
          </Field>

          <Field id="product-category" label="Category">
            <SelectInput
              id="product-category"
              value={draft.category}
              onChange={event => patch({ category: event.target.value as ProductType })}
            >
              {CATEGORIES.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>

        <div className="space-y-4">
          <CheckboxField
            id="product-sale"
            label="On sale"
            checked={draft.sale}
            onChange={checked => patch({ sale: checked, salePrice: checked ? draft.salePrice : '' })}
          />
          {draft.sale ? (
            <Field
              id="product-sale-price"
              label="Sale price (₹)"
              required
              error={errors.salePrice}
              hint="Must be below the full price."
              className="max-w-[260px]"
            >
              <TextInput
                id="product-sale-price"
                type="number"
                step="0.01"
                inputMode="decimal"
                value={draft.salePrice}
                invalid={Boolean(errors.salePrice)}
                onChange={event => patch({ salePrice: event.target.value })}
              />
            </Field>
          ) : null}
        </div>

        <div>
          <p className={cn(LABEL, 'mb-1')}>Specifications</p>
          {/* Keyed on the product so opening a different row remounts the editor: TipTap
              reads its initial content once and does not follow the prop afterwards. */}
          <SpecEditor
            key={productId ?? 'new'}
            value={draft.specifications}
            onChange={value => patch({ specifications: value })}
            placeholder="Fabric, work, length, care…"
          />
        </div>

        <div>
          <PhotoList
            photos={draft.photos}
            onChange={photos => patch({ photos })}
            onError={onError}
            disabled={saving}
          />
          {errors.photos ? (
            <p className="mt-2 text-[11px] text-red-600">{errors.photos}</p>
          ) : null}
        </div>
      </form>
    </Sheet>
  );
}

export type { Draft };
