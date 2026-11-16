import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Reveal from './Reveal';

describe('Reveal', () => {
  it('renders children visible when reduced motion is preferred', () => {
    window.matchMedia = ((q: string) => ({
      matches: q.includes('prefers-reduced-motion'),
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
    render(
      <Reveal>
        <p>Elegance</p>
      </Reveal>
    );
    const el = screen.getByText('Elegance').parentElement!;
    expect(el).not.toHaveClass('opacity-0');
  });

  it('renders children even when IntersectionObserver never fires', () => {
    render(
      <Reveal>
        <p>Distinctive</p>
      </Reveal>
    );
    expect(screen.getByText('Distinctive')).toBeVisible();
  });
});
