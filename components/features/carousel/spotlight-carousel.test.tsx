/**
 * The spotlight band.
 *
 * Three things here are worth a test, and they are the three that would be invisible until a
 * visitor hit them: that the band draws the footage that exists and nothing else, that the
 * paging controls know when they are at an end, and that it never plays more than one clip at
 * a time — or any clip at all when the visitor has asked for reduced motion.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SpotlightCarousel, {
  readEdges,
  SPOTLIGHT_CAPACITY,
  SPOTLIGHT_FOOTAGE,
} from './spotlight-carousel';

/**
 * jsdom has no `matchMedia`, and `useMedia` calls it on mount, so without this the component
 * cannot render at all. `reduce` is what the reduced-motion tests flip.
 */
function stubMatchMedia(reduce = false) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
}

/** jsdom's media element is a stub that logs "Not implemented"; these are the spies. */
let play: ReturnType<typeof vi.fn>;
let pause: ReturnType<typeof vi.fn>;

beforeEach(() => {
  stubMatchMedia();
  play = vi.fn(() => Promise.resolve());
  pause = vi.fn();
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(play);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(pause);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/**
 * jsdom has no layout, so a scroller is 0x0 and permanently "at rest". These are the numbers a
 * real one would report; `scroll` is dispatched because that is what the component listens to.
 */
function fakeScrollGeometry(
  el: HTMLElement,
  { scrollLeft, clientWidth, scrollWidth }: Record<string, number>
) {
  for (const [prop, value] of Object.entries({ scrollLeft, clientWidth, scrollWidth })) {
    Object.defineProperty(el, prop, { value, configurable: true, writable: true });
  }
  act(() => {
    fireEvent.scroll(el);
  });
}

describe('readEdges', () => {
  it('reports nothing to scroll when the clips already fit', () => {
    expect(readEdges({ scrollLeft: 0, clientWidth: 1200, scrollWidth: 1200 })).toEqual({
      scrollable: false,
      atStart: true,
      atEnd: true,
    });
  });

  it('reports both ends and the middle', () => {
    const geometry = { clientWidth: 400, scrollWidth: 1200 };
    expect(readEdges({ ...geometry, scrollLeft: 0 })).toMatchObject({
      scrollable: true,
      atStart: true,
      atEnd: false,
    });
    expect(readEdges({ ...geometry, scrollLeft: 400 })).toMatchObject({
      atStart: false,
      atEnd: false,
    });
    expect(readEdges({ ...geometry, scrollLeft: 800 })).toMatchObject({
      atStart: false,
      atEnd: true,
    });
  });

  /**
   * The reason the comparison is not `===`. A snapped scroll position is fractional at most
   * zoom levels, so the last pixel of the strip is routinely unreachable by exact arithmetic
   * and the "next" control would never disable.
   */
  it('treats a sub-pixel shortfall at either end as the end', () => {
    expect(readEdges({ scrollLeft: 0.4, clientWidth: 400, scrollWidth: 1200 })).toMatchObject({
      atStart: true,
    });
    expect(readEdges({ scrollLeft: 799.6, clientWidth: 400, scrollWidth: 1200 })).toMatchObject({
      atEnd: true,
    });
  });
});

describe('SpotlightCarousel', () => {
  it('has room for six clips and draws only the ones that exist', () => {
    const { container } = render(<SpotlightCarousel />);
    const videos = Array.from(container.querySelectorAll('video'));

    expect(SPOTLIGHT_CAPACITY).toBe(6);
    expect(SPOTLIGHT_FOOTAGE.length).toBeLessThanOrEqual(SPOTLIGHT_CAPACITY);
    expect(videos).toHaveLength(SPOTLIGHT_FOOTAGE.length);
    expect(videos.map(v => v.getAttribute('src'))).toEqual(SPOTLIGHT_FOOTAGE.map(c => c.src));
  });

  /**
   * Every src must be a file that is actually in the bucket. The guard is the point: the next
   * person to add a fifth clip gets a failure here if they add a name and no upload.
   */
  it('points only at the four clips the shop owns', () => {
    const { container } = render(<SpotlightCarousel />);
    expect(Array.from(container.querySelectorAll('video')).map(v => v.getAttribute('src')))
      .toEqual([
        'https://duwwgyobnpuqsqdromzj.supabase.co/storage/v1/object/public/product-images/bg_video.webm',
        'https://duwwgyobnpuqsqdromzj.supabase.co/storage/v1/object/public/product-images/sp01.webm',
        'https://duwwgyobnpuqsqdromzj.supabase.co/storage/v1/object/public/product-images/sp02.webm',
        'https://duwwgyobnpuqsqdromzj.supabase.co/storage/v1/object/public/product-images/sp03.webm',
      ]);
  });

  it('ships every clip muted, looping, inline and metadata-only, and none of them autoplaying', () => {
    const { container } = render(<SpotlightCarousel />);
    for (const video of container.querySelectorAll('video')) {
      expect(video).toHaveAttribute('preload', 'metadata');
      expect(video.muted).toBe(true);
      expect(video.loop).toBe(true);
      expect(video.autoplay).toBe(false);
      expect(video.hasAttribute('playsinline')).toBe(true);
    }
  });

  /**
   * Queried through the DOM rather than by role and name: an element carrying `hidden` is out
   * of the accessibility tree, so it has no accessible name to match on — which is the whole
   * point of using the attribute.
   */
  it('hides the controls while every clip fits', () => {
    const { container } = render(<SpotlightCarousel />);
    const controls = Array.from(container.querySelectorAll('button'));
    expect(controls).toHaveLength(2);
    for (const control of controls) {
      expect(control).not.toBeVisible();
      expect(control.getAttribute('aria-label')).toContain('spotlight videos');
    }
  });

  it('disables the control that has nowhere to go and enables the other', () => {
    render(<SpotlightCarousel />);
    const scroller = screen.getByRole('group', { name: 'Spotlight videos' });

    fakeScrollGeometry(scroller, { scrollLeft: 0, clientWidth: 400, scrollWidth: 1600 });
    const previous = screen.getByRole('button', { name: 'Show previous spotlight videos' });
    const next = screen.getByRole('button', { name: 'Show next spotlight videos' });
    expect(previous).toBeDisabled();
    expect(next).toBeEnabled();

    fakeScrollGeometry(scroller, { scrollLeft: 600, clientWidth: 400, scrollWidth: 1600 });
    expect(previous).toBeEnabled();
    expect(next).toBeEnabled();

    fakeScrollGeometry(scroller, { scrollLeft: 1200, clientWidth: 400, scrollWidth: 1600 });
    expect(previous).toBeEnabled();
    expect(next).toBeDisabled();
  });

  it('pages the strip by most of a screenful in the direction pressed', async () => {
    render(<SpotlightCarousel />);
    const scroller = screen.getByRole('group', { name: 'Spotlight videos' });
    const scrollBy = vi.fn();
    scroller.scrollBy = scrollBy;

    fakeScrollGeometry(scroller, { scrollLeft: 600, clientWidth: 400, scrollWidth: 1600 });

    await userEvent.click(screen.getByRole('button', { name: 'Show next spotlight videos' }));
    expect(scrollBy).toHaveBeenLastCalledWith({ left: 320, behavior: 'smooth' });

    await userEvent.click(screen.getByRole('button', { name: 'Show previous spotlight videos' }));
    expect(scrollBy).toHaveBeenLastCalledWith({ left: -320, behavior: 'smooth' });
  });

  it('plays one clip on hover and stops it again on leave', async () => {
    const { container } = render(<SpotlightCarousel />);
    const videos = Array.from(container.querySelectorAll('video'));
    play.mockClear();

    await userEvent.hover(videos[1]);
    expect(play).toHaveBeenCalledTimes(1);

    play.mockClear();
    await userEvent.unhover(videos[1]);
    expect(play).not.toHaveBeenCalled();
  });

  it('plays the focused clip, so a keyboard reaches the footage too', () => {
    const { container } = render(<SpotlightCarousel />);
    const videos = Array.from(container.querySelectorAll('video'));
    play.mockClear();

    act(() => {
      fireEvent.focus(videos[2]);
    });
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('never plays anything under prefers-reduced-motion', async () => {
    stubMatchMedia(true);
    const { container } = render(<SpotlightCarousel />);
    play.mockClear();

    await userEvent.hover(container.querySelectorAll('video')[0]);
    expect(play).not.toHaveBeenCalled();
  });
});
