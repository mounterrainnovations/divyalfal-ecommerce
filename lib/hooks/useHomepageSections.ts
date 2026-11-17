'use client';

import { useEffect, useState } from 'react';
import type { Product } from '@/types';

/**
 * The homepage's single products request.
 *
 * `/api/homepage-sections` answers every homepage section in one response. Before the
 * revamp three rails each fetched it independently — and two of them rendered the same
 * query twice. This module is the one caller: the promise is cached at module scope so that
 * every section mounting in the same paint shares a single `GET`, and the cache is released
 * when the last consumer unmounts, which keeps a remounted page (and each test) honest.
 *
 * It is a data layer, not a component concern: parsing, failure handling and the shared
 * cache live here so a section only ever receives `Product[]`.
 */
export const HOMEPAGE_SECTIONS_ENDPOINT = '/api/homepage-sections';

export interface HomepageSections {
  /** Movement 3's real stock. */
  freshArrivals: Product[];
  /** Movement 4's real stock — at most one product per category. */
  shopByStyle: Product[];
}

const NO_SECTIONS: HomepageSections = { freshArrivals: [], shopByStyle: [] };

/**
 * Every section this endpoint feeds is optional and may be absent, null, an error payload
 * or an outright 500 (the route returns `{ error }` whenever `DATABASE_URL` is missing), so
 * nothing here may assume a shape. Anything that is not an array of products reads as no
 * products, which is the same state as low inventory — one branch, four failure modes.
 */
export function readSections(payload: unknown): HomepageSections {
  if (!payload || typeof payload !== 'object') return NO_SECTIONS;
  const record = payload as Record<string, unknown>;
  return {
    freshArrivals: readProducts(record.freshArrivals),
    shopByStyle: readProducts(record.shopByStyle),
  };
}

function readProducts(value: unknown): Product[] {
  if (!Array.isArray(value)) return [];
  const products: Product[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue;
    const record = raw as Record<string, unknown>;
    if (typeof record.id !== 'string' || typeof record.name !== 'string') continue;
    const price = Number(record.price);
    const salePrice = Number(record.salePrice);
    products.push({
      id: record.id,
      name: record.name,
      price: Number.isFinite(price) ? price : 0,
      sale: record.sale === true,
      // `resolvePrice` rejects a zero or absent sale price on its own; both arrive here as
      // a non-finite number or a zero, so neither can render as a free garment.
      salePrice: Number.isFinite(salePrice) ? salePrice : undefined,
      image: typeof record.image === 'string' ? record.image : '',
      photos: Array.isArray(record.photos)
        ? record.photos.filter((photo): photo is string => typeof photo === 'string')
        : [],
      category: typeof record.category === 'string' ? record.category : '',
    });
  }
  return products;
}

/**
 * Every failure ends in the same empty sections, but they are not the same failure, and a
 * storefront showing its placeholder tier should say which one it hit. The retired rails
 * logged with `console.error`; that is kept, with the mode and the status when there is one,
 * so a 500 from a missing `DATABASE_URL` is distinguishable from a dropped connection or a
 * sections payload that arrived in the wrong shape.
 */
function logFailure(mode: string, detail?: unknown) {
  console.error(`[homepage-sections] ${mode}; falling back to the placeholder tier`, detail);
}

/** True when the payload carries at least one section as an array, however empty. */
function hasSectionArrays(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;
  const record = payload as Record<string, unknown>;
  return Array.isArray(record.freshArrivals) || Array.isArray(record.shopByStyle);
}

let pending: Promise<HomepageSections> | null = null;
let consumers = 0;

function loadSections(): Promise<HomepageSections> {
  pending ??= fetch(HOMEPAGE_SECTIONS_ENDPOINT)
    .then(response => {
      if (!response.ok) {
        logFailure('request failed', { status: response.status });
        return null;
      }
      return response.json().catch(error => {
        logFailure('response body was not JSON', error);
        return null;
      });
    })
    .catch(error => {
      logFailure('request could not be made', error);
      return null;
    })
    .then(payload => {
      // A 200 carrying `{ error }`, `{}` or sections in the wrong shape renders the same
      // tier as a genuinely empty catalogue but is not the same thing, so say which it was.
      // An empty *array* is low inventory, which is a normal state and not logged.
      if (payload && !hasSectionArrays(payload)) {
        logFailure('response carried no product sections', payload);
      }
      return readSections(payload);
    });
  return pending;
}

export interface HomepageSectionsState {
  /** `loading` until the request settles; `ready` even when it failed. */
  status: 'loading' | 'ready';
  sections: HomepageSections;
}

export function useHomepageSections(): HomepageSectionsState {
  const [state, setState] = useState<HomepageSectionsState>({
    status: 'loading',
    sections: NO_SECTIONS,
  });

  useEffect(() => {
    let active = true;
    consumers += 1;

    loadSections().then(sections => {
      if (active) setState({ status: 'ready', sections });
    });

    return () => {
      active = false;
      consumers -= 1;
      if (consumers <= 0) {
        consumers = 0;
        pending = null;
      }
    };
  }, []);

  return state;
}
