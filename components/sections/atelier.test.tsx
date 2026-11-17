import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Atelier from './atelier';

/** Ten frames: the live folder returns seven real photographs and three sample stand-ins. */
const IMAGES = Array.from({ length: 10 }, (_, i) => `/slideshow/${i}.jpg`);
const THREE = IMAGES.slice(0, 3);

function mockFetch(body: unknown, ok = true, status = 200) {
  const spy = vi.fn().mockResolvedValue({ ok, status, json: async () => body });
  vi.stubGlobal('fetch', spy);
  return spy;
}

/** next/image serves through `/_next/image?url=<encoded src>`, so decode before matching. */
const shown = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('img')).map(img =>
    decodeURIComponent(img.getAttribute('src') ?? '')
  );

const band = (container: HTMLElement, sources: string[]) =>
  sources.every(src => shown(container).some(value => value.includes(src)));

/** The hook settles asynchronously; give it a turn before asserting an absence. */
async function settled(spy: ReturnType<typeof vi.fn>) {
  await waitFor(() => expect(spy).toHaveBeenCalled());
  await new Promise(resolve => setTimeout(resolve, 0));
}

describe('Atelier', () => {
  let error: ReturnType<typeof vi.spyOn>;
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // The hook logs every failure mode; keep the suite's output readable and assertable.
    error = vi.spyOn(console, 'error').mockImplementation(() => {});
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders the images returned by /api/slideshow', async () => {
    const spy = mockFetch({ images: IMAGES });
    const { container } = render(<Atelier />);

    await waitFor(() => expect(container.querySelector('img')).not.toBeNull());
    expect(spy).toHaveBeenCalledWith('/api/slideshow');
    expect(band(container, THREE)).toBe(true);
    expect(error).not.toHaveBeenCalled();
  });

  /**
   * **A band of three, not one photograph at a time.**
   *
   * The movement used to be a single 16:9 frame capped at 88svh: 939px of section carrying one
   * image, on the page whose complaint was emptiness. The gallery holds ten frames and showed
   * a ninth of them. It is now three at once in a 5/4/3 progression, so the band is shorter
   * than the single frame was and holds three times the photography.
   */
  it('shows a band of three frames at once', async () => {
    mockFetch({ images: IMAGES });
    const { container } = render(<Atelier />);
    await waitFor(() => expect(container.querySelector('img')).not.toBeNull());

    expect(container.querySelectorAll('img')).toHaveLength(3);
    expect(band(container, THREE)).toBe(true);
    expect(screen.getByText('01–03 / 10')).toBeInTheDocument();
  });

  /**
   * The window advances by its own width, so a reader walking the gallery meets every frame
   * rather than re-reading two of the three they just saw.
   */
  it('advances a whole band at a time, and only on an explicit control', async () => {
    mockFetch({ images: IMAGES });
    const { container } = render(<Atelier />);
    await waitFor(() => expect(container.querySelector('img')).not.toBeNull());

    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(band(container, IMAGES.slice(3, 6))).toBe(true);
    expect(screen.getByText('04–06 / 10')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(band(container, IMAGES.slice(6, 9))).toBe(true);
    expect(screen.getByText('07–09 / 10')).toBeInTheDocument();

    // Backwards, and then past the start: the window wraps rather than stopping.
    fireEvent.click(screen.getByRole('button', { name: /previous/i }));
    fireEvent.click(screen.getByRole('button', { name: /previous/i }));
    expect(band(container, THREE)).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /previous/i }));
    expect(screen.getByText('08–10 / 10')).toBeInTheDocument();
  });

  it('never advances on its own: no timers, so nothing to pause for a reader', async () => {
    const interval = vi.spyOn(window, 'setInterval');
    mockFetch({ images: IMAGES });
    const { container } = render(<Atelier />);
    await waitFor(() => expect(container.querySelector('img')).not.toBeNull());

    // Testing Library's own waitFor polls on a 50ms interval; anything else would be ours.
    expect(interval.mock.calls.filter(([, ms]) => ms !== 50)).toEqual([]);
    expect(screen.getByText('01–03 / 10')).toBeInTheDocument();
    expect(container.innerHTML).not.toMatch(/autoplay/i);
    expect(container.querySelector('video')).toBeNull();
  });

  it('announces the position politely and gives every frame an honest alt', async () => {
    mockFetch({ images: IMAGES });
    const { container } = render(<Atelier />);
    await waitFor(() => expect(container.querySelector('img')).not.toBeNull());

    const counter = screen.getByText('01–03 / 10');
    expect(counter.closest('[aria-live]')).toHaveAttribute('aria-live', 'polite');
    const alts = Array.from(container.querySelectorAll('img')).map(img => img.getAttribute('alt'));
    expect(alts).toEqual([
      'Divyafal gallery, image 1 of 10',
      'Divyafal gallery, image 2 of 10',
      'Divyafal gallery, image 3 of 10',
    ]);
  });

  /**
   * Each panel is a different width, so each carries its own hint rather than one shared
   * value that would be wrong for two of the three. Measured at both edges of every band.
   */
  it('hints each panel at the width its own column renders', async () => {
    mockFetch({ images: IMAGES });
    const { container } = render(<Atelier />);
    await waitFor(() => expect(container.querySelector('img')).not.toBeNull());

    expect(
      Array.from(container.querySelectorAll('img')).map(img => img.getAttribute('sizes'))
    ).toEqual([
      '(min-width: 768px) 42vw, 100vw',
      '(min-width: 768px) 34vw, 100vw',
      '(min-width: 768px) 25vw, 100vw',
    ]);
  });

  it('drops a frame that fails to load rather than leaving a broken image up', async () => {
    mockFetch({ images: THREE });
    const { container } = render(<Atelier />);
    await waitFor(() => expect(container.querySelector('img')).not.toBeNull());
    expect(container.querySelectorAll('img')).toHaveLength(3);

    fireEvent.error(container.querySelector('img')!);

    await waitFor(() => expect(container.querySelectorAll('img')).toHaveLength(2));
    expect(shown(container).some(src => src.includes(THREE[0]))).toBe(false);
    // Two frames left and a band that holds at most two: nothing to page through.
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders nothing when every frame fails to load', async () => {
    mockFetch({ images: [IMAGES[0]] });
    const { container } = render(<Atelier />);
    await waitFor(() => expect(container.querySelector('img')).not.toBeNull());

    fireEvent.error(container.querySelector('img')!);

    await waitFor(() => expect(container.firstChild).toBeNull());
  });

  it('offers no controls when the whole gallery already fits in the band', async () => {
    mockFetch({ images: THREE });
    const { container } = render(<Atelier />);
    await waitFor(() => expect(container.querySelector('img')).not.toBeNull());

    expect(container.querySelectorAll('img')).toHaveLength(3);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByText(/\//)).toBeNull();
  });

  it('shows what it has when the gallery is smaller than the band', async () => {
    mockFetch({ images: THREE.slice(0, 2) });
    const { container } = render(<Atelier />);
    await waitFor(() => expect(container.querySelector('img')).not.toBeNull());

    expect(container.querySelectorAll('img')).toHaveLength(2);
    expect(screen.queryByRole('button')).toBeNull();
  });

  describe('when the endpoint cannot give it a gallery', () => {
    it('renders nothing rather than a broken gallery when the endpoint returns an empty list', async () => {
      const spy = mockFetch({ images: [] });
      const { container } = render(<Atelier />);

      await settled(spy);
      await waitFor(() => expect(container.firstChild).toBeNull());
      // An empty list is a valid answer, but the route also gives it for an unreadable
      // folder, so it is worth a line in production.
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('[slideshow]'));
    });

    it('renders nothing and logs when the body is an error payload', async () => {
      const spy = mockFetch({ error: 'boom' });
      const { container } = render(<Atelier />);

      await settled(spy);
      await waitFor(() => expect(container.firstChild).toBeNull());
      expect(error).toHaveBeenCalledWith(
        expect.stringContaining('response carried no usable images'),
        { error: 'boom' }
      );
    });

    it('renders nothing and logs the status on a non-OK response', async () => {
      const spy = mockFetch({ images: IMAGES }, false, 500);
      const { container } = render(<Atelier />);

      await settled(spy);
      await waitFor(() => expect(container.firstChild).toBeNull());
      expect(error).toHaveBeenCalledWith(expect.stringContaining('request failed'), {
        status: 500,
      });
    });

    it('renders nothing and logs when the fetch rejects', async () => {
      const spy = vi.fn().mockRejectedValue(new Error('offline'));
      vi.stubGlobal('fetch', spy);
      const { container } = render(<Atelier />);

      await settled(spy);
      await waitFor(() => expect(container.firstChild).toBeNull());
      expect(error).toHaveBeenCalledWith(
        expect.stringContaining('request could not be made'),
        expect.any(Error)
      );
    });

    it('renders nothing and logs when the body is not JSON', async () => {
      const spy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError('Unexpected token <');
        },
      });
      vi.stubGlobal('fetch', spy);
      const { container } = render(<Atelier />);

      await settled(spy);
      await waitFor(() => expect(container.firstChild).toBeNull());
      expect(error).toHaveBeenCalledWith(
        expect.stringContaining('response body was not JSON'),
        expect.any(SyntaxError)
      );
    });

    it('ignores sources next/image could not render instead of throwing', async () => {
      mockFetch({ images: ['not a path', 42, null, '/slideshow/ok.jpg'] });
      const { container } = render(<Atelier />);

      await waitFor(() => expect(container.querySelector('img')).not.toBeNull());
      expect(shown(container)[0]).toContain('/slideshow/ok.jpg');
      expect(container.querySelectorAll('img')).toHaveLength(1);
    });
  });

  it('keeps its reserved band quiet while loading, then leaves no trace if nothing comes', async () => {
    let release: (value: unknown) => void = () => {};
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(
        new Promise(resolve => {
          release = resolve;
        })
      )
    );
    const { container } = render(<Atelier />);

    // The placeholder holds the height so the page below does not jump, and says nothing.
    const placeholder = container.querySelector('[aria-hidden="true"]');
    expect(placeholder).not.toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('[class*="animate-pulse"]')).toBeNull();

    release({ ok: true, status: 200, json: async () => ({ images: [] }) });
    await waitFor(() => expect(container.firstChild).toBeNull());
  });

  it('is full-bleed on the paper ground, with none of the retired chrome', async () => {
    mockFetch({ images: IMAGES });
    const { container } = render(<Atelier />);
    await waitFor(() => expect(container.querySelector('img')).not.toBeNull());

    const html = container.innerHTML;
    expect(html).not.toMatch(/rounded-(2xl|3xl|full)|shadow|bg-gray|text-gray|gradient/);
    // `disabled:opacity-50` on a button is the primitive's own; a bare utility is the hazard.
    expect(html).not.toMatch(/(^|[\s"'])opacity-\d+/);
    expect(container.querySelector('section')?.className).toMatch(/bg-paper/);
  });
});
