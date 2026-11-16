import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Collection from './collection';
import { siteCopy } from '@/lib/content/site-copy';
import { formatPrice } from '@/lib/utils/price';
import type { Product } from '@/types';

/**
 * The live database holds two products, one of them with no photos at all, so the fixture
 * is that shape rather than a tidy four-up: a photo-less garment and a garment on sale.
 */
const products: Product[] = [
  {
    id: '002dc5ac',
    name: 'Midnight Silk Saree',
    price: 3500,
    sale: false,
    image: '/mocks/mock_mostRecommended_common.jpg',
    photos: [],
    category: 'Sarees',
  },
  {
    id: '713011fb',
    name: 'Test - Silk Saree 1',
    price: 10000,
    sale: true,
    salePrice: 6000,
    image: '/a.jpg',
    photos: ['/a.jpg', '/b.jpg'],
    category: 'Western',
  },
];

/** The three spotlight clips, pinned by URL: the only motion assets besides the hero's. */
const SPOTLIGHT = [
  'https://duwwgyobnpuqsqdromzj.supabase.co/storage/v1/object/public/product-images/sp01.webm',
  'https://duwwgyobnpuqsqdromzj.supabase.co/storage/v1/object/public/product-images/sp02.webm',
  'https://duwwgyobnpuqsqdromzj.supabase.co/storage/v1/object/public/product-images/sp03.webm',
];

function mockFetch(body: unknown, ok = true, status = 200) {
  const spy = vi.fn().mockResolvedValue({ ok, status, json: async () => body });
  vi.stubGlobal('fetch', spy);
  return spy;
}

const fallbackTiles = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('[data-tier="fallback"]'));

describe('Collection', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens the movement with the merged heading and lead, verbatim from siteCopy', async () => {
    mockFetch({ freshArrivals: products, shopByStyle: [] });
    render(<Collection />);

    expect(
      screen.getByRole('heading', { level: 2, name: siteCopy.home.explore.heading })
    ).toBeInTheDocument();
    expect(screen.getByText(siteCopy.home.explore.body)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: siteCopy.home.explore.cta })).toHaveAttribute(
      'href',
      siteCopy.home.explore.ctaHref
    );
    // One editorial sequence, so only one section heading where three rails used to shout.
    await waitFor(() => expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1));
  });

  it('renders real products when the API returns them', async () => {
    mockFetch({ freshArrivals: products, shopByStyle: [] });
    const { container } = render(<Collection />);

    await screen.findByRole('heading', { level: 3, name: products[0].name });
    for (const product of products) {
      expect(screen.getByRole('heading', { level: 3, name: product.name })).toBeInTheDocument();
    }
    expect(container.querySelectorAll('a[href^="/product/"]')).toHaveLength(2);
    expect(container.querySelector('a[href="/product/002dc5ac"]')).not.toBeNull();
    expect(container.querySelector('a[href="/product/713011fb"]')).not.toBeNull();

    // No fallback anywhere once real stock is on screen, and no mock garment image.
    expect(fallbackTiles(container)).toHaveLength(0);
    for (const entry of siteCopy.home.collection) {
      expect(screen.queryByText(entry.title)).toBeNull();
    }
    expect(container.innerHTML).not.toContain('%2Fcollection%2F');
  });

  it('opens on a photographed garment, never on an empty frame', async () => {
    // The live catalogue's newest product has no photos at all, so the first slot — the
    // widest one in the sequence — must not be an empty frame while a photographed garment
    // is available. Nothing is dropped; the photo-less garment simply follows.
    mockFetch({ freshArrivals: products, shopByStyle: [] });
    render(<Collection />);

    await screen.findByRole('heading', { level: 3, name: products[0].name });
    expect(screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent)).toEqual([
      'Test - Silk Saree 1',
      'Midnight Silk Saree',
    ]);
  });

  it('prices real products through resolvePrice and keeps the photo-less frame honest', async () => {
    mockFetch({ freshArrivals: products, shopByStyle: [] });
    const { container } = render(<Collection />);

    await screen.findByRole('heading', { level: 3, name: products[1].name });
    // sale true, 6000 < 10000: the sale price shows, the regular one is struck through.
    expect(screen.getByText(formatPrice(6000))).toBeInTheDocument();
    expect(container.querySelector('s')?.textContent).toContain(formatPrice(10000));
    // The photo-less product gets a labelled frame, never the stock mock garment.
    expect(screen.getByText(/image coming soon/i)).toBeInTheDocument();
    expect(container.innerHTML).not.toContain('mock_mostRecommended_common');
  });

  it('falls back to the placeholder tier, dimmed and non-clickable, when the API returns empty arrays', async () => {
    mockFetch({ freshArrivals: [], shopByStyle: [] });
    const { container } = render(<Collection />);

    await screen.findByRole('heading', { level: 3, name: siteCopy.home.collection[0].title });
    const tiles = fallbackTiles(container);
    expect(tiles).toHaveLength(siteCopy.home.collection.length);

    for (const tile of tiles) {
      // Dimmed, never a link, never priced as if purchasable.
      expect(tile.className).toMatch(/\bopacity-70\b/);
      expect(tile.querySelectorAll('a')).toHaveLength(0);
      expect(tile.textContent ?? '').not.toMatch(/₹|Rs\.|Add to Cart/);
    }
    expect(container.querySelector('a[href^="/product/"]')).toBeNull();
  });

  it('renders the four named collection entries verbatim', async () => {
    expect(siteCopy.home.collection).toHaveLength(4);
    mockFetch({ freshArrivals: [], shopByStyle: [] });
    render(<Collection />);

    await screen.findByRole('heading', { level: 3, name: siteCopy.home.collection[0].title });
    for (const entry of siteCopy.home.collection) {
      expect(screen.getByRole('heading', { level: 3, name: entry.title })).toBeInTheDocument();
      expect(screen.getByText(entry.description)).toBeInTheDocument();
    }
    expect(siteCopy.home.collection.map(e => e.title)).toEqual([
      'Haldi & Kumkum Dress',
      'The Rajwadi Brocade',
      'Neelam Frill Lehenga',
      'The Royal Cascade Lehenga',
    ]);
  });

  it.each([
    ['an empty object', {}, true, 200],
    ['an error payload with a 500', { error: 'Failed to fetch homepage sections' }, false, 500],
    ['a 500 with no body at all', null, false, 500],
    ['sections that are not arrays', { freshArrivals: null, shopByStyle: 'nope' }, true, 200],
  ])('falls back when the API returns %s, and never throws', async (_label, body, ok, status) => {
    mockFetch(body, ok as boolean, status as number);

    let container!: HTMLElement;
    expect(() => {
      container = render(<Collection />).container;
    }).not.toThrow();

    await screen.findByRole('heading', { level: 3, name: siteCopy.home.collection[0].title });
    expect(fallbackTiles(container)).toHaveLength(siteCopy.home.collection.length);
  });

  it('falls back when the fetch promise rejects, and never throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    let container!: HTMLElement;
    expect(() => {
      container = render(<Collection />).container;
    }).not.toThrow();

    await screen.findByRole('heading', { level: 3, name: siteCopy.home.collection[0].title });
    expect(fallbackTiles(container)).toHaveLength(siteCopy.home.collection.length);
  });

  it('falls back when the response body is not JSON at all, and never throws', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError('Unexpected token < in JSON');
        },
      })
    );

    const { container } = render(<Collection />);
    await screen.findByRole('heading', { level: 3, name: siteCopy.home.collection[0].title });
    expect(fallbackTiles(container)).toHaveLength(siteCopy.home.collection.length);
  });

  it('absorbs the spotlight footage as part of the sequence', async () => {
    mockFetch({ freshArrivals: products, shopByStyle: [] });
    const { container } = render(<Collection />);

    await screen.findByRole('heading', { level: 3, name: products[0].name });
    const videos = Array.from(container.querySelectorAll('video'));
    expect(videos).toHaveLength(3);
    expect(videos.map(v => v.getAttribute('src'))).toEqual(SPOTLIGHT);

    for (const video of videos) {
      expect(video.muted).toBe(true);
      expect(video).toHaveAttribute('loop');
      expect(video).toHaveAttribute('autoplay');
      expect(video).toHaveAttribute('playsinline');
      // Decorative: no accessible content, out of the tab order.
      expect(video).toHaveAttribute('aria-hidden', 'true');
      expect(video).toHaveAttribute('tabindex', '-1');
    }
    // A third of a phone viewport crops a 9:16 clip to a sliver, so the band is the lead
    // clip on a phone and the full triptych from md up. No source is dropped.
    expect(videos[0].className).not.toMatch(/\bhidden\b/);
    expect(videos[1].className).toMatch(/\bhidden\b/);
    expect(videos[1].className).toMatch(/md:block/);
    expect(videos[2].className).toMatch(/\bhidden\b/);
  });

  it('keeps the spotlight interlude on screen in the fallback state too', async () => {
    mockFetch({ freshArrivals: [], shopByStyle: [] });
    const { container } = render(<Collection />);

    await screen.findByRole('heading', { level: 3, name: siteCopy.home.collection[0].title });
    expect(container.querySelectorAll('video')).toHaveLength(3);
  });

  it('asks the homepage-sections endpoint exactly once', async () => {
    const spy = mockFetch({ freshArrivals: products, shopByStyle: [] });
    render(<Collection />);

    await screen.findByRole('heading', { level: 3, name: products[0].name });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toBe('/api/homepage-sections');
  });

  it('stays on the editorial grid and uses no banned utility', async () => {
    mockFetch({ freshArrivals: products, shopByStyle: [] });
    const { container } = render(<Collection />);

    await screen.findByRole('heading', { level: 3, name: products[0].name });
    const section = container.querySelector('section');
    expect(section?.className).toMatch(/section-rhythm/);
    expect(section?.className).toMatch(/bg-paper/);
    expect(container.querySelectorAll('.grid-editorial').length).toBeGreaterThan(0);
    expect(container.innerHTML).not.toMatch(
      /rounded-full|rounded-3xl|gradient|shadow|(?:text|bg)-gray-/
    );
    // Next 16 throws when an image is given both; ProductTile maps priority to preload.
    expect(container.querySelector('img[priority]')).toBeNull();
  });
});
