import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { siteCopy } from '@/lib/content/site-copy';

import Hero from './hero';

const { wordmark, desktopImage, mobileVideo } = siteCopy.home.hero;

const PHONE = '(max-width: 768px)';

/** Every class token rendered anywhere inside a container, as tokens rather than substrings. */
const classTokens = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('[class]')).flatMap(node =>
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

/** The flat wash: the one `aria-hidden` plate between the media and the wordmark overlay. */
const washOf = (container: HTMLElement) =>
  container.querySelector('section > div[aria-hidden="true"]');

/**
 * A controllable `matchMedia`. jsdom ships none, and the hero subscribes to one so that a
 * desktop window dragged under 768px re-runs the video's source selection.
 */
function stubMatchMedia(initial: boolean) {
  const listeners = new Set<() => void>();
  let matches = initial;
  vi.stubGlobal('matchMedia', (query: string) => ({
    get matches() {
      return matches;
    },
    media: query,
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  }));
  return {
    flip(next: boolean) {
      matches = next;
      for (const listener of listeners) listener();
    },
    get subscribers() {
      return listeners.size;
    },
  };
}

describe('Hero', () => {
  beforeEach(() => {
    stubMatchMedia(false);
    // jsdom implements neither; the hero calls load() when the media query flips.
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders the wordmark over the media as the page h1', () => {
    render(<Hero />);
    expect(screen.getByRole('heading', { level: 1, name: wordmark })).toBeInTheDocument();
  });

  it('uppercases the wordmark in CSS, never in the copy', () => {
    // siteCopy.home.hero.wordmark is the verbatim string and must stay mixed case.
    expect(wordmark).toBe('Divyafal');
    render(<Hero />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toBe(wordmark);
    expect(heading).toHaveClass('uppercase');
  });

  /**
   * The finding this component was rebuilt for.
   *
   * It used to pick its medium with `useMedia('(max-width: 768px)')`, and `useMedia`
   * initialises `false` — so the server rendered the desktop branch for every client. The live
   * SSR HTML carried `<link rel="preload" as="image" … imageSizes="100vw">` for the desktop
   * still and no `bg_video.webm` at all: a 390px phone fetched a landscape still at preload
   * priority, painted it, then replaced the whole hero on hydration.
   *
   * So the check is on the *server* markup, with no effects run and no media query answered:
   * both media have to be in it, each behind a `media` attribute, or the phone is being served
   * the desktop hero again.
   */
  it('emits both media in the server HTML, each gated by a media query', () => {
    const html = renderToStaticMarkup(<Hero />);

    // The footage is there at all -- it was not, for any client, before this.
    expect(html).toContain(mobileVideo);
    expect(html).toContain(`media="${PHONE}"`);
    // And so is the still, as a next/image srcSet.
    expect(html).toContain('%2Fsamples%2Fhero%2Fhero-golden-warp-on-the-loom.webp');
    expect(desktopImage).toBe('/samples/hero/hero-golden-warp-on-the-loom.webp');
    // Nothing in the decision is JavaScript: the markup does not differ by hook answer.
    expect(renderToStaticMarkup(<Hero />)).toBe(html);
  });

  it('gates the footage with `media` on the source, never a `src` a CSS hidden cannot stop', () => {
    const { container } = render(<Hero />);
    const video = container.querySelector('video');
    expect(video).not.toBeNull();

    // `autoplay` overrides `preload="none"` in every engine that implements it, so a
    // display:none video carrying a `src` still downloads the clip. Proven earlier on this
    // branch, in the spotlight band. The bytes are saved by the unmatched source, not by CSS.
    expect(video?.hasAttribute('src')).toBe(false);
    const source = video?.querySelector('source');
    expect(source).toHaveAttribute('src', mobileVideo);
    expect(source).toHaveAttribute('media', PHONE);
    expect(source).toHaveAttribute('type', 'video/webm');
    expect(mobileVideo).toContain('bg_video.webm');

    expect(video?.muted).toBe(true);
    expect(video?.hasAttribute('playsinline')).toBe(true);
    expect(video).toHaveAttribute('aria-hidden', 'true');
    expect(video?.hasAttribute('controls')).toBe(false);
  });

  it('gives a phone a 43-byte inline candidate for the still, so none of it is requested', () => {
    const { container } = render(<Hero />);
    const picture = container.querySelector('picture');
    expect(picture).not.toBeNull();

    // `<picture>`'s `<img>` is its mandatory fallback and loads whenever no source matches, so
    // "desktops only" has to be said by giving the phone something free rather than by
    // leaving it out.
    const source = picture?.querySelector('source');
    expect(source).toHaveAttribute('media', PHONE);
    expect(source?.getAttribute('srcset') ?? '').toMatch(/^data:image\/gif;base64,/);

    // A desktop matches no source and falls through to the img's own responsive set.
    const img = picture?.querySelector('img');
    expect(img).toHaveAttribute('alt', '');
    expect(img?.getAttribute('srcset') ?? '').toContain('hero-golden-warp-on-the-loom');
    expect(img).toHaveAttribute('sizes', '100vw');
  });

  it('preloads the still only where the still is shown', () => {
    const html = renderToStaticMarkup(<Hero />);
    // The old hint had no `media`, which is exactly why every phone paid for it.
    expect(html).toMatch(/<link[^>]*rel="preload"[^>]*as="image"/);
    expect(html).toContain(`media="not all and ${PHONE}"`);
    // Still high priority -- it is the desktop LCP element.
    expect(html).toMatch(/fetchPriority="high"/i);
  });

  it('never lazy-loads the above-the-fold still, and never uses the deprecated `priority`', () => {
    const { container } = render(<Hero />);
    const img = container.querySelector('picture img');
    expect(img).toHaveAttribute('loading', 'eager');
    expect(img).not.toHaveAttribute('loading', 'lazy');
    // `priority` is the Next 16 deprecation; `preload` is deliberately not passed either,
    // because it is the prop that emitted the ungated hint.
    expect(container.innerHTML).not.toMatch(/\bpriority="/);
  });

  /**
   * The resize case, and only the resize case. Source selection inside a `<video>` runs once
   * and does not re-run when a media query flips, so a desktop window dragged under 768px
   * would find a `<video>` with no chosen resource. `<picture>` re-picks on its own.
   *
   * The first paint does not depend on this: it is correct from the markup alone.
   */
  it('re-runs the video source selection when the 768px query flips', () => {
    const media = stubMatchMedia(false);
    const load = vi
      .spyOn(HTMLMediaElement.prototype, 'load')
      .mockImplementation(() => {});

    const { unmount } = render(<Hero />);
    expect(media.subscribers).toBe(1);
    expect(load).not.toHaveBeenCalled();

    media.flip(true);
    expect(load).toHaveBeenCalledTimes(1);

    unmount();
    expect(media.subscribers).toBe(0);
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
    expect(classTokens(container).filter(token => /^p-\d/.test(token))).toEqual([]);
  });

  /**
   * The two contrast-critical values in the hero, and the only ones worth pinning: deleting
   * either left every other test in this file green.
   *
   * Both are measured, per medium, against the brightest pixel under the glyph strokes (not
   * over the wordmark's whole bounding box -- a bright pixel in a letter gap is not behind
   * any type):
   *
   *  - desktop still: needs none. The placeholder black-silk still measures 9.26:1 (1440) and
   *    9.55:1 (1920) at its worst stroke pixel with no wash; the previous photograph needed 35%.
   *  - mobile `bg_video.webm` at 390, and the same footage at portrait tablet 768x1024 where
   *    `object-cover` crops it differently: 35% does NOT. Sampled across 11 frames, the worst
   *    stroke pixel sat at 2.15:1 (390) and 2.28:1 (768), and in one frame 18% of the
   *    wordmark's strokes were under 3:1 -- the footage carries near-white highlights (sRGB
   *    ~253) that a 35% wash cannot hold down. 50% brings that worst pixel to 3.3:1.
   *
   * Numbers and per-frame tables: `.superpowers/sdd/2026-11-16-storefront-revamp/task-13-report.md`.
   *
   * The wash is now one element carrying a `max-[768px]:` variant rather than a conditionally
   * rendered one: the medium is chosen by CSS, so its treatment has to be too, on the same
   * 768 boundary. Above 768 it declares no background at all, which is the still's measured 0%.
   */
  it('washes the video at the measured 50% and the still at nothing, in CSS', () => {
    const { container } = render(<Hero />);
    const wash = washOf(container);
    expect(wash).not.toBeNull();
    expect(wash?.className).toMatch(/max-\[768px\]:bg-ink\/50/);
    expect(wash?.className).toMatch(/\babsolute\b/);
    expect(wash?.className).toMatch(/\binset-0\b/);

    // No unconditional wash: the still's measured floor is 0%, so above 768 there is none.
    expect(container.querySelector('[class~="bg-ink/50"]')).toBeNull();
    expect(container.querySelector('[class~="bg-ink/35"]')).toBeNull();
    expect(container.querySelector('[class~="max-[768px]:bg-ink/35"]')).toBeNull();
    // Driven by the max-width variant, not by `md:`: `md:` is min-width 768 while the video is
    // max-width 768, so at exactly 768 a `md:` variant would put the still's treatment over
    // the video -- which is the one width this measured.
    expect(container.innerHTML).not.toMatch(/md:bg-ink/);
  });

  it('keeps the wash a wash: one flat ink opacity, never black and never a scrim', () => {
    const { container } = render(<Hero />);
    expect(container.innerHTML).not.toMatch(/bg-black|bg-ink\/(?:[6-9]\d|100)\b/);
    expect(container.innerHTML).not.toMatch(/gradient/);
  });

  it('sets the wordmark on the baseline, columns 2-7, bottom-aligned', () => {
    // The previous still carried a headline burned into its bottom quarter, which forced the
    // wordmark to the vertical centre. The stand-in has no text, so it is back on the baseline.
    const { container } = render(<Hero />);
    const overlay = overlayOf(container);
    expect(overlay).not.toBeNull();
    const heading = screen.getByRole('heading', { level: 1 });
    expect(overlay?.contains(heading)).toBe(true);
    expect(overlay?.className).toMatch(/(?:^|\s)items-end(?:\s|$)/);
    expect(overlay?.className).not.toMatch(/(?:^|\s)items-center(?:\s|$)/);
    expect(container.querySelector('.grid-editorial')).not.toBeNull();
    expect(heading).toHaveClass('md:col-span-6');
    expect(heading).toHaveClass('md:col-start-2');
  });

  /**
   * Measured, and the reason the media split had to move into the markup without taking the
   * wordmark with it: a state-driven alignment painted the phone's wordmark on the baseline
   * and then jumped it to the centre on hydration -- 0.052 CLS on mobile `/`, the page's only
   * layout shift. The position stays a CSS variant on the same 768 boundary.
   */
  it('keeps the wordmark centred at the video breakpoint, in CSS rather than state', () => {
    const { container } = render(<Hero />);
    const overlay = overlayOf(container);
    expect(overlay?.className).toMatch(/max-\[768px\]:items-center/);
    expect(overlay?.className).toMatch(/max-\[768px\]:pb-0/);
    // And it is the same in the server markup, so there is nothing for hydration to move.
    expect(renderToStaticMarkup(<Hero />)).toContain('max-[768px]:items-center');
  });

  it('uses the CSS-only load reveal on both media, not the scroll-triggered Reveal primitive', () => {
    const { container } = render(<Hero />);
    expect(container.querySelector('picture img.reveal-image')).not.toBeNull();
    expect(container.querySelector('video.reveal-image')).not.toBeNull();
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
    const { container } = render(<Hero />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).not.toHaveClass('reveal-text');
    expect(heading.className).not.toMatch(/\breveal-/);
    expect(heading.closest('[style*="--reveal-delay"]')).toBeNull();
    // The media keeps its reveal: the hero still has an entrance.
    expect(container.querySelector('.reveal-image')).not.toBeNull();
  });

  it('uses no pill, gradient, shadow or grey-scale utility classes', () => {
    const { container } = render(<Hero />);
    expect(container.innerHTML).not.toMatch(
      /rounded-full|rounded-3xl|gradient|shadow|(?:text|bg)-gray-/
    );
    // Opacity never goes on type. The video's wash is `bg-ink/50`; the wordmark is a flat
    // `text-paper`.
    expect(container.innerHTML).not.toMatch(/\btext-[A-Za-z0-9_-]+\/\d/);
  });

  it('leaves the decorative video out of the tab order without a redundant tabIndex', () => {
    const { container } = render(<Hero />);
    const video = container.querySelector('video');
    // A <video> with no `controls` is not focusable, so `tabIndex={-1}` asserted nothing; an
    // aria-hidden element that *were* focusable would be an axe aria-hidden-focus violation
    // to fix rather than something to paper over.
    expect(video?.hasAttribute('controls')).toBe(false);
    expect(video?.hasAttribute('tabindex')).toBe(false);
  });
});
