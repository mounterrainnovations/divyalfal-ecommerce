/**
 * The category band.
 *
 * Most of what changed here is spacing, which jsdom cannot measure. What it *can* hold are the
 * two things the band must not lose while the spacing is being argued about: the `sizes` hint
 * that stops a 144px circle requesting a 3840px render, and the fact that a tile links by its
 * display name, which is the filter value `/products` reads.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import Categories from './categories';
import { DEFAULT_CATEGORY_TILES } from '@/lib/content/showcase';

function answer(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  // Nothing stored: the hook keeps its defaults, which are what the live site shows.
  vi.stubGlobal('fetch', vi.fn(async () => answer({})));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Categories', () => {
  it('links each tile by its display name, which is the filter value', () => {
    render(<Categories />);
    for (const tile of DEFAULT_CATEGORY_TILES) {
      expect(screen.getByRole('link', { name: tile.name })).toHaveAttribute(
        'href',
        `/products?categories=${encodeURIComponent(tile.name)}`
      );
    }
  });

  it('tells next/image how small the circles really are', () => {
    const { container } = render(<Categories />);
    const images = Array.from(container.querySelectorAll('img'));
    expect(images).toHaveLength(DEFAULT_CATEGORY_TILES.length);
    for (const image of images) {
      expect(image.getAttribute('sizes')).toBe('(max-width: 640px) 88px, 144px');
    }
  });

  it('drops the tiles the owner has hidden', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        answer({
          categories: DEFAULT_CATEGORY_TILES.map(tile => ({
            ...tile,
            visible: tile.name !== 'Western',
          })),
        })
      )
    );
    render(<Categories />);
    await waitFor(() =>
      expect(screen.queryByRole('link', { name: 'Western' })).not.toBeInTheDocument()
    );
    expect(screen.getByRole('link', { name: 'Sarees' })).toBeInTheDocument();
  });
});
