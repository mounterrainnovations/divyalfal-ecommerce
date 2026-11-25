'use client';

import { useState } from 'react';
import Sheet from '@/components/admin/Sheet';
import Field, { SelectInput, TextInput } from '@/components/admin/Field';
import Notice from '@/components/admin/Notice';
import { ACTION, ACTION_SOFT, META } from '@/components/admin/styles';
import { send } from '@/lib/admin/api';
import { cn } from '@/lib/utils';
import type { ProductRef, VariantRow } from './stock';

export interface VariantDraft {
  productId: string;
  size: string;
  color: string;
  stock: string;
}

export function draftFor(variant: VariantRow): VariantDraft {
  return {
    productId: variant.productId,
    size: variant.size,
    color: variant.color ?? '',
    stock: String(variant.stock),
  };
}

export function emptyDraft(productId = ''): VariantDraft {
  return { productId, size: '', color: '', stock: '0' };
}

/**
 * Validation, such as it is: a size needs a garment and a name, and stock is a count of
 * things on a rail — a whole number, never negative, and never a half.
 *
 * `stock` is checked rather than clamped. Silently turning `-2` into `0` would record a number
 * the admin did not type, in the one column the shop will act on.
 */
function validate(draft: VariantDraft): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!draft.productId) errors.productId = 'Choose which product this size belongs to';
  if (!draft.size.trim()) errors.size = 'A size is required, e.g. M, XL or Custom';

  const stock = Number(draft.stock);
  if (draft.stock.trim() === '' || !Number.isInteger(stock) || stock < 0) {
    errors.stock = 'Stock must be a whole number of units, zero or more';
  }
  return errors;
}

/**
 * Add a size to a garment, or correct one that exists.
 *
 * WHY ADDING A SIZE IS A SHEET AND EDITING STOCK IS NOT. Changing a count is one number and
 * belongs in the row, where the rail is visible beside it. Creating a variant is four
 * decisions — which garment, which size, which colour, how many — and three of them are
 * permanent-ish: `size` and `color` are what an order records, so a mistyped size is a wrong
 * line on an invoice rather than a wrong number on a shelf. That earns a form.
 *
 * The product cannot be changed on an edit. Moving a size from one garment to another is not
 * an edit, it is a deletion and a creation, and doing it in place would rewrite what the
 * orders already pointing at this variant mean.
 */
export default function VariantSheet({
  open,
  mode,
  variantId,
  products,
  draft,
  onDraftChange,
  onClose,
  onSaved,
  onError,
}: {
  open: boolean;
  mode: 'create' | 'edit';
  /** Required when editing: the PATCH target. */
  variantId?: string;
  /** Every product, for the picker. Archived ones are labelled rather than hidden. */
  products: ProductRef[];
  draft: VariantDraft;
  onDraftChange: (draft: VariantDraft) => void;
  onClose: () => void;
  onSaved: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const product = products.find(candidate => candidate.id === draft.productId) ?? null;

  function patch(change: Partial<VariantDraft>) {
    onDraftChange({ ...draft, ...change });
  }

  function close() {
    if (saving) return;
    setErrors({});
    onClose();
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const found = validate(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    const body = {
      size: draft.size.trim(),
      color: draft.color.trim(),
      stock: Number(draft.stock),
    };
    const answer =
      mode === 'create'
        ? await send('/api/admin/inventory', 'POST', { ...body, productId: draft.productId })
        : await send('/api/admin/inventory', 'PATCH', { ...body, id: variantId });
    setSaving(false);

    if (answer.ok) {
      setErrors({});
      onSaved(
        mode === 'create'
          ? `Size ${body.size} was added to “${product?.name ?? 'the product'}”.`
          : `Size ${body.size} was updated.`
      );
      return;
    }
    // The endpoint's own sentence, when it sent one: it knows things this sheet does not,
    // such as that the product was deleted in another tab.
    onError(answer.message || 'The size could not be saved.');
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      width="sm"
      eyebrow="Stock"
      title={mode === 'create' ? 'Add a size' : `Edit ${draft.size || 'size'}`}
      footer={
        <>
          <button type="submit" form="variant-form" disabled={saving} className={ACTION}>
            {saving ? 'Saving' : mode === 'create' ? 'Add size' : 'Save changes'}
          </button>
          <button type="button" disabled={saving} onClick={close} className={ACTION_SOFT}>
            Cancel
          </button>
        </>
      }
    >
      <form id="variant-form" onSubmit={onSubmit} noValidate className="space-y-5">
        <Field
          id="variant-product"
          label="Product"
          required
          error={errors.productId}
          hint={mode === 'edit' ? 'A size cannot be moved to another product' : undefined}
        >
          <SelectInput
            id="variant-product"
            value={draft.productId}
            disabled={mode === 'edit'}
            onChange={event => patch({ productId: event.target.value })}
          >
            <option value="">Choose a product</option>
            {products.map(option => (
              <option key={option.id} value={option.id}>
                {option.name}
                {option.isArchived ? ' (archived)' : ''}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field
          id="variant-size"
          label="Size"
          required
          error={errors.size}
          hint="Whatever the shop writes on the label: S, M, L, XS or Custom"
        >
          <TextInput
            id="variant-size"
            value={draft.size}
            invalid={Boolean(errors.size)}
            autoComplete="off"
            onChange={event => patch({ size: event.target.value })}
          />
        </Field>

        <Field
          id="variant-color"
          label="Colour"
          hint="Optional. Leave it empty when the garment comes in one colour."
        >
          <TextInput
            id="variant-color"
            value={draft.color}
            autoComplete="off"
            onChange={event => patch({ color: event.target.value })}
          />
        </Field>

        <Field id="variant-stock" label="Units in stock" required error={errors.stock}>
          <TextInput
            id="variant-stock"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={draft.stock}
            invalid={Boolean(errors.stock)}
            onChange={event => patch({ stock: event.target.value })}
          />
        </Field>

        {mode === 'create' ? (
          <p className={cn(META, 'max-w-[48ch]')}>
            Until a product has at least one size, its stock is unknown rather than zero — the
            shop may well have the garment, nobody has recorded it here.
          </p>
        ) : null}
      </form>
    </Sheet>
  );
}

/**
 * Removing a size, and the one refusal that matters.
 *
 * `OrderItem.productVariantId` is a required foreign key, so a size that has been bought
 * cannot be deleted — the order would lose the record of what was sold. The endpoint counts
 * the orders and refuses with a sentence; this sheet shows that sentence **in place**, beside
 * the size it is about, rather than as a toast that slides away before it is read. The
 * alternative an admin actually wants is in the same sentence: set the stock to zero.
 */
export function RemoveSizeSheet({
  variant,
  onClose,
  onRemoved,
}: {
  variant: VariantRow | null;
  onClose: () => void;
  onRemoved: (message: string) => void;
}) {
  const [working, setWorking] = useState(false);
  const [refusal, setRefusal] = useState('');

  function close() {
    if (working) return;
    setRefusal('');
    onClose();
  }

  async function remove() {
    if (!variant) return;
    setWorking(true);
    setRefusal('');
    const answer = await send(
      `/api/admin/inventory?id=${encodeURIComponent(variant.id)}`,
      'DELETE'
    );
    setWorking(false);

    if (answer.ok) {
      onRemoved(`Size ${variant.size} was removed from “${variant.product?.name ?? 'the product'}”.`);
      return;
    }
    setRefusal(answer.message || 'That size could not be removed.');
  }

  return (
    <Sheet
      open={variant !== null}
      onClose={close}
      width="sm"
      eyebrow="Stock"
      title="Remove a size"
      footer={
        <>
          <button type="button" disabled={working} onClick={remove} className={ACTION}>
            {working ? 'Removing' : 'Remove size'}
          </button>
          <button type="button" disabled={working} onClick={close} className={ACTION_SOFT}>
            Cancel
          </button>
        </>
      }
    >
      {variant ? (
        <div className="space-y-4">
          <p className="text-[13px] leading-5 text-[var(--ds-ink)]">
            This removes size{' '}
            <span className="font-semibold">{variant.size}</span>
            {variant.color ? ` in ${variant.color}` : ''} from{' '}
            <span className="font-semibold">{variant.product?.name ?? 'this product'}</span>, along
            with its stock of {variant.stock}.
          </p>
          <p className={cn(META, 'max-w-[48ch]')}>
            A size that appears on an order cannot be removed, because the order records what was
            actually sold. Setting its stock to 0 takes it out of stock without rewriting history.
          </p>
          {refusal ? (
            <Notice label="Not removed" tone="problem">
              {refusal}
            </Notice>
          ) : null}
        </div>
      ) : null}
    </Sheet>
  );
}
