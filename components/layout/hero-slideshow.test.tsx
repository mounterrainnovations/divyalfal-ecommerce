// The hero's plate changer. What is worth pinning here is the part you cannot see by looking
// at it: that the index wraps instead of running off the end, that the thing stops advancing
// when someone is hovering or reading it, and — the one a designer will never catch in a
// browser — that a visitor who has asked for reduced motion gets no auto-advance at all.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import HeroSlideshow, { advanceIndex, type HeroSlide } from './hero-slideshow';

const SLIDES: HeroSlide[] = [
  { src: '/slideshow/a.jpg', alt: 'First plate', position: '50% 50%' },
  { src: '/slideshow/b.jpg', alt: 'Second plate', position: '50% 50%' },
  { src: '/slideshow/c.jpg', alt: 'Third plate', position: '50% 50%' },
];

/**
 * jsdom has no `matchMedia`, and `useMedia` is the only thing between this component and the
 * reduced-motion setting, so the stub is the test fixture.
 */
function stubMatchMedia(reduceMotion: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? reduceMotion : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    }))
  );
}

/** The slide whose wrapper is not `aria-hidden` is the one on screen. */
function visibleSlideAlt(): string | null {
  for (const slide of SLIDES) {
    const image = screen.getByAltText(slide.alt);
    if (image.parentElement?.getAttribute('aria-hidden') === 'false') return slide.alt;
  }
  return null;
}

beforeEach(() => {
  stubMatchMedia(false);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('advanceIndex', () => {
  it('steps forward and wraps past the last slide', () => {
    expect(advanceIndex(0, 4)).toBe(1);
    expect(advanceIndex(2, 4)).toBe(3);
    expect(advanceIndex(3, 4)).toBe(0);
  });

  // `-1 % 4` is -1 in JavaScript, so a naive modulo hands back a negative index and the hero
  // renders nothing the first time anyone steps back from the first slide.
  it('wraps backwards without producing a negative index', () => {
    expect(advanceIndex(0, 4, -1)).toBe(3);
    expect(advanceIndex(2, 4, -1)).toBe(1);
  });

  it('is 0 for an empty set rather than NaN', () => {
    expect(advanceIndex(0, 0)).toBe(0);
  });
});

describe('HeroSlideshow', () => {
  it('shows the first slide, and gives only it loading priority', () => {
    render(<HeroSlideshow slides={SLIDES} label="Runway photographs" />);

    expect(visibleSlideAlt()).toBe('First plate');
    // next/image omits `loading` entirely on a priority image and sets `lazy` on every other
    // one, so the absence of the attribute on the first plate *is* the priority.
    expect(screen.getByAltText('First plate')).not.toHaveAttribute('loading');
    expect(screen.getByAltText('Second plate')).toHaveAttribute('loading', 'lazy');
    expect(screen.getByAltText('Third plate')).toHaveAttribute('loading', 'lazy');
  });

  it('auto-advances and wraps back to the first slide', () => {
    vi.useFakeTimers();
    render(<HeroSlideshow slides={SLIDES} label="Runway photographs" intervalMs={1000} />);

    act(() => void vi.advanceTimersByTime(1000));
    expect(visibleSlideAlt()).toBe('Second plate');

    act(() => void vi.advanceTimersByTime(1000));
    expect(visibleSlideAlt()).toBe('Third plate');

    act(() => void vi.advanceTimersByTime(1000));
    expect(visibleSlideAlt()).toBe('First plate');
  });

  it('pauses while the pointer is over it and resumes when it leaves', () => {
    vi.useFakeTimers();
    render(<HeroSlideshow slides={SLIDES} label="Runway photographs" intervalMs={1000} />);
    const region = screen.getByRole('region', { name: 'Runway photographs' });

    fireEvent.pointerEnter(region);
    act(() => void vi.advanceTimersByTime(5000));
    expect(visibleSlideAlt()).toBe('First plate');

    fireEvent.pointerLeave(region);
    act(() => void vi.advanceTimersByTime(1000));
    expect(visibleSlideAlt()).toBe('Second plate');
  });

  it('pauses while something inside it has focus', () => {
    vi.useFakeTimers();
    render(<HeroSlideshow slides={SLIDES} label="Runway photographs" intervalMs={1000} />);

    act(() => screen.getByRole('button', { name: 'Show slide 2 of 3' }).focus());
    act(() => void vi.advanceTimersByTime(5000));
    // Focusing a dot does not select it; it only stops the hero moving under the reader.
    expect(visibleSlideAlt()).toBe('First plate');
  });

  it('does not auto-advance when reduced motion is preferred', () => {
    stubMatchMedia(true);
    vi.useFakeTimers();
    render(<HeroSlideshow slides={SLIDES} label="Runway photographs" intervalMs={1000} />);

    act(() => void vi.advanceTimersByTime(10_000));
    expect(visibleSlideAlt()).toBe('First plate');
  });

  it('still lets a reduced-motion visitor choose a slide with the dots', () => {
    stubMatchMedia(true);
    render(<HeroSlideshow slides={SLIDES} label="Runway photographs" />);

    fireEvent.click(screen.getByRole('button', { name: 'Show slide 3 of 3' }));
    expect(visibleSlideAlt()).toBe('Third plate');
  });

  it('names every dot and marks the current one', () => {
    render(<HeroSlideshow slides={SLIDES} label="Runway photographs" />);

    const dots = screen.getAllByRole('button');
    expect(dots.map(dot => dot.getAttribute('aria-label'))).toEqual([
      'Show slide 1 of 3',
      'Show slide 2 of 3',
      'Show slide 3 of 3',
    ]);
    expect(dots[0]).toHaveAttribute('aria-current', 'true');
    expect(dots[1]).not.toHaveAttribute('aria-current');
  });

  it('draws no dots for a single slide, and nothing at all for none', () => {
    const { container } = render(
      <HeroSlideshow slides={[SLIDES[0]]} label="Runway photographs" />
    );
    expect(screen.queryByRole('button')).toBeNull();
    expect(container.querySelector('img')).not.toBeNull();

    cleanup();
    const empty = render(<HeroSlideshow slides={[]} label="Runway photographs" />);
    expect(empty.container).toBeEmptyDOMElement();
  });
});
