'use client';

import { useState } from 'react';
import Sheet from '@/components/admin/Sheet';
import Field, { TextInput } from '@/components/admin/Field';
import { ACTION_DANGER, ACTION_SOFT, META } from '@/components/admin/styles';
import type { Product } from '@/types';

/**
 * Deleting a product is irreversible and there is no trash to restore from, so it sits
 * behind the product's own name typed out. The previous dashboard used `confirm()`, which is
 * one keystroke from gone and which a tired admin clears by reflex.
 *
 * The match is exact apart from surrounding space — case included. Typing a name is meant to
 * make you read the name.
 */
export default function DeleteSheet({
  product,
  onClose,
  onDeleted,
  onError,
}: {
  /** The product to delete, or null when the sheet is closed. */
  product: Product | null;
  onClose: () => void;
  onDeleted: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [typed, setTyped] = useState('');
  const [deleting, setDeleting] = useState(false);

  const matches = product !== null && typed.trim() === product.name.trim();

  function close() {
    if (deleting) return;
    setTyped('');
    onClose();
  }

  async function onDelete() {
    if (!product || !matches) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/products/${product.id}`, { method: 'DELETE' });
      if (response.ok) {
        setTyped('');
        onDeleted(`“${product.name}” was deleted.`);
        return;
      }
      const data = await response.json().catch(() => ({}));
      onError(data.error || 'The product could not be deleted.');
    } catch {
      onError('The delete request could not be sent.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Sheet
      open={product !== null}
      onClose={close}
      width="sm"
      eyebrow="Products"
      title="Delete product"
      footer={
        <>
          <button
            type="button"
            disabled={!matches || deleting}
            onClick={onDelete}
            className={ACTION_DANGER}
          >
            {deleting ? 'Deleting' : 'Delete permanently'}
          </button>
          <button type="button" disabled={deleting} onClick={close} className={ACTION_SOFT}>
            Cancel
          </button>
        </>
      }
    >
      {product ? (
        <div className="space-y-5">
          <p className="text-[13px] text-[var(--ds-ink)]">
            This removes <span className="font-semibold text-[var(--ds-ink)]">{product.name}</span> and its
            photographs from the shop. It cannot be undone.
          </p>
          {/* Said here because this is where the decision is made. Archiving takes a garment
              off the shop at once and is reversible, and a product that appears on an order
              cannot be deleted at all — the order would lose the record of what was sold. */}
          <p className={META}>
            Archive it instead to take it off the shop while keeping its orders and
            photographs. A product that appears on an order cannot be deleted.
          </p>
          <Field
            id="delete-confirm"
            label="Type the product name to confirm"
            hint={product.name}
          >
            <TextInput
              id="delete-confirm"
              value={typed}
              autoComplete="off"
              onChange={event => setTyped(event.target.value)}
            />
          </Field>
        </div>
      ) : null}
    </Sheet>
  );
}
