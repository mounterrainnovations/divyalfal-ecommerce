import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import Marquee from './Marquee';

describe('Marquee', () => {
  it('exposes the line once to assistive tech and repeats it only as hidden decoration', () => {
    const { container } = render(<Marquee>Divyafal — made by hand in India</Marquee>);
    const copies = screen.getAllByText(/made by hand in India/);
    expect(copies).toHaveLength(2);
    expect(copies.filter((el) => el.closest('[aria-hidden="true"]'))).toHaveLength(1);
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(1);
  });

  describe('stylesheet', () => {
    const css = readFileSync('components/primitives/Marquee.module.css', 'utf8');

    it('makes each copy at least a viewport wide so the loop never shows a gap', () => {
      expect(css).toMatch(/\.copy\s*\{[^}]*min-width:\s*100vw/);
    });

    it('hides the aria-hidden duplicate under prefers-reduced-motion', () => {
      expect(css).toMatch(
        /@media \(prefers-reduced-motion: reduce\)\s*\{[^@]*\.copy\[aria-hidden[^}]*display:\s*none/,
      );
    });
  });
});
