import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Reveal from './Reveal';

/**
 * Review Focus #4: content must never be stranded invisible. `Reveal` hides a block only
 * by setting `data-reveal="armed"`, so these tests assert on that attribute rather than on
 * a class or on `toBeVisible()` — jsdom loads no stylesheet, so neither of those can tell
 * a hidden block from a shown one.
 *
 * Two jsdom facts these tests lean on, deliberately:
 *  - `getBoundingClientRect()` returns all zeros, so a block counts as off-screen unless a
 *    test stubs a rect. Off-screen is the interesting path: it is the one that arms.
 *  - `document.documentElement.scrollHeight` is 0, so the page counts as unscrollable
 *    unless a test stubs it.
 */

type ObserverCallback = (entries: IntersectionObserverEntry[]) => void;

const realMatchMedia = window.matchMedia;
const realObserver = window.IntersectionObserver;
const realRect = Element.prototype.getBoundingClientRect;

/** Replaces IntersectionObserver with a stub whose callback the test drives by hand. */
function stubObserver() {
  const spy = {
    observed: 0,
    disconnected: 0,
    options: undefined as IntersectionObserverInit | undefined,
    fire: (() => {}) as (intersecting: boolean) => void,
  };

  class StubObserver {
    constructor(
      private callback: ObserverCallback,
      options?: IntersectionObserverInit
    ) {
      spy.options = options;
      spy.fire = (intersecting: boolean) =>
        this.callback([{ isIntersecting: intersecting } as IntersectionObserverEntry]);
    }
    observe() {
      spy.observed += 1;
    }
    disconnect() {
      spy.disconnected += 1;
    }
    unobserve() {}
    takeRecords() {
      return [];
    }
  }

  window.IntersectionObserver = StubObserver as unknown as typeof IntersectionObserver;
  return spy;
}

/** An IntersectionObserver that fires the moment the block is observed. */
function stubObserverFiring(intersecting: boolean) {
  const spy = { observed: 0, disconnected: 0 };

  class EagerObserver {
    constructor(private callback: ObserverCallback) {}
    observe() {
      spy.observed += 1;
      this.callback([{ isIntersecting: intersecting } as IntersectionObserverEntry]);
    }
    disconnect() {
      spy.disconnected += 1;
    }
    unobserve() {}
    takeRecords() {
      return [];
    }
  }

  window.IntersectionObserver = EagerObserver as unknown as typeof IntersectionObserver;
  return spy;
}

function preferReducedMotion(preferred: boolean) {
  window.matchMedia = ((q: string) => ({
    matches: preferred && q.includes('prefers-reduced-motion'),
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

function makePageScrollable(scrollHeight: number) {
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    value: scrollHeight,
    configurable: true,
  });
}

function placeBlockOnScreen() {
  Element.prototype.getBoundingClientRect = function () {
    return { top: 100, bottom: 400, left: 0, right: 0, width: 0, height: 300 } as DOMRect;
  };
}

beforeEach(() => {
  preferReducedMotion(false);
});

afterEach(() => {
  // Every global this suite touches goes back, so no test inherits another's stubs —
  // the leak that let the original pair of tests both run as "reduced motion".
  window.matchMedia = realMatchMedia;
  window.IntersectionObserver = realObserver;
  Element.prototype.getBoundingClientRect = realRect;
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    value: 0,
    configurable: true,
  });
  vi.useRealTimers();
});

const block = (el: HTMLElement) => el.parentElement!;

describe('Reveal', () => {
  it('renders children visible when reduced motion is preferred', () => {
    preferReducedMotion(true);
    stubObserver();
    render(
      <Reveal>
        <p>Elegance</p>
      </Reveal>
    );
    const el = block(screen.getByText('Elegance'));
    // The brief's floor: no hiding class. The real contract: never armed at all.
    expect(el).not.toHaveClass('opacity-0');
    expect(el.dataset.reveal).toBeUndefined();
  });

  it('renders children even when IntersectionObserver never fires', () => {
    render(
      <Reveal>
        <p>Distinctive</p>
      </Reveal>
    );
    expect(screen.getByText('Distinctive')).toBeVisible();
  });

  it('never arms a block with no IntersectionObserver available', () => {
    // jsdom has none unless a test supplies one.
    expect(window.IntersectionObserver).toBeUndefined();
    render(
      <Reveal>
        <p>No observer</p>
      </Reveal>
    );
    expect(block(screen.getByText('No observer')).dataset.reveal).toBeUndefined();
  });

  it('never arms a block that is already in the viewport', () => {
    placeBlockOnScreen();
    stubObserver();
    render(
      <Reveal>
        <p>Already on screen</p>
      </Reveal>
    );
    // Arming a visible block is the one-frame flash; it must not happen.
    expect(block(screen.getByText('Already on screen')).dataset.reveal).toBeUndefined();
  });

  it('arms an off-screen block on a scrollable page and waits for the scroll', () => {
    makePageScrollable(5000);
    const spy = stubObserver();
    render(
      <Reveal>
        <p>Below the fold</p>
      </Reveal>
    );
    const el = block(screen.getByText('Below the fold'));
    expect(el.dataset.reveal).toBe('armed');
    expect(spy.observed).toBe(1);
  });

  it('observes with no negative margin and a zero threshold', () => {
    // jsdom computes no geometry, so this is the only way to pin the other half of the
    // stranding bug: a negative bottom rootMargin or a non-zero threshold means a block
    // sitting low in the viewport is reported as not intersecting and stays hidden.
    makePageScrollable(5000);
    const spy = stubObserver();
    render(
      <Reveal>
        <p>Observed</p>
      </Reveal>
    );
    expect(spy.options?.threshold).toBe(0);
    expect(spy.options?.rootMargin ?? '0px').not.toMatch(/-/);
  });

  it('plays the reveal when the block intersects', () => {
    makePageScrollable(5000);
    const spy = stubObserver();
    render(
      <Reveal>
        <p>Scrolled into view</p>
      </Reveal>
    );
    const el = block(screen.getByText('Scrolled into view'));
    expect(el.dataset.reveal).toBe('armed');
    spy.fire(true);
    expect(el.dataset.reveal).toBe('in');
    expect(spy.disconnected).toBe(1);
  });

  it('reveals an armed block when the observer never calls back (600ms failsafe)', () => {
    vi.useFakeTimers();
    makePageScrollable(5000);
    stubObserver(); // constructed, observed, but never fired
    render(
      <Reveal>
        <p>Dead observer</p>
      </Reveal>
    );
    const el = block(screen.getByText('Dead observer'));
    expect(el.dataset.reveal).toBe('armed');
    vi.advanceTimersByTime(600);
    expect(el.dataset.reveal).toBe('in');
  });

  it('reveals a non-intersecting block on a page that cannot scroll', () => {
    // The stranding case: a short page the viewer can see all of, where the block will
    // never report an intersection, so waiting for one would hide it for good.
    const spy = stubObserverFiring(false);
    render(
      <Reveal>
        <p>Short page</p>
      </Reveal>
    );
    expect(block(screen.getByText('Short page')).dataset.reveal).toBe('in');
    expect(spy.disconnected).toBe(1);
  });

  it('leaves a non-intersecting block armed while the page can still be scrolled', () => {
    vi.useFakeTimers();
    makePageScrollable(5000);
    const spy = stubObserverFiring(false);
    render(
      <Reveal>
        <p>Further down</p>
      </Reveal>
    );
    const el = block(screen.getByText('Further down'));
    expect(el.dataset.reveal).toBe('armed');
    // A first callback proves the observer works, so the failsafe must not fire and
    // pre-empt the scroll reveal.
    vi.advanceTimersByTime(2000);
    expect(el.dataset.reveal).toBe('armed');
    expect(spy.disconnected).toBe(0);
  });

  it('disconnects the observer on unmount', () => {
    makePageScrollable(5000);
    const spy = stubObserver();
    const { unmount } = render(
      <Reveal>
        <p>Unmounted</p>
      </Reveal>
    );
    unmount();
    expect(spy.disconnected).toBe(1);
  });

  it('passes className and the element type through to the wrapper', () => {
    render(
      <Reveal className="col-start-2 col-end-8" as="section" delay={120}>
        <p>Placed</p>
      </Reveal>
    );
    const el = block(screen.getByText('Placed'));
    expect(el.tagName).toBe('SECTION');
    expect(el).toHaveClass('col-start-2', 'col-end-8');
    expect(el.style.getPropertyValue('--reveal-delay')).toBe('120ms');
  });
});
