import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import InHerWords from './in-her-words';
import { siteCopy } from '@/lib/content/site-copy';

const quotes = siteCopy.home.testimonials;

/** The one quote on screen: a `blockquote` is the only element that ever holds one. */
const visibleQuotes = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('blockquote')).map(node => node.textContent);

const next = () => screen.getByRole('button', { name: /next/i });
const previous = () => screen.getByRole('button', { name: /previous/i });

describe('InHerWords', () => {
  it('renders one quote at a time in the display family', () => {
    const { container } = render(<InHerWords />);

    expect(visibleQuotes(container)).toEqual([quotes[0].quote]);
    for (const other of quotes.slice(1)) {
      expect(screen.queryByText(other.quote)).toBeNull();
    }

    const blockquote = container.querySelector('blockquote')!;
    expect(blockquote.className).toMatch(/\bfont-display\b/);
    expect(blockquote.className).toMatch(/\btext-display-2\b/);
  });

  it('keeps the heading at page level and the quote under it as an h2', () => {
    render(<InHerWords />);
    expect(
      screen.getByRole('heading', { level: 2, name: siteCopy.home.testimonialsHeading })
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: siteCopy.home.about.heading })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
  });

  it('advances to the next quote on control activation and is keyboard operable', () => {
    const { container } = render(<InHerWords />);
    expect(quotes).toHaveLength(5);
    expect(screen.getByText('01 / 05')).toBeInTheDocument();

    // Native buttons: focusable, in the tab order, and Enter/Space fire click.
    for (const control of [previous(), next()]) {
      expect(control.tagName).toBe('BUTTON');
      expect(control).not.toHaveAttribute('tabindex', '-1');
      control.focus();
      expect(document.activeElement).toBe(control);
    }

    fireEvent.click(next());
    expect(visibleQuotes(container)).toEqual([quotes[1].quote]);
    expect(screen.getByText('02 / 05')).toBeInTheDocument();

    // All five are reachable, in order, and the last wraps to the first.
    for (let i = 2; i < quotes.length; i += 1) {
      fireEvent.click(next());
      expect(visibleQuotes(container)).toEqual([quotes[i].quote]);
    }
    fireEvent.click(next());
    expect(visibleQuotes(container)).toEqual([quotes[0].quote]);

    // And backwards from the first.
    fireEvent.click(previous());
    expect(visibleQuotes(container)).toEqual([quotes[4].quote]);
  });

  it('draws a visible focus ring on both controls', () => {
    render(<InHerWords />);
    for (const control of [previous(), next()]) {
      expect(control.className).toMatch(/focus-visible:outline/);
    }
  });

  it('announces a change politely, around the quote and nothing else', () => {
    const { container } = render(<InHerWords />);
    const live = container.querySelector('[aria-live]');

    expect(live).toHaveAttribute('aria-live', 'polite');
    expect(live?.contains(container.querySelector('blockquote'))).toBe(true);
    expect(live?.contains(next())).toBe(false);
    expect(container.querySelectorAll('[aria-live]')).toHaveLength(1);
  });

  it('never advances on its own: no timers, so the reader keeps their place', () => {
    const interval = vi.spyOn(window, 'setInterval');
    const { container } = render(<InHerWords />);

    expect(interval).not.toHaveBeenCalled();
    expect(container.innerHTML).not.toMatch(/autoplay/i);
    interval.mockRestore();
  });

  it('renders the About paragraph and both stats verbatim', () => {
    render(<InHerWords />);
    const { about } = siteCopy.home;

    // The paragraph carries the decoded apostrophe, not the `&apos;` the old markup used.
    expect(screen.getByText(about.body)).toBeInTheDocument();
    expect(about.body).toContain("This year's showcase");
    expect(about.stats).toEqual([
      { value: '15', label: 'Years of Excellence' },
      { value: '5000+', label: 'Happy Clients' },
    ]);
    for (const stat of about.stats) {
      expect(screen.getByText(stat.value)).toBeInTheDocument();
      expect(screen.getByText(stat.label)).toBeInTheDocument();
    }
  });

  it('keeps the About paragraph on screen however the quotes are paged', () => {
    render(<InHerWords />);
    fireEvent.click(next());
    fireEvent.click(next());
    expect(screen.getByText(siteCopy.home.about.body)).toBeInTheDocument();
    expect(screen.getByText('5000+')).toBeInTheDocument();
  });

  it('renders no attribution line, since all names are empty', () => {
    const { container } = render(<InHerWords />);
    expect(quotes.every(entry => entry.name === '')).toBe(true);

    // No byline element, no dash-led credit, and nothing standing in for a name.
    expect(container.querySelector('figcaption, cite, footer')).toBeNull();
    expect(container.textContent).not.toMatch(/[—–]/);
    for (let i = 0; i < quotes.length; i += 1) {
      expect(container.querySelector('blockquote')?.textContent).toBe(quotes[i].quote);
      fireEvent.click(next());
    }
  });

  it('treats the five customer photographs as decoration, since the quote carries the meaning', () => {
    const { container } = render(<InHerWords />);
    for (let i = 0; i < quotes.length; i += 1) {
      const photo = container.querySelector(`img[src*="${encodeURIComponent(quotes[i].image)}"]`);
      expect(photo).not.toBeNull();
      expect(photo).toHaveAttribute('alt', '');
      fireEvent.click(next());
    }
  });

  /**
   * **The quote and its photograph are a pair, not a quote with a stamp beside it.**
   *
   * They were already side by side from `md`, but at three columns against seven the
   * photograph was 296 x 444 beside a 620px-tall block of type — small enough to read as
   * decoration rather than as the other half of the testimonial. At four columns it is
   * 411 x 616, which is the quote block's own height to within four pixels, so the two
   * genuinely pair. The quote keeps its seven columns, so this costs the section nothing.
   */
  it('pairs the quote with a photograph of its own height, not a corner stamp', () => {
    const { container } = render(<InHerWords />);
    const photo = container.querySelector(`img[src*="${encodeURIComponent(quotes[0].image)}"]`)!;
    const slot = photo.closest<HTMLElement>('[class*="md:col-span-"]')!;
    const quoteSlot = container
      .querySelector('blockquote')!
      .closest<HTMLElement>('[class*="md:col-span-"]')!;

    expect(slot.className).toMatch(/\bmd:col-span-4\b/);
    expect(slot.className).toMatch(/\bmd:col-start-9\b/);
    expect(quoteSlot.className).toMatch(/\bmd:col-span-7\b/);
    expect(quoteSlot.className).toMatch(/\bmd:col-start-2\b/);
    // The two sit in the same editorial row, which is what makes them a pair.
    expect(slot.parentElement).toBe(quoteSlot.parentElement);
    // Stacked on a phone, where a half-width quote at display-2 would be unreadable.
    expect(slot.className).toMatch(/\bcol-span-8\b/);
  });

  /**
   * Measured in Chrome at both edges of every band, as every image surface on this page is:
   * 232px at 390 (eight of twelve columns), 455px at 767, 224px at 768, 309px at 1023,
   * 277px at 1024, 416px at 1439 and a fixed 416px from 1440 up.
   */
  it('hints both photographs at the widths this movement renders them', () => {
    const { container } = render(<InHerWords />);
    const quotePhoto = container.querySelector(`img[src*="${encodeURIComponent(quotes[0].image)}"]`);
    const aboutPhoto = container.querySelector(
      `img[src*="${encodeURIComponent(siteCopy.home.about.image)}"]`
    );
    const expected =
      '(min-width: 1440px) 416px, (min-width: 1024px) 29vw, (min-width: 768px) 31vw, calc(67vw - 32px)';
    expect(quotePhoto).toHaveAttribute('sizes', expected);
    // The About photograph sits in the same four-column slot, so it takes the same hint.
    expect(aboutPhoto).toHaveAttribute(
      'sizes',
      '(min-width: 1440px) 416px, (min-width: 1024px) 29vw, (min-width: 768px) 31vw, calc(100vw - 48px)'
    );
  });

  it('shows the About photograph with its real alt text', () => {
    render(<InHerWords />);
    expect(screen.getByRole('img', { name: siteCopy.home.about.imageAlt })).toBeInTheDocument();
  });

  it('never dims prose with an opacity utility, so contrast stays above AA', () => {
    const { container } = render(<InHerWords />);
    // `disabled:opacity-50` on a button is the primitive's own; a bare utility is the hazard.
    expect(container.innerHTML).not.toMatch(/(^|[\s"'])opacity-\d+/);
  });

  it('carries none of the retired chrome: stars, pills, shadows, grey grounds', () => {
    const { container } = render(<InHerWords />);
    const html = container.innerHTML;
    expect(html).not.toMatch(/rounded-(2xl|3xl|full)|shadow|bg-gray|text-gray|gradient|#FF532E/);
    expect(container.querySelector('svg[viewBox="0 0 22 20"]')).toBeNull();
    expect(container.querySelector('section')?.className).toMatch(/bg-paper/);
  });
});
