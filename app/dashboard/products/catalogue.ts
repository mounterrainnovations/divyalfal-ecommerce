import { CATEGORY_MAPPING } from '@/lib/utils/product-utils';
import type { Product, ProductCategory, ProductType } from '@/types';

/**
 * The Products screen's decisions, away from its markup: what the query is, what the header
 * says, and which view the admin last chose.
 *
 * These are the parts that are expensive to get wrong and invisible when they are — a filter
 * that quietly stops being sent, a header that claims the catalogue holds fifteen products
 * when six of them are archived and hidden — so they are plain functions with tests beside
 * them rather than expressions inside a 600-line component.
 */

/**
 * A product as the admin catalogue sees it: the shared shape, plus whether the shop has taken
 * it down.
 *
 * `isArchived` is optional because `Product` (in `types/index.ts`, which this change may not
 * edit) has never carried it and `GET /api/products` attaches it beside the transformed row.
 * Optional and read through `isArchived === true` everywhere, so an older response — or any
 * other caller of the same endpoint — reads as live rather than as undefined-and-therefore-odd.
 */
export interface AdminProduct extends Product {
  isArchived?: boolean;
}

/* ---------------------------------------------------------------------------------------- */
/* The view toggle                                                                           */
/* ---------------------------------------------------------------------------------------- */

export type View = 'table' | 'grid';

/**
 * Where the chosen view is remembered, and the default when it is not.
 *
 * TABLE IS THE DEFAULT. The table is the screen's working form — it shows price, category,
 * photograph count and status for twenty products at once — and the grid is for the times an
 * admin is looking for a garment by eye. A first visit should land on the one that answers
 * more questions.
 */
const VIEW_KEY = 'divyafal.admin.products.view';
export const DEFAULT_VIEW: View = 'table';

/**
 * The view this session is on when `localStorage` refused the write.
 *
 * Without it, a blocked store would not merely forget the preference between visits — the
 * toggle would not work at all, because every render would read the default back out of a
 * store that never took the value. So storage is the source of truth when it works and this
 * holds the session when it does not.
 */
let fallback: View | null = null;

/**
 * Read the remembered view.
 *
 * EVERY ACCESS IS WRAPPED, and not out of superstition: `localStorage` is a *getter* that
 * throws, not merely returns null, in a Chrome private window and wherever site data is
 * blocked by policy — and this screen renders inside the shop owner's browser, which is not a
 * browser anyone here has seen. It is also absent outright on the server, where Next renders
 * this client component first. A remembered preference is not worth a blank screen, so a
 * failure is the default view and nothing else.
 *
 * Anything other than the two known values is the default: a key edited by hand, or left
 * behind by a future version of this screen, must not render as a third kind of view.
 */
export function readView(): View {
  try {
    const stored = localStorage.getItem(VIEW_KEY);
    if (stored === 'grid' || stored === 'table') return stored;
  } catch {
    /* Private window, site data blocked, or the server. Fall through to what we know. */
  }
  return fallback ?? DEFAULT_VIEW;
}

const listeners = new Set<() => void>();

/**
 * Subscribe to the stored view, for `useSyncExternalStore`.
 *
 * WHY A STORE AND NOT `useState` PLUS AN EFFECT. The preference lives outside React — in the
 * browser's storage — and the screen is server-rendered before it can be read, so the obvious
 * `useState(DEFAULT_VIEW)` with a mount effect that adopts the stored value means a render
 * that is immediately thrown away, which is the cascading-render pattern React now warns
 * about. `useSyncExternalStore` is the shape built for exactly this: the server snapshot is
 * the default, the client snapshot is what storage says, and React reconciles the two itself.
 */
export function subscribeToView(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Remember the view. A failure to store is silent: the screen still works, it just forgets. */
export function storeView(view: View): void {
  try {
    localStorage.setItem(VIEW_KEY, view);
    fallback = null;
  } catch {
    fallback = view;
  }
  for (const listener of listeners) listener();
}

/** The server has no storage, so it renders the default and lets the browser correct it. */
export function serverView(): View {
  return DEFAULT_VIEW;
}

/* ---------------------------------------------------------------------------------------- */
/* The filters                                                                               */
/* ---------------------------------------------------------------------------------------- */

/** Which half of the catalogue to list. The same three words the API's `?archived=` takes. */
export type ArchivedFilter = 'live' | 'archived' | 'all';

export const ARCHIVED_FILTERS: { value: ArchivedFilter; label: string }[] = [
  { value: 'live', label: 'Live products' },
  { value: 'archived', label: 'Archived only' },
  { value: 'all', label: 'Live and archived' },
];

/**
 * The seven categories as a select's options: the database enum as the value, the shop's own
 * word as the label.
 *
 * Derived from `CATEGORY_MAPPING` rather than listed again, so a category added to the schema
 * cannot be missing from this filter — the one failure mode of a hand-written copy, and the
 * one where an admin concludes a garment has vanished from the catalogue.
 */
export const CATEGORY_OPTIONS: { value: ProductType; label: ProductCategory }[] = (
  Object.entries(CATEGORY_MAPPING) as [ProductCategory, ProductType][]
).map(([label, value]) => ({ value, label }));

export interface Query {
  page: number;
  perPage: number;
  /** One of the `SORTS` entries, already resolved to the API's two parameters. */
  sortBy: string;
  order: string;
  search: string;
  /** The database enum, or '' for every category. */
  category: string;
  archived: ArchivedFilter;
}

/**
 * The query string for `GET /api/products`.
 *
 * Empty filters are **omitted rather than sent empty**: `?search=` and `?category=` are both
 * parsed as "no constraint" by the endpoint, but an absent parameter is the same request the
 * storefront makes, which keeps one shape of URL in the network tab and one in the logs.
 *
 * `counts=1` is always on for this screen — it is what lets the header say how much of the
 * catalogue is being hidden — and is the only caller that asks for it.
 */
export function buildProductQuery(query: Query): string {
  const params = new URLSearchParams({
    page: String(query.page),
    limit: String(query.perPage),
    sortBy: query.sortBy,
    order: query.order,
    archived: query.archived,
    counts: '1',
  });
  if (query.search) params.set('search', query.search);
  if (query.category) params.set('category', query.category);
  return params.toString();
}

/* ---------------------------------------------------------------------------------------- */
/* The header line                                                                           */
/* ---------------------------------------------------------------------------------------- */

/** How the catalogue splits across the archive, under the search and category in force. */
export interface Counts {
  live: number;
  archived: number;
}

const products = (count: number) => `${count} ${count === 1 ? 'product' : 'products'}`;

/**
 * "8 of 15 products · 6 archived not shown" — what is on screen, and what is not.
 *
 * WHY THIS SENTENCE EXISTS AT ALL. Until now the screen listed archived products silently
 * among the live ones, and the fix for that — hide them by default — introduces a worse
 * failure if it is not said out loud: an admin who archived six garments last month opens the
 * catalogue, counts eight, and concludes the shop has lost six products. A filter that hides
 * things has to admit how many.
 *
 * `counts` is absent when the endpoint could not produce it (it is counted in a `try` of its
 * own, because the list matters more than the arithmetic). The sentence then says only what it
 * knows, which is how many rows it is showing.
 *
 * `filtered` is true while a search or a category is in force, and changes "products" to
 * "matching products": with a search on, the larger number is not the catalogue but the
 * matches, and letting it read as the catalogue would be the same lie in a different place.
 */
export function describeShown({
  shown,
  counts,
  archived,
  filtered = false,
}: {
  /** Rows the current query matched — the API's `total`, not the length of this page. */
  shown: number;
  counts?: Counts;
  archived: ArchivedFilter;
  filtered?: boolean;
}): string {
  const noun = filtered ? 'matching products' : 'products';

  if (!counts) {
    return archived === 'archived' ? `${products(shown)}, archived` : products(shown);
  }

  const all = counts.live + counts.archived;

  if (archived === 'live') {
    const head = `${shown} of ${all} ${noun}`;
    return counts.archived > 0 ? `${head} · ${counts.archived} archived not shown` : head;
  }

  if (archived === 'archived') {
    const head = `${products(shown)}, archived`;
    return counts.live > 0 ? `${head} · ${counts.live} live not shown` : head;
  }

  const head = `${products(shown)}, live and archived`;
  return counts.archived > 0 ? `${head} · ${counts.archived} archived` : head;
}
