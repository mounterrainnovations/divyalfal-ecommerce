import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProductTile from './ProductTile';
import type { Product } from '@/types';

const base: Product = {
  id: 'p1',
  name: 'Red Velvet Saree',
  price: 8000,
  image: '/mocks/mock_mostRecommended_common.jpg',
  photos: ['/a.jpg', '/b.jpg'],
  category: 'Sarees',
};

describe('ProductTile', () => {
  it('renders a labelled empty frame when the product has no photos', () => {
    render(<ProductTile product={{ ...base, photos: [] }} />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText(/image coming soon/i)).toBeInTheDocument();
  });

  it('never falls back to product.image when there are no photos', () => {
    // transformDbProductToProduct fills `image` with a stock mock for photo-less products.
    const { container } = render(<ProductTile product={{ ...base, photos: [] }} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.innerHTML).not.toContain('mock_mostRecommended_common');
  });

  it('keeps the first photo on hover when only one exists', async () => {
    const { container } = render(<ProductTile product={{ ...base, photos: ['/a.jpg'] }} />);
    await userEvent.hover(screen.getByRole('link'));
    const images = Array.from(container.querySelectorAll('img'));
    expect(images).toHaveLength(1);
    expect(images[0]).toHaveAttribute('src', expect.stringContaining('a.jpg'));
  });

  it('stacks the second photo for the hover swap when two exist', () => {
    const { container } = render(<ProductTile product={base} />);
    const srcs = Array.from(container.querySelectorAll('img')).map((i) => i.getAttribute('src'));
    expect(srcs).toHaveLength(2);
    expect(srcs[0]).toContain('a.jpg');
    expect(srcs[1]).toContain('b.jpg');
  });

  /**
   * Neither photograph is exposed to assistive tech.
   *
   * A photograph carrying `alt={product.name}` is a picture of the thing the link already
   * names, so a screen reader said the garment twice -- once for the link, once for the image
   * inside it. WAI calls that a decorative image and asks for `alt=""`.
   */
  it('exposes no image to assistive tech, because the link already names the garment', () => {
    const { container } = render(<ProductTile product={base} />);
    const images = Array.from(container.querySelectorAll('img'));
    expect(images).toHaveLength(2);
    for (const image of images) expect(image).toHaveAttribute('alt', '');
    expect(screen.queryAllByRole('img')).toHaveLength(0);
    expect(screen.getByRole('heading', { name: base.name })).toBeInTheDocument();
  });

  /**
   * WCAG 2.1 SC 2.5.3 Label in Name, Level A: a control's accessible name must contain the
   * text a sighted user can read on it. A speech-input user says the words they can see.
   *
   * The tile used to name its link with `aria-labelledby="<heading> <price>"`, which left two
   * pieces of visible text out of the name -- the empty frame's "Image coming soon" and, on a
   * sale tile, the struck original price -- so axe reported `label-content-name-mismatch`
   * (serious, `wcag21a`/`wcag253`) on both `/products` tiles. The name now comes from the
   * link's own contents, so it cannot drift from what is on screen: anything added inside the
   * tile is in the name by construction.
   *
   * The one ordering constraint the rule imposes: the visible words must appear as one
   * unbroken run in the name. Screen-reader-only text is in the name but not in the visible
   * text, so it has to sit after all of it -- which is why "original price" follows the struck
   * number instead of introducing it.
   */
  it('names the link from its own contents, so the name holds every visible word', () => {
    render(<ProductTile product={{ ...base, photos: [] }} />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('aria-labelledby')).toBeNull();
    expect(link.getAttribute('aria-label')).toBeNull();
    const name = (link.textContent ?? '').replace(/\s+/g, ' ').trim();
    expect(name).toContain('Image coming soon');
    expect(name).toContain(base.name);
    expect(name).toContain('₹8,000');
    // Visible order: the frame's caption, then the garment, then the price.
    expect(name.indexOf('Image coming soon')).toBeLessThan(name.indexOf(base.name));
    expect(name.indexOf(base.name)).toBeLessThan(name.indexOf('₹8,000'));
  });

  it('puts the screen-reader-only words after the visible run, never inside it', () => {
    const { container } = render(
      <ProductTile product={{ ...base, sale: true, salePrice: 6000 }} />
    );
    // Asserted per block, because `textContent` runs the heading straight into the price
    // while the accessible-name computation separates non-phrasing elements with a space.
    expect(container.querySelector('h3')?.textContent).toBe(base.name);
    const price = (container.querySelector('p')?.textContent ?? '').replace(/\s+/g, ' ').trim();
    // The visible run first and unbroken, then the screen-reader-only gloss.
    expect(price).toBe('₹6,000 ₹8,000 original price');

    const gloss = screen.getByText(/original price/i);
    expect(gloss).toHaveClass('sr-only');
    expect(gloss.closest('s')).not.toBeNull();
    // Inside the struck element and after its number, so it cannot split the visible words.
    expect(gloss.previousSibling?.textContent).toBe('₹8,000');
  });

  it('keeps a space between the two prices, so they do not read as one number', () => {
    const { container } = render(
      <ProductTile product={{ ...base, sale: true, salePrice: 6000 }} />
    );
    const price = container.querySelector('p');
    expect((price?.textContent ?? '')).toMatch(/₹6,000\s+₹8,000/);
  });

  it('hides the swap image until hover or keyboard focus, and shows it then', () => {
    const { container } = render(<ProductTile product={base} />);
    const [first, second] = Array.from(container.querySelectorAll('img'));
    expect(first).not.toHaveClass('opacity-0');
    expect(second).toHaveClass('opacity-0', 'group-hover:opacity-100', 'group-focus-visible:opacity-100');
    expect(screen.getByRole('link')).toHaveClass('group');
  });

  it('is a 3:4 portrait frame with sizes matching the editorial grid', () => {
    const { container } = render(<ProductTile product={base} />);
    expect(container.querySelector('[class~="aspect-[3/4]"]')).not.toBeNull();
    const sizes = container.querySelector('img')?.getAttribute('sizes') ?? '';
    expect(sizes).toContain('25vw');
    expect(sizes).toContain('50vw');
  });

  it('lazy-loads by default and eager-loads the first photo when priority is set', () => {
    const { container, rerender } = render(<ProductTile product={base} />);
    expect(container.querySelector('img')).toHaveAttribute('loading', 'lazy');
    rerender(<ProductTile product={base} priority />);
    expect(container.querySelector('img')).not.toHaveAttribute('loading', 'lazy');
  });

  it('names the product in an h3 by default and honours headingLevel', () => {
    const { rerender } = render(<ProductTile product={base} />);
    expect(screen.getByRole('heading', { level: 3, name: 'Red Velvet Saree' })).toBeInTheDocument();
    rerender(<ProductTile product={base} headingLevel={2} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Red Velvet Saree' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 3 })).toBeNull();
  });

  it('links to the product detail page and exposes an accessible name', () => {
    render(<ProductTile product={base} />);
    expect(screen.getByRole('link', { name: /Red Velvet Saree/i })).toHaveAttribute(
      'href',
      `/product/${base.id}`,
    );
  });

  it('shows the regular price when not on sale', () => {
    render(<ProductTile product={base} />);
    expect(screen.getByText('₹8,000')).toBeInTheDocument();
  });

  it('shows the sale price in the sale colour with the original struck through', () => {
    render(<ProductTile product={{ ...base, sale: true, salePrice: 6000 }} />);
    const sale = screen.getByText('₹6,000');
    expect(sale).toHaveClass('text-sale');
    expect(screen.getByText('₹8,000').closest('s')).not.toBeNull();
  });

  it('shows the regular price when sale is true but the sale price is missing', () => {
    render(<ProductTile product={{ ...base, sale: true, salePrice: undefined }} />);
    expect(screen.getByText('₹8,000')).toBeInTheDocument();
    expect(screen.getByText('₹8,000').closest('s')).toBeNull();
  });

  it('uses no pill, gradient, shadow or grey-scale utility classes', () => {
    const { container } = render(<ProductTile product={base} />);
    expect(container.innerHTML).not.toMatch(/rounded-full|rounded-3xl|gradient|shadow|(?:text|bg)-gray-/);
  });
});
