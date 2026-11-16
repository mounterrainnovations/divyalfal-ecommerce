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
    expect(container.querySelector('[class*="p-6"], [class*="p-8"], [class*="p-12"]')).toBeNull();
  });

  it('centres the wordmark clear of the headline burned into the hero asset', () => {
    // mock_hero_desktop_2.webp is a 1100x550 composite carrying its own headline from 74.5%
    // of its height down. It is wider than any hero frame, so object-cover always scales it
    // by height and that headline always occupies the bottom quarter. A baseline-aligned
    // wordmark collides with it; this pins the clearance until the asset is replaced.
    const { container } = render(<Hero />);
    const overlay = screen.getByRole('heading', { level: 1 }).closest('div')?.parentElement;
    expect(overlay?.className).toMatch(/items-center/);
    expect(overlay?.className).not.toMatch(/\bitems-end\b|\bbottom-0\b/);
    expect(container.querySelector('.grid-editorial')).not.toBeNull();
  });

  it('uses the CSS-only load reveals, not the scroll-triggered Reveal primitive', () => {
    const { container } = render(<Hero />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveClass('reveal-text');
    expect(container.querySelector('.reveal-image')).not.toBeNull();
    // Reveal arms blocks with data-reveal and is for below-the-fold content only.
    expect(container.querySelector('[data-reveal]')).toBeNull();
  });

  it('uses no pill, gradient, shadow or grey-scale utility classes', () => {
    const { container } = render(<Hero />);
    expect(container.innerHTML).not.toMatch(
      /rounded-full|rounded-3xl|gradient|shadow|(?:text|bg)-gray-/
    );
  });
});
