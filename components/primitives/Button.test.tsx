import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from './Button';

describe('Button', () => {
  it('renders an anchor for href and a button for onClick, and is never a pill', () => {
    const { rerender } = render(<Button href="/products">Shop</Button>);
    const link = screen.getByRole('link', { name: 'Shop' });
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/products');
    expect(link.className).not.toMatch(/rounded/);

    rerender(<Button onClick={() => {}}>Shop</Button>);
    const button = screen.getByRole('button', { name: 'Shop' });
    expect(button.tagName).toBe('BUTTON');
    expect(button).toHaveAttribute('type', 'button');
    expect(button.className).not.toMatch(/rounded/);
  });

  it('opens an external link in a new tab only when asked, with noopener', () => {
    const { rerender } = render(<Button href="https://example.com/map">Map</Button>);
    expect(screen.getByRole('link')).not.toHaveAttribute('target');

    rerender(
      <Button href="https://example.com/map" newTab>
        Map
      </Button>,
    );
    expect(screen.getByRole('link')).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link')).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('is a text-and-rule treatment in both variants, with no fill', () => {
    const { rerender } = render(<Button href="/x">Primary</Button>);
    expect(screen.getByRole('link').className).toMatch(/border-b/);
    expect(screen.getByRole('link').className).not.toMatch(/(?:^|\s)(?:[a-z-]+:)*bg-/);

    rerender(
      <Button href="/x" variant="quiet">
        Quiet
      </Button>,
    );
    expect(screen.getByRole('link').className).toMatch(/border-b/);
    expect(screen.getByRole('link').className).not.toMatch(/(?:^|\s)(?:[a-z-]+:)*bg-/);
  });

  it('keeps the eyebrow size and the variant colour, which twMerge would otherwise collapse', () => {
    const { rerender } = render(<Button href="/x">Primary</Button>);
    expect(screen.getByRole('link')).toHaveClass('text-eyebrow', 'text-ink');

    rerender(
      <Button href="/x" variant="quiet">
        Quiet
      </Button>,
    );
    expect(screen.getByRole('link')).toHaveClass('text-eyebrow', 'text-ink-soft');

    rerender(<Button onClick={() => {}}>Btn</Button>);
    expect(screen.getByRole('button')).toHaveClass('text-eyebrow', 'text-ink');
  });

  it('keeps a visible focus ring when focused by keyboard', async () => {
    render(<Button onClick={() => {}}>Shop</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toMatch(/focus-visible:outline/);
    expect(button.className).not.toMatch(/outline-none|focus:outline-none/);
    await userEvent.tab();
    expect(button).toHaveFocus();
  });

  it('gives the link branch a visible focus ring too', () => {
    render(<Button href="/x">Shop</Button>);
    expect(screen.getByRole('link').className).toMatch(/focus-visible:outline/);
  });

  it('calls onClick', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('opens external links as plain anchors', () => {
    render(<Button href="https://example.com/x">Out</Button>);
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://example.com/x');
  });
});
