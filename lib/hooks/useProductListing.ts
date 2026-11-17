'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Product } from '@/types';

/**
 * The listing pages' data layer: `/products` and `/sale` both read `/api/products`.
 *
 * **The request shape is a contract and is deliberately frozen.** The homepage's category
 * movement links to `/products?categories=<encodeURIComponent(display name)>` and a test
 * pins that, so the parameter names below are the ones the route has always read:
 *
 *   `search`, `categories` (plural, comma-joined display names), `minPrice`, `maxPrice`,
 *   `sortBy` (omitted when it is `default`), `limit`
 *
 * appended in that order through `URLSearchParams`, which is why a display name with a space
 * reaches the API as `Kurta+Pant` while the homepage link spells it `Kurta%20Pant`.
 */
export const PRODUCTS_ENDPOINT = '/api/products';

/** The page size both listings have always asked for; there is no pager. */
export const LISTING_LIMIT = '50';

const SEARCH_DEBOUNCE_MS = 300;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1_000;

export interface ProductsQuery {
  search?: string;
  /** Display names ("Sarees", "Indo-Western", "Kurta Pant"), not slugs. */
  categories?: string[];
  priceRange?: { min: number; max: number } | null;
  /** `default` (or absent) sends no `sortBy` at all. */
  sortBy?: string;
}

/** The query string for `/api/products`. Pure, so a test can pin it byte for byte. */
export function buildProductsQuery(query: ProductsQuery): string {
  const params = new URLSearchParams();
  if (query.search) params.append('search', query.search);
  if (query.categories && query.categories.length > 0) {
    params.append('categories', query.categories.join(','));
  }
  if (query.priceRange) {
    params.append('minPrice', query.priceRange.min.toString());
    params.append('maxPrice', query.priceRange.max.toString());
  }
  if (query.sortBy && query.sortBy !== 'default') params.append('sortBy', query.sortBy);
  params.append('limit', LISTING_LIMIT);
  return params.toString();
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    // A stray "%" in a hand-typed URL: keep the text as typed rather than throwing.
    return value;
  }
}

/**
 * Reads the `categories` parameter the way the page always has: comma-separated, each entry
 * trimmed and decoded. `URLSearchParams.get` has already decoded once, so the second decode
 * is the legacy behaviour, kept because it is harmless for every real category name.
 * Empty entries (`a,,b`) are dropped; the route ignores them anyway.
 */
export function parseCategoriesParam(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map(entry => safeDecode(entry.trim()))
    .filter(Boolean);
}

/**
 * The value, trailing the input by `delay` ms: typing is immediate, the request is not.
 * Returns `[debounced, flush]`; `flush(next)` applies a value at once (the pending timer is
 * dropped by the value change), for a reset that must not wait out the delay.
 */
export function useDebouncedValue<T>(value: T, delay = SEARCH_DEBOUNCE_MS) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return [debounced, setDebounced] as const;
}

interface Settled {
  key: string;
  products: Product[];
  error: string | null;
}

class RequestFailed extends Error {
  constructor(
    message: string,
    readonly retryable: boolean
  ) {
    super(message);
  }
}

interface Cancellation {
  cancelled: boolean;
  /** Aborts whichever request is in flight; set per attempt. */
  abort?: () => void;
}

function wait(ms: number, signal: Cancellation): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms)).then(() => {
    if (signal.cancelled) throw new DOMException('cancelled', 'AbortError');
  });
}

async function fetchProducts(queryString: string, outer: Cancellation): Promise<Product[]> {
  for (let attempt = 0; ; attempt++) {
    const controller = new AbortController();
    outer.abort = () => controller.abort();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`${PRODUCTS_ENDPOINT}?${queryString}`, {
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new RequestFailed(
          `Failed to fetch products: ${response.statusText}`,
          response.status === 500
        );
      }
      const data: unknown = await response.json();
      const products = (data as { products?: unknown } | null)?.products;
      return Array.isArray(products) ? (products as Product[]) : [];
    } catch (error) {
      if (outer.cancelled) throw error;
      // A 500 and a dropped connection (fetch rejects with a TypeError) are retried twice;
      // a timeout or any other status is final.
      const retryable =
        (error instanceof RequestFailed && error.retryable) || error instanceof TypeError;
      if (!retryable || attempt >= MAX_RETRIES) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw new Error('The request timed out');
        }
        throw error;
      }
      await wait(RETRY_DELAY_MS, outer);
    } finally {
      clearTimeout(timeout);
    }
  }
}

/**
 * Fetches `/api/products` for a query and reports `loading`, `error` and `products`.
 *
 * `loading` is *derived* — it is true whenever the last settled result belongs to a different
 * query — so it is already true on the very first render. Server markup therefore says
 * "loading" and the browser agrees, instead of the server printing an empty catalogue that
 * the first effect then contradicts. Superseded requests are aborted and never write.
 *
 * While a *new* query loads, `products` and `error` keep showing the last settled answer, so
 * a page that had results does not collapse to a skeleton and lose the visitor's scroll
 * position. `initialLoad` is true only when there is nothing worth keeping on screen (the
 * first load, a retry, or a refetch after a failure), which is when a skeleton is right.
 */
export function useProductListing(query: ProductsQuery) {
  const queryString = buildProductsQuery(query);
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<Settled | null>(null);
  const key = `${attempt}:${queryString}`;

  useEffect(() => {
    const state: Cancellation = { cancelled: false };
    fetchProducts(queryString, state).then(
      products => {
        if (!state.cancelled) setSettled({ key, products, error: null });
      },
      (error: unknown) => {
        if (state.cancelled) return;
        console.error('[products] fetch failed', error);
        setSettled({
          key,
          products: [],
          error: error instanceof Error ? error.message : 'Failed to fetch products',
        });
      }
    );
    return () => {
      state.cancelled = true;
      state.abort?.();
    };
  }, [queryString, key]);

  const retry = useCallback(() => {
    setSettled(null);
    setAttempt(n => n + 1);
  }, []);

  const current = settled?.key === key ? settled : null;
  const shown = current ?? settled;

  return {
    loading: current === null,
    initialLoad: shown === null || (current === null && shown.error !== null),
    error: shown?.error ?? null,
    products: shown?.products ?? [],
    retry,
  };
}
