import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import EditorialPair from './EditorialPair';

function cells(flip?: boolean, className?: string) {
  const { container } = render(
    <EditorialPair media={<figure aria-label="Media">figure</figure>} flip={flip} className={className}>
      <p>Copy</p>
    </EditorialPair>,
  );
  const root = container.firstElementChild as HTMLElement;
  return {
    root,
    media: screen.getByLabelText('Media').parentElement as HTMLElement,
    text: screen.getByText('Copy').parentElement as HTMLElement,
  };
}

describe('EditorialPair', () => {
  it('puts the media on the left and the text on the right by default', () => {
    const { media, text } = cells();
    expect(media).toHaveClass('md:col-start-1', 'md:col-span-7');
    expect(text).toHaveClass('md:col-start-9', 'md:col-span-4');
  });

  it('mirrors the placement when flipped', () => {
    const { media, text } = cells(true);
    expect(media).toHaveClass('md:col-start-6', 'md:col-span-7');
    expect(text).toHaveClass('md:col-start-1', 'md:col-span-4');
  });

  it('pins both cells to row 1 in either direction so a flipped pair never wraps', () => {
    for (const flip of [false, true]) {
      const { media, text } = cells(flip);
      expect(media).toHaveClass('md:row-start-1');
      expect(text).toHaveClass('md:row-start-1');
      document.body.innerHTML = '';
    }
  });

  it('keeps media first in the DOM when flipped, and stacks on mobile', () => {
    const { root, media, text } = cells(true);
    expect(root.firstElementChild).toBe(media);
    expect(root.lastElementChild).toBe(text);
    expect(media).toHaveClass('col-span-12');
    expect(text).toHaveClass('col-span-12');
  });

  it('accepts a className on the grid root', () => {
    const { root } = cells(false, 'section-rhythm');
    expect(root).toHaveClass('grid-editorial', 'section-rhythm');
  });
});
