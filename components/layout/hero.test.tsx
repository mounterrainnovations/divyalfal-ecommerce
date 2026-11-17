import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { siteCopy } from '@/lib/content/site-copy';

/**
 * The desktop/mobile split is `useMedia`, exactly as before the revamp, so the hook is
 * mocked rather than stubbed through `window.matchMedia`: that pins *which* breakpoint the
 * hero asks for as well as what it renders on either side of it.
 */
const useMedia = vi.hoisted(() => vi.fn<(query: string) => boolean>());
vi.mock('@/lib/hooks/useMedia', () => ({ useMedia }));

import Hero from './hero';

const { wordmark, desktopImage, mobileVideo } = siteCopy.home.hero;

/** Every class token rendered anywhere inside a container, as tokens rather than substrings. */
const classTokens = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('[class]')).flatMap((node) =>
    (node.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)
  );

/**
 * The overlay that holds the wordmark, found by what it is rather than by walking up from the
 * heading. `closest('div')?.parentElement` pinned the exact nesting depth, so wrapping the
 * heading in one more element would have broken the test without changing the behaviour it
 * tests.
 */
const overlayOf = (container: HTMLElement) =>
  container.querySelector('section > div[class~="absolute"][class~="inset-0"][class~="flex"]');

describe('Hero', () => {
  beforeEach(() => {
    useMedia.mockReset();
    useMedia.mockReturnValue(false);
  });

  it('renders the wordmark over the media as the page h1', () => {
    render(<Hero />);
    const heading = screen.getByRole('heading', { level: 1, name: wordmark });
    expect(heading).toBeInTheDocument();
  });

  it('uppercases the wordmark in CSS, never in the copy', () => {
    // siteCopy.home.hero.wordmark is the verbatim string and must stay mixed case.
    expect(wordmark).toBe('Divyafal');
    render(<Hero />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toBe(wordmark);
    expect(heading).toHaveClass('uppercase');
  });

  it('asks useMedia for the 768px split and keeps the desktop image behind the wordmark', () => {
    const { container } = render(<Hero />);
    expect(useMedia).toHaveBeenCalledWith('(max-width: 768px)');
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toContain('mock_hero_desktop_2.webp');
    expect(desktopImage).toBe('/mocks/mock_hero_desktop_2.webp');
    // The wordmark names the hero; the photograph is decoration, not an alternative to it.
    expect(img).toHaveAttribute('alt', '');
    expect(container.querySelector('video')).toBeNull();
  });

  it('keeps the mobile video source and marks it decorative', () => {
    useMedia.mockReturnValue(true);
    const { container } = render(<Hero />);
    const video = container.querySelector('video');
    expect(video).not.toBeNull();
    expect(video).toHaveAttribute('src', mobileVideo);
    expect(mobileVideo).toContain('bg_video.webm');
    expect(video?.muted).toBe(true);
    expect(video?.hasAttribute('playsinline')).toBe(true);
    expect(video).toHaveAttribute('aria-hidden', 'true');
    expect(video?.hasAttribute('controls')).toBe(false);
    expect(container.querySelector('img')).toBeNull();
  });

  it('holds a full viewport height with no inset frame around the media', () => {
    const { container } = render(<Hero />);
    const section = container.querySelector('section');
    expect(section?.className).toMatch(/h-\[100svh\]/);
    // The pre-revamp hero floated the media inside a `p-6 … rounded-md` card.
    expect(container.innerHTML).not.toMatch(/\brounded-/);
    // Tokens, not substrings: `[class*="p-6"]` also matched `gap-6` and `top-6`, so it passed
    // for reasons that had nothing to do with an inset frame. Any all-round padding would be
    // the card coming back; the grid's own inline padding comes from `grid-editorial`.
    expect(classTokens(container).filter((token) => /^p-\d/.test(token))).toEqual([]);
  });

  /**
   * The two contrast-critical values in the hero, and the only ones worth pinning: deleting
   * either left every other test in this file green.
   *
   * Both are measured, per medium, against the brightest pixel under the glyph strokes (not
   * over the wordmark's whole bounding box -- a bright pixel in a letter gap is not behind
   * any type):
   *
   *  - desktop still, 1280/1440/1920: 35% clears 3:1 against paper everywhere.
   *  - mobile `bg_video.webm` at 390, and the same footage at portrait tablet 768x1024 where
   *    `object-cover` crops it differently: 35% does NOT. Sampled across 11 frames, the worst
   *    stroke pixel sat at 2.15:1 (390) and 2.28:1 (768), and in one frame 18% of the
   *    wordmark's strokes were under 3:1 -- the footage carries near-white highlights (sRGB
   *    ~253) that a 35% wash cannot hold down. 50% brings that worst pixel to 3.3:1.
   *
   * Numbers and per-frame tables: `.superpowers/sdd/2026-11-16-storefront-revamp/task-13-report.md`.
   */
  it('washes the desktop still at the measured 35%', () => {
    const { container } = render(<Hero />);
    const wash = container.querySelector('[class~="bg-ink/35"]');
    expect(wash).not.toBeNull();
    expect(wash).toHaveAttribute('aria-hidden', 'true');
    expect(wash?.className).toMatch(/\babsolute\b/);
    expect(wash?.className).toMatch(/\binset-0\b/);
    expect(container.querySelector('[class~="bg-ink/50"]')).toBeNull();
  });

  it('washes the mobile and portrait-tablet video at the measured 50%', () => {
    useMedia.mockReturnValue(true);
    const { container } = render(<Hero />);
    const wash = container.querySelector('[class~="bg-ink/50"]');
    expect(wash).not.toBeNull();
    expect(wash).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('[class~="bg-ink/35"]')).toBeNull();
    // Driven by the same `useMedia` answer that picks the media, not by a `md:` variant:
    // `md:` is min-width 768 while the video is max-width 768, so at exactly 768 a variant
    // would put the still's wash over the video.
    expect(container.innerHTML).not.toMatch(/md:bg-ink/);
  });

  it('keeps the wash a wash: one flat ink opacity, never black and never a scrim', () => {
    for (const mobile of [false, true]) {
      useMedia.mockReturnValue(mobile);
      const { container, unmount } = render(<Hero />);
      expect(container.innerHTML).not.toMatch(/bg-black|bg-ink\/(?:[6-9]\d|100)\b/);
      expect(container.innerHTML).not.toMatch(/gradient/);
      unmount();
    }
  });

  it('preloads the desktop still with `preload`, not the deprecated `priority` prop', () => {
    const { container } = render(<Hero />);
    // `preload` makes next/image skip lazy loading. `priority` is the Next 16 deprecation and
    // must not come back; either way the above-the-fold still must never be lazy.
    expect(container.querySelector('img')).not.toHaveAttribute('loading', 'lazy');
    expect(container.innerHTML).not.toMatch(/\bpriority\b/);
  });

  it('centres the wordmark clear of the headline burned into the hero asset', () => {
    // mock_hero_desktop_2.webp is a 1100x550 composite carrying its own headline from 74.5%
    // of its height down. It is wider than any hero frame, so object-cover always scales it
    // by height and that headline always occupies the bottom quarter. A baseline-aligned
    // wordmark collides with it; this pins the clearance until the asset is replaced.
    const { container } = render(<Hero />);
    const overlay = overlayOf(container);
    expect(overlay).not.toBeNull();
    expect(overlay?.contains(screen.getByRole('heading', { level: 1 }))).toBe(true);
    expect(overlay?.className).toMatch(/items-center/);
    expect(overlay?.className).not.toMatch(/\bitems-end\b|\bbottom-0\b/);
    expect(container.querySelector('.grid-editorial')).not.toBeNull();
  });

  it('uses the CSS-only load reveal on the media, not the scroll-triggered Reveal primitive', () => {
    const { container } = render(<Hero />);
    expect(container.querySelector('.reveal-image')).not.toBeNull();
    // Reveal arms blocks with data-reveal and is for below-the-fold content only.
    expect(container.querySelector('[data-reveal]')).toBeNull();
  });

  /**
   * The wordmark paints immediately, and that is a measured decision, not an oversight.
   *
   * It is the page's LCP element on mobile. With `reveal-text` on it -- 180ms of stagger plus
   * a 700ms fade -- Chrome recorded LCP at 881ms and Lighthouse's throttled model turned that
   * into 3.8s, holding mobile `/` performance at 88 against a target of 90. Two controlled
   * runs proved it was the animation and nothing else: blocking all 4.6MB of remote media
   * moved the score by zero, while forcing reduced motion (which disables the fade) moved it
   * to 95 and the observed LCP to 153ms.
   *
   * So the hero's entrance is carried by `reveal-image` on the media alone. The spec's motion
   * budget is intact: the image still reveals, and every staggered text reveal below the fold
   * is untouched. `reveal-text` is still the right tool for above-the-fold text that is not
   * the LCP element.
   */
  it('does not animate the wordmark, which is the LCP element', () => {
    for (const mobile of [false, true]) {
      useMedia.mockReturnValue(mobile);
      const { container, unmount } = render(<Hero />);
      const wordmark = screen.getByRole('heading', { level: 1 });
      expect(wordmark).not.toHaveClass('reveal-text');
      expect(wordmark.className).not.toMatch(/\breveal-/);
      expect(wordmark.closest('[style*="--reveal-delay"]')).toBeNull();
      // The media keeps its reveal: the hero still has an entrance.
      expect(container.querySelector('.reveal-image')).not.toBeNull();
      unmount();
    }
  });

  it('uses no pill, gradient, shadow or grey-scale utility classes', () => {
    const { container } = render(<Hero />);
    expect(container.innerHTML).not.toMatch(
      /rounded-full|rounded-3xl|gradient|shadow|(?:text|bg)-gray-/
    );
    // Opacity never goes on type. The wash is `bg-ink/35`; the wordmark is a flat `text-paper`.
    expect(container.innerHTML).not.toMatch(/\btext-[A-Za-z0-9_-]+\/\d/);
  });

  it('leaves the decorative video out of the tab order without a redundant tabIndex', () => {
    useMedia.mockReturnValue(true);
    const { container } = render(<Hero />);
    const video = container.querySelector('video');
    // A <video> with no `controls` is not focusable, so `tabIndex={-1}` asserted nothing; an
    // aria-hidden element that *were* focusable would be an axe aria-hidden-focus violation
    // to fix rather than something to paper over.
    expect(video?.hasAttribute('controls')).toBe(false);
    expect(video?.hasAttribute('tabindex')).toBe(false);
  });
});
