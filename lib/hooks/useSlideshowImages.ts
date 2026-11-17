'use client';

import { useEffect, useState } from 'react';

/**
 * The Atelier gallery's single request.
 *
 * `/api/slideshow` answers `{ images: string[] }` and Phase 2 reimplements it over the
 * database without changing that shape, so everything that depends on the shape lives here:
 * parsing, failure handling and logging. A section only ever receives `string[]`.
 */
export const SLIDESHOW_ENDPOINT = '/api/slideshow';

/**
 * A usable image source is a root-relative path or an absolute http(s) URL. Anything else
 * would make `next/image` throw while rendering, which blanks the whole page rather than
 * one gallery, so it is filtered out here instead.
 */
function isImageSource(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return (value.startsWith('/') && !value.startsWith('//')) || /^https?:\/\//i.test(value);
}

/**
 * The route answers `{ images: [] }` for an empty folder *and* for a failed `readdir`, and
 * `{ error }`-shaped bodies are possible from anything in front of it, so nothing here may
 * assume a shape. Anything that is not an array of sources reads as no images.
 */
export function readImages(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object') return [];
  const images = (payload as Record<string, unknown>).images;
  return Array.isArray(images) ? images.filter(isImageSource) : [];
}

/**
 * Every failure ends in the same empty gallery, but they are not the same failure, and a
 * storefront that silently drops a movement should say why. The retired slideshow logged
 * with `console.error`; that is kept, with the mode and the status when there is one.
 */
function logFailure(mode: string, detail?: unknown) {
  console.error(`[slideshow] ${mode}; the Atelier gallery will not render`, detail);
}

async function loadImages(): Promise<string[]> {
  let response: Response;
  try {
    response = await fetch(SLIDESHOW_ENDPOINT);
  } catch (error) {
    logFailure('request could not be made', error);
    return [];
  }

  if (!response.ok) {
    logFailure('request failed', { status: response.status });
    return [];
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    logFailure('response body was not JSON', error);
    return [];
  }

  const images = readImages(payload);
  if (images.length === 0) {
    const hasArray =
      !!payload &&
      typeof payload === 'object' &&
      Array.isArray((payload as Record<string, unknown>).images);
    if (hasArray && (payload as { images: unknown[] }).images.length === 0) {
      // The route also returns an empty list when it cannot read its folder, so an empty
      // gallery in production is worth a line even though it is a valid answer.
      console.warn('[slideshow] the endpoint returned no images; the Atelier gallery will not render');
    } else {
      logFailure('response carried no usable images', payload);
    }
  }
  return images;
}

export interface SlideshowState {
  /** `loading` until the request settles; `ready` even when it failed. */
  status: 'loading' | 'ready';
  images: string[];
}

export function useSlideshowImages(): SlideshowState {
  const [state, setState] = useState<SlideshowState>({ status: 'loading', images: [] });

  useEffect(() => {
    let active = true;

    loadImages().then(images => {
      if (active) setState({ status: 'ready', images });
    });

    return () => {
      active = false;
    };
  }, []);

  return state;
}
