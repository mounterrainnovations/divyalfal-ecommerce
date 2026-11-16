import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Marquee from './Marquee';

describe('Marquee', () => {
  it('exposes the line once to assistive tech and repeats it only as hidden decoration', () => {
    const { container } = render(<Marquee>Divyafal — made by hand in India</Marquee>);
    const copies = screen.getAllByText(/made by hand in India/);
    expect(copies).toHaveLength(2);
    expect(copies.filter((el) => el.closest('[aria-hidden="true"]'))).toHaveLength(1);
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(1);
  });
});
