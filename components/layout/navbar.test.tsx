import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { siteCopy } from '@/lib/content/site-copy';

/**
 * The nav asks the router where it is: the home route is the only one whose first frame is
 * a photograph, so it is the only one that starts transparent over imagery.
 */
const usePathname = vi.hoisted(() => vi.fn<() => string>());
vi.mock('next/navigation', () => ({ usePathname }));

import NavBar from './navbar';

const PRIMARY = [
  { name: 'Shop', href: '/products' },
  { name: 'Sale', href: '/sale' },
  { name: 'Virasat Academy', href: '/virasat-academy' },
  { name: 'Contact', href: '/contact-us' },
];

function scrollTo(y: number) {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true, writable: true });
  act(() => {
    window.dispatchEvent(new Event('scroll'));
  });
}

describe('NavBar', () => {
  beforeEach(() => {
    usePathname.mockReset();
    usePathname.mockReturnValue('/');
    document.body.style.overflow = '';
    scrollTo(0);
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  it('renders the primary links with the routes the site already has', () => {
    render(<NavBar />);
    const nav = screen.getByRole('navigation', { name: 'Primary' });

    for (const { name, href } of PRIMARY) {
      expect(within(nav).getByRole('link', { name })).toHaveAttribute('href', href);
    }
    // The hrefs are the real ones, not guesses: each exists in the nav copy.
    const known = siteCopy.nav.items.map(item => item.href);
    for (const { href } of PRIMARY) expect(known).toContain(href);
  });

  it('sets the brand wordmark as a link home, uppercased in CSS and never in the copy', () => {
    render(<NavBar />);
    const brand = screen.getByRole('link', { name: siteCopy.home.hero.wordmark });
    expect(brand).toHaveAttribute('href', '/');
    expect(brand.textContent).toBe('Divyafal');
    expect(brand).toHaveClass('uppercase');
    expect(brand).toHaveClass('font-display');
  });

  it('sets links in Jost at 11px with 0.18em tracking, uppercase', () => {
    render(<NavBar />);
    const link = screen.getByRole('link', { name: 'Shop' });
    expect(link).toHaveClass('font-ui', 'text-eyebrow', 'uppercase', 'tracking-[0.18em]');
  });

  it('wraps everything in a banner landmark', () => {
    render(<NavBar />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('marks the current page for assistive technology', () => {
    usePathname.mockReturnValue('/sale');
    render(<NavBar />);
    expect(screen.getByRole('link', { name: 'Sale' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Shop' })).not.toHaveAttribute('aria-current');
  });

  it('gives the menu toggle an accessible name and a closed state', () => {
    render(<NavBar />);
    const toggle = screen.getByRole('button', { name: 'Open menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAttribute('aria-haspopup', 'dialog');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens a full-screen menu on mobile and traps focus while open', async () => {
    const user = userEvent.setup();
    render(<NavBar />);
    const toggle = screen.getByRole('button', { name: 'Open menu' });
    await user.click(toggle);

    const dialog = screen.getByRole('dialog', { name: 'Site menu' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveClass('fixed', 'inset-0');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    const mobileNav = within(dialog).getByRole('navigation', { name: 'Mobile' });
    for (const { name, href } of PRIMARY) {
      expect(within(mobileNav).getByRole('link', { name })).toHaveAttribute('href', href);
    }

    // Focus moves into the dialog, onto its close control.
    const close = within(dialog).getByRole('button', { name: 'Close menu' });
    expect(close).toHaveFocus();

    // Forward from the last focusable wraps to the first, and backward from the first to the last.
    const focusables = Array.from(dialog.querySelectorAll<HTMLElement>('a[href], button'));
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    expect(last).toHaveAttribute('href', '/contact-us');
    last.focus();
    await user.tab();
    expect(first).toHaveFocus();
    await user.tab({ shift: true });
    expect(last).toHaveFocus();

    // And a long run of tabs never leaves the dialog.
    for (let i = 0; i < 12; i += 1) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  });

  it('closes the menu on Escape and returns focus to the toggle', async () => {
    const user = userEvent.setup();
    render(<NavBar />);
    const toggle = screen.getByRole('button', { name: 'Open menu' });
    await user.click(toggle);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(toggle).toHaveFocus();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes from its own close control and returns focus to the toggle', async () => {
    const user = userEvent.setup();
    render(<NavBar />);
    const toggle = screen.getByRole('button', { name: 'Open menu' });
    await user.click(toggle);
    await user.click(screen.getByRole('button', { name: 'Close menu' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(toggle).toHaveFocus();
  });

  it('closes when a destination is chosen', async () => {
    const user = userEvent.setup();
    // jsdom cannot navigate; swallow the default so the click only exercises our handler.
    const stop = (event: Event) => event.preventDefault();
    document.addEventListener('click', stop);
    render(<NavBar />);
    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('link', { name: 'Sale' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    document.removeEventListener('click', stop);
  });

  it('closes the menu when the route changes under it', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<NavBar />);
    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    usePathname.mockReturnValue('/sale');
    rerender(<NavBar />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('locks body scroll while the menu is open and restores what was there', async () => {
    const user = userEvent.setup();
    document.body.style.overflow = 'scroll';
    render(<NavBar />);

    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(document.body.style.overflow).toBe('hidden');

    await user.keyboard('{Escape}');
    expect(document.body.style.overflow).toBe('scroll');
  });

  it('restores body scroll if the nav unmounts while the menu is open', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<NavBar />);
    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('condenses once scrolled, taking the paper ground and the one soft lift', () => {
    render(<NavBar />);
    const banner = screen.getByRole('banner');

    expect(banner).toHaveAttribute('data-condensed', 'false');
    expect(banner.className).not.toMatch(/shadow/);

    scrollTo(240);

    expect(banner).toHaveAttribute('data-condensed', 'true');
    expect(banner).toHaveClass('bg-paper');
    expect(banner.className).toMatch(/shadow-/);

    scrollTo(0);
    expect(banner).toHaveAttribute('data-condensed', 'false');
    expect(banner.className).not.toMatch(/shadow/);
  });

  it('is already condensed when the page loads part-way down', () => {
    scrollTo(900);
    render(<NavBar />);
    expect(screen.getByRole('banner')).toHaveAttribute('data-condensed', 'true');
  });

  it('sits on its own ink wash with paper type over the hero photograph', () => {
    // The hero's 35% wash alone leaves the brightest pixels behind an 11px link at about
    // 2.1:1; the nav adds its own flat wash so paper type clears 4.5:1 on any pixel.
    render(<NavBar />);
    const banner = screen.getByRole('banner');
    expect(banner).toHaveClass('bg-ink/50');
    expect(screen.getByRole('link', { name: 'Shop' })).toHaveClass('text-paper');
  });

  it('sets ink type on the paper ground once condensed', () => {
    render(<NavBar />);
    scrollTo(240);
    expect(screen.getByRole('banner')).not.toHaveClass('bg-ink/50');
    expect(screen.getByRole('link', { name: 'Shop' })).toHaveClass('text-ink');
  });

  it('is plain ink on paper on routes with no photograph behind it', () => {
    usePathname.mockReturnValue('/products');
    render(<NavBar />);
    const banner = screen.getByRole('banner');
    expect(banner).not.toHaveClass('bg-ink/50');
    expect(screen.getByRole('link', { name: 'Shop' })).toHaveClass('text-ink');
  });

  it('overlays the hero on home and holds the nav height clear on every other route', () => {
    const { container, rerender } = render(<NavBar />);
    expect(container.querySelector('[data-nav-spacer]')).toBeNull();

    usePathname.mockReturnValue('/contact-us');
    rerender(<NavBar />);
    const spacer = container.querySelector('[data-nav-spacer]');
    expect(spacer).not.toBeNull();
    expect(spacer).toHaveAttribute('aria-hidden', 'true');
  });

  it('keeps the spacer exactly as tall as the resting nav', () => {
    usePathname.mockReturnValue('/sale');
    const { container } = render(<NavBar />);
    const spacer = container.querySelector('[data-nav-spacer]') as HTMLElement;
    const row = screen.getByRole('banner').querySelector('[data-nav-row]') as HTMLElement;
    const heights = (el: HTMLElement) => el.className.split(/\s+/).filter(c => /^(md:)?h-\d+$/.test(c));
    expect(heights(spacer).sort()).toEqual(heights(row).filter(c => !c.includes('condensed')).sort());
  });

  it('never draws a banned shape: no pills, no gradients', () => {
    const { container } = render(<NavBar />);
    const html = container.innerHTML;
    expect(html).not.toMatch(/rounded-full|rounded-3xl|gradient|gray-\d/);
  });

  it('removes its scroll listener on unmount', () => {
    const remove = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(<NavBar />);
    unmount();
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function));
    remove.mockRestore();
    // A scroll after unmount must not throw.
    expect(() => fireEvent.scroll(window)).not.toThrow();
  });
});
