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
    render(<ProductTile product={{ ...base, photos: ['/a.jpg'] }} />);
    await userEvent.hover(screen.getByRole('link'));
    expect(screen.getAllByRole('img')).toHaveLength(1);
    expect(screen.getByRole('img')).toHaveAttribute('src', expect.stringContaining('a.jpg'));
  });

  it('stacks the second photo for the hover swap when two exist', () => {
    const { container } = render(<ProductTile product={base} />);
    const srcs = Array.from(container.querySelectorAll('img')).map((i) => i.getAttribute('src'));
    expect(srcs).toHaveLength(2);
    expect(srcs[0]).toContain('a.jpg');
    expect(srcs[1]).toContain('b.jpg');
    // Only the first photo is exposed to assistive tech; the swap image is decoration.
    expect(screen.getAllByRole('img')).toHaveLength(1);
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
