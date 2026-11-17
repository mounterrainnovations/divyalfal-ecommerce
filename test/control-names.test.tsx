import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(''),
}));

import Home from '@/app/page';

const SLIDESHOW = ['/slideshow/a.jpg', '/slideshow/b.jpg', '/slideshow/c.jpg'];

/**
 * One stub for the homepage's two requests. `/api/homepage-sections` feeds Movements 3 and 4;
 * `/api/slideshow` feeds the gallery, which needs more than one frame before it draws its
 * controls at all.
 */
function stubFetch() {
  const spy = vi.fn((input: unknown) => {
    const url = String(input);
    const body = url.includes('slideshow')
      ? { images: SLIDESHOW }
      : { freshArrivals: [], shopByStyle: [] };
    return Promise.resolve({ ok: true, status: 200, json: async () => body });
  });
  vi.stubGlobal('fetch', spy);
  return spy;
}

/**
 * The accessible name of a control, as these controls compute it: an explicit `aria-label`,
 * then `aria-labelledby`, then the element's own text with `aria-hidden` descendants removed.
 * Deliberately hand-rolled rather than pulled from `dom-accessibility-api` (a transitive
 * dependency of `@testing-library/dom`, not one this project declares): every control on the
 * homepage is a plain text button or a text link, so this covers all of them, and the test
 * stays free of a package the project does not own.
 */
function accessibleName(node: Element): string {
  const label = node.getAttribute('aria-label');
  if (label) return label.trim();

  const labelledBy = node.getAttribute('aria-labelledby');
  if (labelledBy) {
    return labelledBy
      .split(/\s+/)
      .map(id => node.ownerDocument.getElementById(id)?.textContent ?? '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const clone = node.cloneNode(true) as Element;
  for (const hidden of Array.from(clone.querySelectorAll('[aria-hidden="true"]'))) {
    hidden.remove();
  }
  return (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
}

const controls = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('a[href], button, [role="button"]'));

/**
 * Two controls on one page may not share a name.
 *
 * A screen-reader user does not read the homepage top to bottom to find a control; they list
 * the page's buttons and links and pick one. The Atelier gallery and the In Her Words quotes
 * both carried a pair named exactly "Previous" / "Next", so that list held four controls with
 * two names between them and no way to tell which pair moved the photographs and which moved
 * the quotes. WCAG 2.4.6 (Headings and Labels, AA) wants a label that describes its purpose;
 * two identical labels for different purposes is the failure.
 *
 * These labels are chrome, not brand voice — they are not in `siteCopy` and must not be — so
 * they are inline strings, named for what they move.
 */
describe('the homepage names every control distinctly', () => {
  beforeEach(() => {
    // jsdom ships no matchMedia, and the spotlight band subscribes to one.
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    // Collection's spotlight band drives playback through a ref; jsdom implements neither.
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    // The data hooks log their failure mode; nothing here fails, but keep output clean.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('gives no two controls the same accessible name', async () => {
    stubFetch();
    const { container } = render(<Home />);

    // Wait for both bands to settle, so the gallery's controls are in the DOM.
    await waitFor(() => expect(container.querySelector('img[src*="slideshow"]')).not.toBeNull());

    const named = controls(container)
      .map(accessibleName)
      .filter(name => name.length > 0);

    expect(named.length).toBeGreaterThan(10);

    const seen = new Map<string, number>();
    for (const name of named) seen.set(name, (seen.get(name) ?? 0) + 1);
    const duplicated = [...seen.entries()].filter(([, count]) => count > 1).map(([name]) => name);
    expect(duplicated).toEqual([]);
  });

  it('names the gallery controls for frames and the quote controls for quotes', async () => {
    stubFetch();
    const { container } = render(<Home />);
    await waitFor(() => expect(container.querySelector('img[src*="slideshow"]')).not.toBeNull());

    for (const name of ['Previous frame', 'Next frame', 'Previous quote', 'Next quote']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
    // The bare pair is gone from both places.
    expect(screen.queryByRole('button', { name: 'Previous' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
  });
});
