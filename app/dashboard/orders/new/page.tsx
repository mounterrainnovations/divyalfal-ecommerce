'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import ScreenHead from '@/components/admin/ScreenHead';
import Notice from '@/components/admin/Notice';
import Toast, { type ToastMessage } from '@/components/admin/Toast';
import Field, { SelectInput, TextInput } from '@/components/admin/Field';
import {
  ACTION,
  ACTION_GRAVE,
  ACTION_QUIET,
  ACTION_SOFT,
  CARD,
  CARD_BODY,
  CARD_HEAD,
  LABEL,
  META,
  SCREEN,
  SECTION_TITLE,
  badge,
} from '@/components/admin/styles';
import { cn } from '@/lib/utils';
import { request, send } from '@/lib/admin/api';
import type { SellableCatalogue, SellableProduct, StockShortfall } from '@/lib/repositories/orders';
import {
  ORDER_STATUS_OPTIONS,
  PAYMENT_LABEL,
  PAYMENT_STATUS_OPTIONS,
  STATUS_LABEL,
  rupees,
  subtotalOf,
  type OrderDetail,
} from '../shared';

/**
 * Record an offline order: the walk-in sale, typed at the counter.
 *
 * **WHY THE PRODUCT PICKER IS SHORTER THAN THE CATALOGUE.** `OrderItem.productVariantId` is a
 * required foreign key, so a line cannot exist without a real `ProductVariant` — a size with
 * stock against it. Only two of the fifteen products have one today. The form therefore offers
 * those two, and names the rest in plain words with the reason, because a picker that silently
 * showed two of fifteen items would read as a broken query. It does not offer to create a
 * variant: a variant carries a stock figure, and inventing stock is inventing a fact about the
 * shelf that the shop would then have to discover was wrong.
 *
 * **The price is pre-filled and then editable.** A counter negotiates — a regular customer, a
 * small mark on a sleeve — and a form that can only sell at list price is a form that gets
 * bypassed with a paper book. The catalogue price is the starting point, not the rule.
 *
 * **The stock refusal is the server's.** The form shows what is in stock beside each size and
 * will say so before submitting, but the decision is made inside the transaction that writes
 * the order, because the storefront may have sold the last one while this form sat open. A 409
 * comes back naming every short line at once, so the person retyping only does it once.
 */

interface LineDraft {
  /** Stable key for React across insertions and removals; never sent. */
  key: string;
  productId: string;
  productVariantId: string;
  /** Held as text so the field can be empty mid-edit rather than snapping to 0. */
  quantity: string;
  price: string;
}

const ADDRESS_FIELDS = [
  { key: 'street', label: 'Street', placeholder: 'House, street, locality' },
  { key: 'city', label: 'City', placeholder: '' },
  { key: 'state', label: 'State', placeholder: '' },
  { key: 'postalCode', label: 'Postal code', placeholder: '' },
] as const;

function emptyLine(): LineDraft {
  return { key: crypto.randomUUID(), productId: '', productVariantId: '', quantity: '1', price: '' };
}

export default function NewOrderPage() {
  const router = useRouter();

  const [catalogue, setCatalogue] = useState<SellableCatalogue | null>(null);
  const [loading, setLoading] = useState(true);
  const [notSetUp, setNotSetUp] = useState(false);
  const [loadFailure, setLoadFailure] = useState('');

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [address, setAddress] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string>('PENDING');
  const [paymentStatus, setPaymentStatus] = useState<string>('PAID');
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);

  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState('');
  const [shortfalls, setShortfalls] = useState<StockShortfall[]>([]);
  const [nameError, setNameError] = useState('');
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      const answer = await request<SellableCatalogue>('/api/admin/orders/products', {
        signal: controller.signal,
      });
      if (answer.aborted) return;

      if (answer.ok && answer.data) {
        setCatalogue(answer.data);
        setNotSetUp(false);
        setLoadFailure('');
      } else {
        setCatalogue(null);
        setNotSetUp(answer.notSetUp);
        setLoadFailure(answer.notSetUp ? '' : answer.message);
      }
      setLoading(false);
    };

    load();
    return () => controller.abort();
  }, []);

  const products = catalogue?.products ?? [];
  const byId = new Map<string, SellableProduct>(products.map(product => [product.id, product]));

  function patchLine(key: string, patch: Partial<LineDraft>) {
    setLines(current => current.map(line => (line.key === key ? { ...line, ...patch } : line)));
  }

  /**
   * Choosing a product resets the size and pre-fills the price.
   *
   * The size MUST be reset: a variant id belongs to exactly one product, and keeping the old
   * one would send a pairing the server refuses — correctly, but after a round trip and with a
   * message about a mismatch nobody made on purpose.
   */
  function chooseProduct(key: string, productId: string) {
    const product = byId.get(productId);
    patchLine(key, {
      productId,
      productVariantId: product && product.variants.length === 1 ? product.variants[0].id : '',
      price: product ? String(product.price) : '',
    });
  }

  const parsedLines = lines.map(line => {
    const product = byId.get(line.productId);
    const variant = product?.variants.find(option => option.id === line.productVariantId) ?? null;
    const quantity = Number(line.quantity);
    const price = Number(line.price);
    return {
      line,
      product: product ?? null,
      variant,
      quantity: Number.isInteger(quantity) && quantity > 0 ? quantity : 0,
      price: Number.isFinite(price) && price >= 0 ? price : 0,
      // Flagged here so the form can refuse before submitting; the server checks again, and
      // its check is the one that counts.
      overStock: variant !== null && Number.isInteger(quantity) && quantity > variant.stock,
    };
  });

  const subtotal = subtotalOf(
    parsedLines.map(parsed => ({ quantity: parsed.quantity, price: parsed.price }))
  );

  const incomplete = parsedLines.some(
    parsed => !parsed.product || !parsed.variant || parsed.quantity < 1
  );
  const anyOverStock = parsedLines.some(parsed => parsed.overStock);

  async function submit() {
    setProblem('');
    setShortfalls([]);

    if (!customerName.trim()) {
      setNameError('The customer’s name is needed');
      return;
    }
    setNameError('');

    // An address is sent ONLY when a delivery field was filled in. Sending the name and phone
    // alone would store a `shippingAddress` for a sale the customer carried home, and the
    // order screen would then show a delivery block with no delivery in it. When there IS an
    // address, the name, phone and email go in with it: those three are part of the same
    // seven-key shape the storefront checkout writes, so the block stays self-contained.
    const delivering = ADDRESS_FIELDS.some(field => (address[field.key] ?? '').trim() !== '');

    setSaving(true);
    const answer = await send<OrderDetail & { shortfalls?: StockShortfall[] }>(
      '/api/admin/orders',
      'POST',
      {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim(),
        address: delivering
          ? {
              ...address,
              fullName: customerName.trim(),
              phone: customerPhone.trim(),
              email: customerEmail.trim(),
            }
          : null,
        items: parsedLines.map(parsed => ({
          productId: parsed.line.productId,
          productVariantId: parsed.line.productVariantId,
          quantity: parsed.quantity,
          price: parsed.price,
        })),
        status,
        paymentStatus,
      }
    );
    setSaving(false);

    if (!answer.ok || !answer.data?.id) {
      const sent = answer.data as { shortfalls?: StockShortfall[] } | null;
      if (answer.status === 409 && Array.isArray(sent?.shortfalls)) {
        setShortfalls(sent.shortfalls);
        setProblem('');
      } else {
        setProblem(answer.message);
      }
      setToast({ text: 'The order was not recorded.', tone: 'error' });
      return;
    }

    // Straight to the order that now exists: it is the receipt for this form, it carries the
    // invoice link, and the stock has already moved.
    router.push(`/dashboard/orders/${answer.data.id}`);
  }

  if (loading) {
    return (
      <div className={SCREEN}>
        <ScreenHead title="Record an offline order" />
        <Notice label="Loading" tone="working">
          Reading which products can be sold at the counter…
        </Notice>
      </div>
    );
  }

  if (notSetUp || loadFailure) {
    return (
      <div className={SCREEN}>
        <ScreenHead
          title="Record an offline order"
          actions={
            <Link href="/dashboard/orders" className={ACTION_SOFT}>
              <ArrowLeft size={15} strokeWidth={2} aria-hidden="true" />
              All orders
            </Link>
          }
        />
        {notSetUp ? (
          <Notice label="Not set up yet">
            The orders tables are not in this database yet, so no order can be recorded.
          </Notice>
        ) : (
          <Notice label="Problem" tone="problem">
            {loadFailure}
          </Notice>
        )}
      </div>
    );
  }

  return (
    <div className={SCREEN}>
      <ScreenHead
        title="Record an offline order"
        note="A sale made at the counter. It is saved as a guest order, and the stock of every size sold is reduced."
        actions={
          <Link href="/dashboard/orders" className={ACTION_QUIET}>
            <ArrowLeft size={15} strokeWidth={2} aria-hidden="true" />
            All orders
          </Link>
        }
      />

      <div className="flex flex-col gap-5">
        {products.length === 0 ? (
          <Notice label="Nothing can be sold from here yet" tone="problem">
            No product in the catalogue has a size recorded against it, and an order line must
            name one — the size is a required field on every line, not an optional detail. Add a
            size with its stock to at least one product first; this form fills itself the moment
            one exists.
          </Notice>
        ) : null}

        {/* Only when something IS sellable: with nothing sellable the notice above already
            says it, and saying it twice reads as two different problems. */}
        {catalogue && products.length > 0 && catalogue.withoutVariants.length > 0 ? (
          <Notice label="Some products cannot be sold from here">
            {catalogue.withoutVariants.length} of {products.length + catalogue.withoutVariants.length}{' '}
            products have no size recorded, so they cannot be put on a line: every line must name
            a size that exists. They are{' '}
            {catalogue.withoutVariants.map(product => product.name).join(', ')}. Recording a size
            and its stock against a product is what makes it sellable here.
          </Notice>
        ) : null}

        {shortfalls.length > 0 ? (
          <Notice label="Not enough stock, so nothing was saved" tone="problem">
            <span className="block">
              The whole order was refused rather than part of it. These lines ask for more than
              the shop has:
            </span>
            <span className="mt-1.5 block">
              {shortfalls.map(short => (
                <span key={short.productVariantId} className="block">
                  {short.label} — wanted {short.want}, in stock {short.have}
                </span>
              ))}
            </span>
          </Notice>
        ) : null}

        {problem ? (
          <Notice label="Problem" tone="problem">
            {problem}
          </Notice>
        ) : null}

        <section className={CARD}>
          <div className={CARD_HEAD}>
            <h2 className={SECTION_TITLE}>Customer</h2>
            <span className={badge('neutral')}>Saved as a guest</span>
          </div>
          <div className={CARD_BODY}>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field id="offline-name" label="Name" required error={nameError || undefined}>
                <TextInput
                  id="offline-name"
                  value={customerName}
                  invalid={Boolean(nameError)}
                  disabled={saving}
                  onChange={event => {
                    setNameError('');
                    setCustomerName(event.target.value);
                  }}
                />
              </Field>
              <Field id="offline-phone" label="Phone" hint="Optional.">
                <TextInput
                  id="offline-phone"
                  type="tel"
                  value={customerPhone}
                  disabled={saving}
                  onChange={event => setCustomerPhone(event.target.value)}
                />
              </Field>
              <Field id="offline-email" label="Email" hint="Optional.">
                <TextInput
                  id="offline-email"
                  type="email"
                  value={customerEmail}
                  disabled={saving}
                  onChange={event => setCustomerEmail(event.target.value)}
                />
              </Field>
            </div>

            <p className={cn(META, 'mt-4')}>
              A counter sale has no website account, so the name, phone and email are stored on
              the order itself and it is marked as a guest order.
            </p>
          </div>
        </section>

        <section className={CARD}>
          <div className={CARD_HEAD}>
            <h2 className={SECTION_TITLE}>Delivery address</h2>
            <p className={META}>Only if it is being delivered. Leave it empty for a carry-out.</p>
          </div>
          <div className={CARD_BODY}>
            <div className="grid gap-4 sm:grid-cols-2">
              {ADDRESS_FIELDS.map(field => (
                <Field key={field.key} id={`offline-${field.key}`} label={field.label}>
                  <TextInput
                    id={`offline-${field.key}`}
                    value={address[field.key] ?? ''}
                    placeholder={field.placeholder}
                    disabled={saving}
                    onChange={event =>
                      setAddress(current => ({ ...current, [field.key]: event.target.value }))
                    }
                  />
                </Field>
              ))}
            </div>
          </div>
        </section>

        <section className={CARD}>
          <div className={CARD_HEAD}>
            <h2 className={SECTION_TITLE}>Items</h2>
            <p className={META}>
              Only products with a size recorded can be sold. The price is the catalogue price
              and can be changed.
            </p>
          </div>

          <div className={CARD_BODY}>
            <div className="flex flex-col gap-4">
              {parsedLines.map((parsed, index) => {
                const { line, product, variant } = parsed;
                return (
                  <div
                    key={line.key}
                    className="rounded-md border border-[var(--ds-line)] bg-[var(--ds-surface-sunk)] p-3"
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className={LABEL}>Line {index + 1}</p>
                      {lines.length > 1 ? (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => setLines(current => current.filter(had => had.key !== line.key))}
                          className={ACTION_GRAVE}
                        >
                          <Trash2 size={14} strokeWidth={1.75} aria-hidden="true" />
                          Remove
                        </button>
                      ) : null}
                    </div>

                    <div className="grid gap-3 lg:grid-cols-[2fr_1fr_90px_120px]">
                      <Field id={`line-${line.key}-product`} label="Product" required>
                        <SelectInput
                          id={`line-${line.key}-product`}
                          value={line.productId}
                          disabled={saving || products.length === 0}
                          onChange={event => chooseProduct(line.key, event.target.value)}
                        >
                          <option value="">Choose a product</option>
                          {products.map(option => (
                            <option key={option.id} value={option.id}>
                              {option.name}
                            </option>
                          ))}
                        </SelectInput>
                      </Field>

                      <Field
                        id={`line-${line.key}-variant`}
                        label="Size"
                        required
                        hint={
                          product
                            ? undefined
                            : 'Choose a product first; the sizes are the ones recorded against it.'
                        }
                      >
                        <SelectInput
                          id={`line-${line.key}-variant`}
                          value={line.productVariantId}
                          disabled={saving || !product}
                          onChange={event => patchLine(line.key, { productVariantId: event.target.value })}
                        >
                          <option value="">Choose a size</option>
                          {(product?.variants ?? []).map(option => (
                            <option key={option.id} value={option.id}>
                              {option.size}
                              {option.color ? ` · ${option.color}` : ''} — {option.stock} in stock
                            </option>
                          ))}
                        </SelectInput>
                      </Field>

                      <Field
                        id={`line-${line.key}-quantity`}
                        label="Qty"
                        required
                        error={
                          parsed.overStock && variant
                            ? `Only ${variant.stock} in stock`
                            : undefined
                        }
                      >
                        <TextInput
                          id={`line-${line.key}-quantity`}
                          type="number"
                          min={1}
                          step={1}
                          value={line.quantity}
                          invalid={parsed.overStock}
                          disabled={saving}
                          onChange={event => patchLine(line.key, { quantity: event.target.value })}
                        />
                      </Field>

                      <Field id={`line-${line.key}-price`} label="Unit price">
                        <TextInput
                          id={`line-${line.key}-price`}
                          type="number"
                          min={0}
                          step="0.01"
                          value={line.price}
                          disabled={saving}
                          onChange={event => patchLine(line.key, { price: event.target.value })}
                        />
                      </Field>
                    </div>

                    <p className={cn(META, 'mt-2')}>
                      {parsed.quantity > 0 && parsed.price >= 0
                        ? `Line total ${rupees(parsed.quantity * parsed.price)}`
                        : 'A line needs a product, a size and a quantity of 1 or more.'}
                    </p>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              disabled={saving || products.length === 0}
              onClick={() => setLines(current => [...current, emptyLine()])}
              className={cn(ACTION_SOFT, 'mt-4')}
            >
              <Plus size={15} strokeWidth={2} aria-hidden="true" />
              Add another line
            </button>
          </div>

          <div className="flex flex-wrap items-baseline justify-between gap-4 border-t border-[var(--ds-line)] px-5 py-4">
            <p className={SECTION_TITLE}>Order total</p>
            <p className="text-[18px] font-semibold tabular-nums text-[var(--ds-ink)]">
              {rupees(subtotal)}
            </p>
            {/* Said plainly: there is no discount or delivery column on an order, so the lines
                are the total and the invoice will show no adjustment row. */}
            <p className={cn(META, 'w-full')}>
              The lines are the whole total: an order records no separate discount or delivery
              charge, so negotiate on the unit prices above.
            </p>
          </div>
        </section>

        <section className={CARD}>
          <div className={CARD_HEAD}>
            <h2 className={SECTION_TITLE}>How it stands</h2>
          </div>
          <div className={CARD_BODY}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="offline-status" label="Order status">
                <SelectInput
                  id="offline-status"
                  value={status}
                  disabled={saving}
                  onChange={event => setStatus(event.target.value)}
                >
                  {ORDER_STATUS_OPTIONS.map(option => (
                    <option key={option} value={option}>
                      {STATUS_LABEL[option]}
                    </option>
                  ))}
                </SelectInput>
              </Field>

              <Field
                id="offline-payment"
                label="Payment"
                hint="Marked paid records a payment of the order total against this sale."
              >
                <SelectInput
                  id="offline-payment"
                  value={paymentStatus}
                  disabled={saving}
                  onChange={event => setPaymentStatus(event.target.value)}
                >
                  {PAYMENT_STATUS_OPTIONS.map(option => (
                    <option key={option} value={option}>
                      {PAYMENT_LABEL[option]}
                    </option>
                  ))}
                </SelectInput>
              </Field>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[var(--ds-line)] pt-4">
              <button
                type="button"
                onClick={submit}
                disabled={saving || incomplete || anyOverStock || products.length === 0}
                className={ACTION}
              >
                {saving ? 'Recording' : 'Record the order'}
              </button>
              <Link href="/dashboard/orders" className={ACTION_QUIET}>
                Cancel
              </Link>
              <p className={cn(META, 'ml-auto')}>
                {incomplete
                  ? 'Every line needs a product, a size and a quantity.'
                  : anyOverStock
                    ? 'A line asks for more than is in stock.'
                    : 'Saving reduces the stock of each size sold.'}
              </p>
            </div>
          </div>
        </section>
      </div>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
