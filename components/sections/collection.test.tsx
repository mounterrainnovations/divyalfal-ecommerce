import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import Collection from './collection';
import { siteCopy } from '@/lib/content/site-copy';
import { formatPrice } from '@/lib/utils/price';
import type { Product } from '@/types';

/**
 * The spotlight band decides in JavaScript how many clips to render, because a CSS `hidden`
 * would still have downloaded them (`autoplay` overrides `preload="none"`). So the hook is
 * mocked rather than stubbed through `window.matchMedia`: that pins *which* queries the band
 * asks for, not just what it does with the answer.
 */
const useMedia = vi.hoisted(() => vi.fn<(query: string) => boolean>());
vi.mock('@/lib/hooks/useMedia', () => ({ useMedia }));

const DESKTOP = '(min-width: 768px)';
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

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

/**
 * A live `window.matchMedia`: `matches` is read through a getter, and `set` notifies the
 * listeners, so a test can resolve or flip a query the way a browser does. The band reads
 * the reduced-motion query here rather than through `useMedia`, because the answer has to be
 * read at the moment playback would start, not at the moment the component rendered.
 */
function stubMatchMedia(initial: Record<string, boolean> = {}) {
  const matches: Record<string, boolean> = { ...initial };
  const listeners = new Map<string, Set<() => void>>();

  vi.stubGlobal('matchMedia', (query: string) => ({
    media: query,
    get matches() {
      return matches[query] ?? false;
    },
    addEventListener: (_event: string, listener: () => void) => {
      if (!listeners.has(query)) listeners.set(query, new Set());
      listeners.get(query)!.add(listener);
    },
    removeEventListener: (_event: string, listener: () => void) => {
      listeners.get(query)?.delete(listener);
    },
  }));

  return {
    set(query: string, value: boolean) {
      matches[query] = value;
      for (const listener of listeners.get(query) ?? []) listener();
    },
  };
}

let media: ReturnType<typeof stubMatchMedia>;
let play: ReturnType<typeof vi.spyOn>;
let pause: ReturnType<typeof vi.spyOn>;

describe('Collection', () => {
  beforeEach(() => {
    // Desktop width, motion allowed, unless a test says otherwise.
    useMedia.mockReset();
    useMedia.mockImplementation(query => query === DESKTOP);
    media = stubMatchMedia({ [REDUCED_MOTION]: false });
    // jsdom implements neither, and the band drives both through a ref.
    play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    // The hook logs the failure mode before falling back; keep the suite's output readable.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
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

  /**
   * **One strand, because there is one strand's worth of stock.**
   *
   * `recommended.tabs[0].body` and `tabs[1].body` were both in the copy module and in its
   * snapshot — so the preservation guard was green — while no component read either, and the
   * wave that found them rendered both. That overcorrected. `tabs[0]` is Best Sellers, and
   * there are no best sellers anywhere: `recommended.bestSellers` is invented stock that was
   * never promoted, the API has no best-selling query, and nothing in this movement is sorted
   * by sales. Printing its blurb asserted a second strand the page does not have, which is
   * the same family of mistake as a false confirmation — words claiming a thing that is not
   * there.
   *
   * So Fresh Arrivals renders, with its own title labelling its own blurb, and the Best
   * Sellers pair is exempted in `test/rendered-coverage.test.tsx` under the same retired-rail
   * reason `bestSellers` already carries. The words stay in the module for Phase 2's CMS seed;
   * they return to the page when there is a best-sellers query behind them.
   */
  it('renders the Fresh Arrivals strand, title and blurb, verbatim', async () => {
    mockFetch({ freshArrivals: products, shopByStyle: [] });
    render(<Collection />);
    await screen.findByRole('heading', { level: 3, name: products[0].name });

    const { heading, tabs } = siteCopy.home.recommended;
    // The movement's eyebrow is the heading of the rail it absorbed.
    expect(screen.getByText(heading)).toBeInTheDocument();
    expect(screen.getByText(tabs[1].title)).toBeInTheDocument();
    expect(screen.getByText(tabs[1].body)).toBeInTheDocument();
    // Verbatim, as transcribed -- not a paraphrase and not truncated.
    expect(tabs[1].title).toBe('Fresh Arrivals');
    expect(tabs[1].body).toBe(
      'Explore our latest collection of stunning pieces just added to our store — featuring the newest designs and trends.'
    );
  });

  it('asserts no Best Sellers strand, because no best-sellers data exists', async () => {
    mockFetch({ freshArrivals: products, shopByStyle: [] });
    const { container } = render(<Collection />);
    await screen.findByRole('heading', { level: 3, name: products[0].name });

    const [bestSellers] = siteCopy.home.recommended.tabs;
    expect(bestSellers.title).toBe('Best Sellers');
    expect(screen.queryByText(bestSellers.title)).toBeNull();
    expect(screen.queryByText(bestSellers.body)).toBeNull();
    // Nor the invented garments the retired rail hardcoded beside it.
    for (const entry of siteCopy.home.recommended.bestSellers) {
      expect(screen.queryByText(entry.name)).toBeNull();
    }
    expect(container.innerHTML).not.toContain('%2Fsamples%2Fmostrec%2F');
  });

  it('keeps the Fresh Arrivals strand on screen in the fallback state too', async () => {
    mockFetch({ freshArrivals: [], shopByStyle: [] });
    render(<Collection />);
    await screen.findByRole('heading', { level: 3, name: siteCopy.home.collection[0].title });
    const [bestSellers, freshArrivals] = siteCopy.home.recommended.tabs;
    expect(screen.getByText(freshArrivals.body)).toBeInTheDocument();
    expect(screen.queryByText(bestSellers.body)).toBeNull();
  });

  /**
   * The same ruling as Movement 4's: the composed tier stands in when no *photographed*
   * product exists, not when the array is empty. A single photo-less garment would otherwise
   * open the sequence as one 648px-wide "Image coming soon" frame — the widest editorial
   * moment on the homepage, holding no photograph at all.
   */
  it('falls back when the only product has no photographs at all', async () => {
    const [unphotographed] = products;
    expect(unphotographed.photos).toEqual([]);
    mockFetch({ freshArrivals: [unphotographed], shopByStyle: [] });
    const { container } = render(<Collection />);

    await screen.findByRole('heading', { level: 3, name: siteCopy.home.collection[0].title });
    expect(fallbackTiles(container)).toHaveLength(siteCopy.home.collection.length);
    expect(screen.queryByRole('heading', { level: 3, name: unphotographed.name })).toBeNull();
    expect(screen.queryByText(/image coming soon/i)).toBeNull();
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

  /**
   * The largest photograph on the homepage, so the hint matters most here. Measured at both
   * edges of every band: 719px at 767, 476px at 1023, 648px at 1439, and a fixed 648px from
   * 1440 up. The shared default this replaced asked for 336px at 1440 -- a 1.9x upscale on
   * the one image the client will judge the site by.
   */
  it('hints the garment photograph at the width this band actually renders it', async () => {
    mockFetch({ freshArrivals: products, shopByStyle: [] });
    const { container } = render(<Collection />);
    await screen.findByRole('heading', { level: 3, name: products[0].name });

    const tile = container.querySelector('a[href^="/product/"]');
    const sizes = tile?.querySelector('img')?.getAttribute('sizes') ?? '';
    expect(sizes).toBe(
      '(min-width: 1440px) 648px, (min-width: 1024px) 46vw, (min-width: 768px) 47vw, calc(100vw - 48px)'
    );
    expect(sizes).not.toBe('calc(100vw - 48px)');
    expect(sizes).not.toContain('336px');
  });

  /**
   * **Two to a row, offset — not one garment per screen.**
   *
   * One row per garment spent a screen and a half on the two products the catalogue holds and
   * was the single largest cost on the homepage. The pair keeps the drift that made the
   * sequence editorial: a six-column tile with a four-column one dropped below its shoulder.
   * The offset is on the second tile, so the row is as tall as its wide tile and the smaller
   * one hangs inside that height rather than adding to it.
   */
  it('runs the garments as asymmetric pairs, two to a grid row', async () => {
    mockFetch({ freshArrivals: products, shopByStyle: [] });
    const { container } = render(<Collection />);
    await screen.findByRole('heading', { level: 3, name: products[0].name });

    const tiles = Array.from(container.querySelectorAll('a[href^="/product/"]'));
    expect(tiles).toHaveLength(2);

    const slots = tiles.map(tile => tile.closest<HTMLElement>('[class*="md:col-span-"]')!);
    const rows = slots.map(slot => slot.parentElement);
    // Both in the same editorial row, which is what makes it a pair.
    expect(rows[0]).toBe(rows[1]);
    expect(rows[0]!.className).toMatch(/grid-editorial/);

    // Asymmetric: different spans, different starts, and only the second one offset.
    expect(slots[0].className).toMatch(/\bmd:col-span-6\b/);
    expect(slots[1].className).toMatch(/\bmd:col-span-4\b/);
    expect(slots[0].className).toMatch(/\bmd:col-start-2\b/);
    expect(slots[1].className).toMatch(/\bmd:col-start-9\b/);
    expect(slots[0].className).not.toMatch(/\bmd:mt-\d/);
    expect(slots[1].className).toMatch(/\bmd:mt-\d/);
    // They stack full-width on a phone, where an offset pair would be a column of fragments.
    for (const slot of slots) expect(slot.className).toMatch(/\bcol-span-12\b/);
  });

  /**
   * The smaller half of a pair gets its own hint rather than borrowing the wide one, which
   * would ask the browser for a file half as wide again as the slot can show. Measured at
   * both edges of every band: 719px at 767 (stacked one-up), 224px at 768, 309px at 1023,
   * 277px at 1024, 416px at 1439, and a fixed 416px from 1440 up.
   */
  it('hints the narrow half of the pair at its own measured width', async () => {
    mockFetch({ freshArrivals: products, shopByStyle: [] });
    const { container } = render(<Collection />);
    await screen.findByRole('heading', { level: 3, name: products[0].name });

    const wide =
      '(min-width: 1440px) 648px, (min-width: 1024px) 46vw, (min-width: 768px) 47vw, calc(100vw - 48px)';
    const narrow =
      '(min-width: 1440px) 416px, (min-width: 1024px) 29vw, (min-width: 768px) 31vw, calc(100vw - 48px)';
    expect(wide).not.toBe(narrow);

    const tiles = Array.from(container.querySelectorAll('a[href^="/product/"]'));
    // The first product is the photographed one; the second has no photos, so it renders the
    // honest empty frame and carries no `img` to hint. The wide slot is the one to check.
    const hinted = tiles
      .map(tile => tile.querySelector('img')?.getAttribute('sizes'))
      .filter((value): value is string => typeof value === 'string');
    expect(hinted.length).toBeGreaterThan(0);
    for (const value of hinted) expect([wide, narrow]).toContain(value);
    expect(hinted[0]).toBe(wide);
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
      // Dimmed on the plate, never a link, never priced as if purchasable.
      expect(tile.querySelector('.opacity-70 img')).not.toBeNull();
      expect(tile.querySelectorAll('a')).toHaveLength(0);
      expect(tile.textContent ?? '').not.toMatch(/₹|Rs\.|Add to Cart/);
    }
    expect(container.querySelector('a[href^="/product/"]')).toBeNull();
  });

  it('dims the photograph but never the prose, so the tier keeps its contrast', async () => {
    // `opacity` applies to the whole subtree. `text-ink-soft` at 70% over paper computes to
    // ~2.98:1 — below AA at body size, and axe accounts for opacity — so no dimmed ancestor
    // may wrap the words. The plate carries the archive reading on its own.
    mockFetch({ freshArrivals: [], shopByStyle: [] });
    const { container } = render(<Collection />);

    await screen.findByRole('heading', { level: 3, name: siteCopy.home.collection[0].title });

    const dimmedAncestor = (node: Element | null) => {
      for (let el = node; el && el !== container; el = el.parentElement) {
        if (/\bopacity-\d+\b/.test(el.className)) return el;
      }
      return null;
    };

    for (const entry of siteCopy.home.collection) {
      expect(dimmedAncestor(screen.getByText(entry.description))).toBeNull();
      expect(
        dimmedAncestor(screen.getByRole('heading', { level: 3, name: entry.title }))
      ).toBeNull();
    }
    // The numeral apparatus is text too, and it is the smallest text in the tier.
    expect(dimmedAncestor(screen.getByText('01'))).toBeNull();
    // The dim did not simply vanish: it moved onto the image frame.
    expect(container.querySelectorAll('[data-tier="fallback"] .opacity-70 img')).toHaveLength(
      siteCopy.home.collection.length
    );
  });

  /**
   * The lookbook pair's hint, measured rather than guessed.
   *
   * It claimed 830px from 1440 up, and `EditorialPair` renders its media at seven of twelve
   * columns -- 764px at the 1440 content cap, never more. Measured in Chrome at both edges of
   * every band with the browser resolving the hint (DPR 1, production build), rendered width
   * then fetched candidate:
   *
   *   390 -> 327px;  767 -> 704px;  768 -> 401px;  1023 -> 550px;
   *   1024 -> 512px; 1439 -> 755px; 1440 -> 755px; 1920 -> 764px
   *
   * The 755s are 1440 and 1439 with a 15px scrollbar; 1920 is the uncapped maximum, 764.
   *
   * At 830px the browser took `w=1080` from 1439 up, and `100vw` below 768 took `w=828` at
   * 767 where the pair is 704px wide. The corrected hint takes `w=828` and `w=750`.
   */
  it('hints the lookbook pair at the width EditorialPair actually renders it', async () => {
    mockFetch({ freshArrivals: [], shopByStyle: [] });
    const { container } = render(<Collection />);
    await screen.findByRole('heading', { level: 3, name: siteCopy.home.collection[0].title });

    const expected =
      '(min-width: 1440px) 764px, (min-width: 1024px) 54vw, (min-width: 768px) 55vw, calc(100vw - 48px)';
    const images = Array.from(container.querySelectorAll('[data-tier="fallback"] img'));
    expect(images).toHaveLength(siteCopy.home.collection.length);
    for (const image of images) expect(image).toHaveAttribute('sizes', expected);
    // The two figures that cost a candidate step each.
    expect(expected).not.toContain('830px');
    expect(expected).not.toMatch(/,\s*100vw$/);
  });

  it('leaves the fallback photographs decorative, so no name is announced twice', async () => {
    mockFetch({ freshArrivals: [], shopByStyle: [] });
    const { container } = render(<Collection />);

    await screen.findByRole('heading', { level: 3, name: siteCopy.home.collection[0].title });
    const images = Array.from(container.querySelectorAll('[data-tier="fallback"] img'));
    expect(images).toHaveLength(siteCopy.home.collection.length);
    for (const image of images) expect(image).toHaveAttribute('alt', '');
    // An empty alt takes them out of the image role entirely.
    expect(screen.queryAllByRole('img')).toHaveLength(0);
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
    ['an error payload with a 200', { error: 'Database configuration error' }, true, 200],
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

  it('says which failure mode it hit before falling back', async () => {
    // All four modes render the same tier, which is the point — but in production they must
    // still be tellable apart, as they were before the rails were retired.
    const logged = vi.spyOn(console, 'error');
    mockFetch({ error: 'Failed to fetch homepage sections' }, false, 500);
    render(<Collection />);

    await screen.findByRole('heading', { level: 3, name: siteCopy.home.collection[0].title });
    const calls = logged.mock.calls.filter(call => String(call[0]).includes('[homepage-sections]'));
    expect(calls.length).toBeGreaterThan(0);
    expect(String(calls[0][0])).toMatch(/request failed/);
    expect(JSON.stringify(calls[0][1])).toContain('500');
  });

  it('does not log an empty catalogue as a failure', async () => {
    // Low inventory is a normal state, not an error, and must not cry wolf in the console.
    const logged = vi.spyOn(console, 'error');
    mockFetch({ freshArrivals: [], shopByStyle: [] });
    render(<Collection />);

    await screen.findByRole('heading', { level: 3, name: siteCopy.home.collection[0].title });
    expect(
      logged.mock.calls.filter(call => String(call[0]).includes('[homepage-sections]'))
    ).toHaveLength(0);
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
      expect(video).toHaveAttribute('playsinline');
      // Decorative: no accessible content, out of the tab order.
      expect(video).toHaveAttribute('aria-hidden', 'true');
      expect(video).toHaveAttribute('tabindex', '-1');
      // Never an autoplay attribute — see the sequence tests below.
      expect(video).not.toHaveAttribute('autoplay');
      expect(video).toHaveAttribute('preload', 'metadata');
    }
    expect(useMedia).toHaveBeenCalledWith(DESKTOP);
  });

  it('starts the footage imperatively once the client can answer the query', async () => {
    media.set(REDUCED_MOTION, false);
    mockFetch({ freshArrivals: products, shopByStyle: [] });
    render(<Collection />);

    await screen.findByRole('heading', { level: 3, name: products[0].name });
    expect(play).toHaveBeenCalledTimes(3);
    expect(pause).not.toHaveBeenCalled();
  });

  it('serves a phone the lead clip only, and never requests the other two', async () => {
    // A third of a 390px viewport is 130px, which crops a 9:16 clip to a sliver. A CSS
    // `hidden` would not have saved the bytes — `autoplay` overrides `preload="none"`, so a
    // display:none video with a src still downloads — so the extra clips are not rendered.
    useMedia.mockImplementation(() => false);
    mockFetch({ freshArrivals: products, shopByStyle: [] });
    const { container } = render(<Collection />);

    await screen.findByRole('heading', { level: 3, name: products[0].name });
    const videos = Array.from(container.querySelectorAll('video'));
    expect(videos).toHaveLength(1);
    expect(videos[0]).toHaveAttribute('src', SPOTLIGHT[0]);
    // Not merely hidden: the other two sources are nowhere in the document.
    expect(container.innerHTML).not.toContain('sp02.webm');
    expect(container.innerHTML).not.toContain('sp03.webm');
  });

  it('ships no autoplay in the server markup, so nothing can start before React answers', () => {
    // The real sequence, not a resolved mock: a media query cannot be answered while
    // rendering on the server, so `autoPlay={!prefersReducedMotion}` put `autoplay` in the
    // HTML a reduced-motion browser acts on *before* hydration — and clearing the attribute
    // afterwards does not pause an element that is already playing.
    useMedia.mockImplementation(() => false); // what the server, and only the server, knows
    const html = renderToStaticMarkup(<Collection />);

    expect(html).toContain('sp01.webm');
    expect(html).not.toContain('autoplay');
    expect(html).not.toContain('autoPlay');
  });

  it('never starts the footage under prefers-reduced-motion', async () => {
    // Drive the sequence: the query is unresolved during the first render (useMedia returns
    // false before its effect), and resolves to "reduce" on the client.
    useMedia.mockImplementation(() => false);
    media.set(REDUCED_MOTION, true);
    mockFetch({ freshArrivals: products, shopByStyle: [] });
    const { container } = render(<Collection />);

    await screen.findByRole('heading', { level: 3, name: products[0].name });
    for (const video of Array.from(container.querySelectorAll('video'))) {
      // Nothing in the markup can start playback on its own at any point in the sequence.
      expect(video).not.toHaveAttribute('autoplay');
      // Still composed, just still: enough is loaded to paint a first frame.
      expect(video).toHaveAttribute('preload', 'metadata');
    }
    expect(play).not.toHaveBeenCalled();
  });

  it('pauses the footage when reduced motion is turned on mid-session', async () => {
    media.set(REDUCED_MOTION, false);
    mockFetch({ freshArrivals: products, shopByStyle: [] });
    render(<Collection />);

    await screen.findByRole('heading', { level: 3, name: products[0].name });
    expect(play).toHaveBeenCalledTimes(3);

    await act(async () => {
      media.set(REDUCED_MOTION, true);
    });
    expect(pause).toHaveBeenCalledTimes(3);
  });

  it('paints a desktop band as one full-bleed clip until the breakpoint resolves', () => {
    // The gold ground is only ever the 1px gaps between panels. Before hydration there is
    // one clip, so the band must be a single column — not one panel beside bare gold.
    useMedia.mockImplementation(() => false);
    const html = renderToStaticMarkup(<Collection />);
    expect(html).not.toContain('md:grid-cols-3');
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
