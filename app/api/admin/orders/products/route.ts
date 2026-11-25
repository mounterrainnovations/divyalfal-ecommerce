import { NextResponse } from 'next/server';
import { requireAdmin, unauthorizedResponse } from '@/lib/auth-guard';
import { isMissingTable, notSetUpResponse } from '@/lib/admin/not-set-up';
import { listSellableProducts } from '@/lib/repositories/orders';

/**
 * GET /api/admin/orders/products -> `{ products, withoutVariants }`
 *
 * What the offline order form is allowed to offer, and what it must explain it cannot.
 * `products` are the ones with at least one `ProductVariant` — the only lines that can satisfy
 * `OrderItem.productVariantId`, which is a required foreign key — each with its sizes and the
 * stock against each. `withoutVariants` is the rest, by name, so the form can say which
 * garments need a size recorded before they can be sold at the counter.
 *
 * WHY IT LIVES UNDER `orders/` AND NOT `products/`. It is the Orders module's view of the
 * catalogue: it answers "what can I put on a line", which is a question about `OrderItem`'s
 * constraints and not about the catalogue screen. `/api/products` already serves the
 * catalogue, knows nothing about variants, and is the storefront's endpoint as well as the
 * admin's — widening it for this would make every shop page carry stock figures.
 *
 * A note on routing: this path sits beside `[id]`, and Next matches the static segment first,
 * so `products` is not readable as an order id. Order ids are uuids, so nothing is shadowed.
 */
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
  } catch {
    return unauthorizedResponse();
  }

  try {
    return NextResponse.json(await listSellableProducts());
  } catch (error) {
    if (isMissingTable(error)) return notSetUpResponse();
    console.error('[API] GET /api/admin/orders/products failed', error);
    return NextResponse.json({ error: 'Failed to load the catalogue' }, { status: 500 });
  }
}
