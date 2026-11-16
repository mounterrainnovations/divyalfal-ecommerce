import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Categories from './categories';
import { siteCopy } from '@/lib/content/site-copy';
import { CATEGORY_CONFIG } from '@/lib/common/product-interfaces';

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
    // The row's index numeral is aria-hidden, so each link is named by its collection alone.
    expect(links.map(a => a.getAttribute('href'))).toEqual(
      CATEGORY_CONFIG.map(c => `/products?categories=${encodeURIComponent(c.name)}`)
    );
    for (const cat of CATEGORY_CONFIG) {
      expect(screen.getByRole('link', { name: cat.name })).toBeInTheDocument();
    }
  });

  it('pins the href to the plural `categories` param that /products actually parses', () => {
    // app/products/page.tsx reads searchParams.get('categories') and comma-splits it, so a
    // singular `?category=` would silently filter nothing. Encoded display names, not slugs.
    render(<Categories />);
    for (const cat of CATEGORY_CONFIG) {
      expect(screen.getByRole('link', { name: cat.name })).toHaveAttribute(
        'href',
        `/products?categories=${encodeURIComponent(cat.name)}`
      );
    }
    expect(screen.getByRole('link', { name: 'Indo-Western' })).toHaveAttribute(
      'href',
      '/products?categories=Indo-Western'
    );
    expect(screen.getByRole('link', { name: 'Kurta Pant' })).toHaveAttribute(
      'href',
      '/products?categories=Kurta%20Pant'
    );
  });

  it('keeps the rendered names in step with the copy snapshot', () => {
    expect(siteCopy.home.categories.items.map(c => c.name)).toEqual(
      CATEGORY_CONFIG.map(c => c.name)
    );
  });

  it('is a typographic index: names as headings, no avatar circles, no thumbnails', () => {
    const { container } = render(<Categories />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.innerHTML).not.toMatch(/rounded-full|w-\[88px\]/);
    const names = screen
      .getAllByRole('heading', { level: 3 })
      .map(h => h.textContent?.trim());
    expect(names).toEqual(CATEGORY_CONFIG.map(c => c.name));
    for (const heading of screen.getAllByRole('heading', { level: 3 })) {
      expect(heading).toHaveClass('font-display');
      expect(heading).toHaveClass('text-display-3');
    }
  });

  it('separates the entries with hairline rules inside a single list', () => {
    const { container } = render(<Categories />);
    const lists = container.querySelectorAll('ul');
    expect(lists).toHaveLength(1);
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
      expect(link.className).toMatch(/focus-visible:/);
    }
  });

  it('sits on the paper ground and uses no pill, gradient, shadow or grey-scale classes', () => {
    const { container } = render(<Categories />);
    expect(container.querySelector('section')?.className).toMatch(/section-rhythm/);
    expect(container.innerHTML).not.toMatch(
      /rounded-full|rounded-3xl|gradient|shadow|(?:text|bg)-gray-/
    );
  });
});
