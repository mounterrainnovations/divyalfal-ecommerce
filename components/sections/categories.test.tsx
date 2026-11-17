import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import Categories from './categories';
import { siteCopy } from '@/lib/content/site-copy';
import { CATEGORY_CONFIG } from '@/lib/common/product-interfaces';

/** The photograph slot belonging to one row, by the row's position in the index. */
const previews = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>('[data-preview]'));

const state = (container: HTMLElement) =>
  previews(container).map(node => node.dataset.preview);

const linkFor = (name: string) => screen.getByRole('link', { name });

describe('Categories', () => {
  it('renders the heading verbatim from siteCopy', () => {
    render(<Categories />);
    expect(
      screen.getByRole('heading', { level: 2, name: siteCopy.home.categories.heading })
    ).toBeInTheDocument();
    expect(siteCopy.home.categories.heading).toBe('Shop by Category');
  });

  it('renders all six categories as links to /products filtered by category', () => {
    render(<Categories />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(6);
    // The row's index numeral is aria-hidden and the photograph is decorative, so each link
    // is named by its collection alone.
    expect(links.map(a => a.getAttribute('href'))).toEqual(
      CATEGORY_CONFIG.map(c => `/products?categories=${encodeURIComponent(c.name)}`)
    );
    for (const cat of CATEGORY_CONFIG) {
      expect(linkFor(cat.name)).toBeInTheDocument();
    }
  });

  it('pins the href to the plural `categories` param that /products actually parses', () => {
    // app/products/page.tsx reads searchParams.get('categories') and comma-splits it, so a
    // singular `?category=` would silently filter nothing. Encoded display names, not slugs.
    render(<Categories />);
    for (const cat of CATEGORY_CONFIG) {
      expect(linkFor(cat.name)).toHaveAttribute(
        'href',
        `/products?categories=${encodeURIComponent(cat.name)}`
      );
    }
    expect(linkFor('Indo-Western')).toHaveAttribute('href', '/products?categories=Indo-Western');
    expect(linkFor('Kurta Pant')).toHaveAttribute('href', '/products?categories=Kurta%20Pant');
  });

  it('keeps the rendered names and photographs in step with the copy snapshot', () => {
    // The names are the href contract; the photographs are the slot the imagery pass replaces.
    // Both modules carry the same six, and this is what stops them drifting apart.
    expect(CATEGORY_CONFIG.map(c => c.name)).toEqual(
      siteCopy.home.categories.items.map(c => c.name)
    );
    expect(CATEGORY_CONFIG.map(c => c.image)).toEqual(
      siteCopy.home.categories.items.map(c => c.image)
    );
  });

  it('sets the names as headings in the display family, one per row', () => {
    render(<Categories />);
    const names = screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent?.trim());
    expect(names).toEqual(CATEGORY_CONFIG.map(c => c.name));
    for (const heading of screen.getAllByRole('heading', { level: 3 })) {
      expect(heading).toHaveClass('font-display');
      expect(heading).toHaveClass('text-display-3');
    }
  });

  it('separates the entries with hairline rules inside a single list', () => {
    const { container } = render(<Categories />);
    expect(container.querySelectorAll('ul')).toHaveLength(1);
    expect(container.querySelectorAll('li')).toHaveLength(6);
    // One rule above each entry plus one closing the index.
    const rules = container.querySelectorAll('hr');
    expect(rules).toHaveLength(7);
    for (const rule of rules) expect(rule).toHaveClass('bg-gold');
    // An <hr> is not valid content for <ul>; each rule belongs to its own <li>.
    expect(container.querySelector('ul > hr')).toBeNull();
  });

  it('gives every entry a visible keyboard focus state', () => {
    render(<Categories />);
    for (const link of screen.getAllByRole('link')) {
      expect(link.className).toMatch(/\bfocus-visible:outline\b/);
      expect(link.className).toMatch(/\bfocus-visible:outline-2\b/);
      expect(link.className).toMatch(/\bfocus-visible:outline-ink\b/);
      expect(link.className).toMatch(/\bfocus-visible:outline-offset-\d/);
    }
  });

  /* ------------------------------------------------------------------ */
  /* The preview                                                        */
  /* ------------------------------------------------------------------ */

  /**
   * Six photographs, one per category, each carried by its own row.
   *
   * The pre-density section was six text links in 1,102px of paper and the one movement on
   * the homepage with no photograph in it at all. The six paths were in the copy module,
   * exempt from the rendered-coverage sweep as "the avatar circles are gone". They are the
   * preview now, so the exemptions came off.
   */
  it('carries one photograph per category, from the copy module, as decoration', () => {
    const { container } = render(<Categories />);
    const images = Array.from(container.querySelectorAll('img'));
    expect(images).toHaveLength(6);

    for (const [index, cat] of CATEGORY_CONFIG.entries()) {
      const image = images[index];
      // next/image serves through `/_next/image?url=<encoded src>`.
      expect(decodeURIComponent(image.getAttribute('src') ?? '')).toContain(cat.image);
      // Decorative: the link beside it already names the collection, and describing the
      // photograph would mean inventing words the copy module does not hold.
      expect(image).toHaveAttribute('alt', '');
    }
  });

  /**
   * The hint is measured in a browser at both edges of every band, never read off the class
   * names -- the method `ProductTile` requires of every surface that renders a tile, applied
   * to this one. The preview is the right half of an eleven-column block from `md` and a
   * two-fifths thumbnail on a phone, so it is one hint for two quite different layouts:
   * 137px at 390, 288 at 767, 303 at 768, 410 at 1023, 390 at 1024, 564 at 1439, 565 from
   * 1440 up. Three of the four bands are widest at their top, not at the breakpoint.
   */
  it('hints the photograph at the width this band actually renders it', () => {
    const { container } = render(<Categories />);
    const expected =
      '(min-width: 1440px) 565px, (min-width: 1024px) 40vw, (min-width: 768px) 41vw, calc(40vw - 19px)';
    const images = Array.from(container.querySelectorAll('img'));
    expect(images).toHaveLength(6);
    for (const image of images) expect(image).toHaveAttribute('sizes', expected);
    // Never the shared last-resort hint, which describes a full-width surface.
    expect(expected).not.toBe('calc(100vw - 48px)');
  });

  it('opens on the first collection, so the frame is never empty', () => {
    const { container } = render(<Categories />);
    expect(state(container)).toEqual(['active', 'idle', 'idle', 'idle', 'idle', 'idle']);
  });

  it('swaps the preview on hover', () => {
    const { container } = render(<Categories />);
    fireEvent.mouseEnter(linkFor('Lehengas'));
    expect(state(container)).toEqual(['idle', 'idle', 'active', 'idle', 'idle', 'idle']);
    fireEvent.mouseEnter(linkFor('Western'));
    expect(state(container)).toEqual(['idle', 'idle', 'idle', 'idle', 'idle', 'active']);
  });

  /**
   * **Hover alone is not an interaction.** Every row is a real link, so it is in the tab
   * order, and focusing one shows its photograph — a keyboard reader walking the index sees
   * the same preview a pointer does, with no extra control to learn and nothing to press.
   */
  it('swaps the preview on keyboard focus, for every row', () => {
    const { container } = render(<Categories />);
    for (const [index, cat] of CATEGORY_CONFIG.entries()) {
      const link = linkFor(cat.name);
      expect(link.tagName).toBe('A');
      expect(link).not.toHaveAttribute('tabindex', '-1');
      link.focus();
      expect(document.activeElement).toBe(link);
      fireEvent.focus(link);
      expect(state(container)).toEqual(
        CATEGORY_CONFIG.map((_, i) => (i === index ? 'active' : 'idle'))
      );
    }
  });

  /**
   * The preview is a picture of the thing the focused link already names, so there is nothing
   * for a screen reader to announce and no live region to announce it in: the photographs are
   * `alt=""`, the swap is pure presentation, and the only thing that changes for a listener
   * is which link they are on. A live region here would read a decoration out loud.
   */
  it('announces nothing on a swap, because the link is the announcement', () => {
    const { container } = render(<Categories />);
    expect(container.querySelector('[aria-live]')).toBeNull();
    expect(container.querySelector('[role="status"], [role="alert"]')).toBeNull();
    fireEvent.mouseEnter(linkFor('Suits'));
    expect(container.querySelector('[aria-live]')).toBeNull();
    // Nor does the swap add anything to a link's accessible name.
    expect(linkFor('Suits')).toBeInTheDocument();
  });

  /**
   * **The preview interaction does not translate to touch, so the phone does not pretend.**
   * A tap-to-preview would spend a tap saying what a photograph could have said, so below
   * `md` all six photographs are simply on screen, in flow, inside their own row: the slot is
   * a two-fifths-width portrait thumbnail beside the name. From `md` the same six elements
   * become one stacked frame in the right half of the band, and the active one is the only
   * one at full opacity.
   *
   * One element per category either way. Rendering a phone layout and a desktop layout as two
   * sets of rows would have put twelve links on the homepage with six names between them,
   * which `test/control-names.test.tsx` would have failed on, rightly.
   */
  it('shows every photograph in flow on a phone and stacks them into one frame from md', () => {
    const { container } = render(<Categories />);
    for (const slot of previews(container)) {
      // Phone: a sized, in-flow thumbnail with no opacity of its own.
      expect(slot.className).toMatch(/\baspect-\[4\/5\]/);
      expect(slot.className).toMatch(/\bw-2\/5\b/);
      expect(slot.className).not.toMatch(/(^|\s)opacity-\d/);
      // Desktop: out of flow, filling the right half of the band, and inert to the pointer so
      // the stack cannot intercept a hover meant for a name.
      expect(slot.className).toMatch(/\bmd:absolute\b/);
      expect(slot.className).toMatch(/\bmd:pointer-events-none\b/);
      expect(slot.className).toMatch(/\bmd:opacity-(?:0|100)\b/);
    }
    const [first, second] = previews(container);
    expect(first.className).toMatch(/\bmd:opacity-100\b/);
    expect(second.className).toMatch(/\bmd:opacity-0\b/);
  });

  /**
   * `Reveal` animates with a `translateY`, and a transformed element is the containing block
   * for its absolutely positioned descendants. A per-row `Reveal` wrapping the whole row
   * would therefore have re-anchored that row's preview to the row itself for the 700ms the
   * animation runs — a small frame in the wrong place, snapping into position afterwards. So
   * the staggered reveal wraps the name only, and no transformed element sits between a
   * preview and the positioned block it is placed against.
   */
  it('keeps every preview outside the staggered reveal that would re-anchor it', () => {
    const { container } = render(<Categories />);
    for (const slot of previews(container)) {
      expect(slot.closest('[style*="--reveal-delay"]')).toBeNull();
    }
    // The block the previews are placed against is the one carrying `relative`.
    const anchor = container.querySelector('.relative');
    expect(anchor).not.toBeNull();
    for (const slot of previews(container)) {
      expect(anchor!.contains(slot)).toBe(true);
    }
  });

  it('staggers the names and reveals the closing rule after the row it closes', () => {
    const { container } = render(<Categories />);
    const wrappers = Array.from(
      container.querySelectorAll<HTMLElement>('[style*="--reveal-delay"]')
    );
    const closing = Array.from(container.querySelectorAll('hr')).at(-1)!;
    const wrapper = closing.closest<HTMLElement>('[style*="--reveal-delay"]');

    expect(wrapper).not.toBeNull();
    expect(wrapper!.style.getPropertyValue('--reveal-delay')).toBe(
      `${CATEGORY_CONFIG.length * 60}ms`
    );
    expect(wrappers.at(-1)).toBe(wrapper);
    expect(wrappers.map(w => w.style.getPropertyValue('--reveal-delay'))).toEqual([
      '0ms',
      ...CATEGORY_CONFIG.map((_, index) => `${index * 60}ms`),
      `${CATEGORY_CONFIG.length * 60}ms`,
    ]);
  });

  it('sits on the paper ground and uses no pill, gradient, shadow or grey-scale classes', () => {
    const { container } = render(<Categories />);
    expect(container.querySelector('section')?.className).toMatch(/section-rhythm/);
    expect(container.innerHTML).not.toMatch(
      /rounded-full|rounded-3xl|gradient|shadow|(?:text|bg)-gray-/
    );
    // No opacity ever lands on type; only on the imagery.
    for (const heading of screen.getAllByRole('heading', { level: 3 })) {
      expect(heading.className).not.toMatch(/opacity/);
    }
  });
});
