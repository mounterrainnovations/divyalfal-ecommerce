import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Eyebrow from './Eyebrow';
import DisplayHeading from './DisplayHeading';
import HairlineRule from './HairlineRule';

describe('Eyebrow', () => {
  it('applies the eyebrow size and its own uppercase, and keeps the colour', () => {
    render(<Eyebrow>Autumn</Eyebrow>);
    expect(screen.getByText('Autumn')).toHaveClass('text-eyebrow', 'uppercase', 'text-ink-soft');
  });

  it('accepts a className for placement without losing its typography', () => {
    render(<Eyebrow className="col-span-4 col-start-2">Autumn</Eyebrow>);
    expect(screen.getByText('Autumn')).toHaveClass('col-span-4', 'col-start-2', 'text-eyebrow', 'text-ink-soft');
  });
});

describe('DisplayHeading', () => {
  it('renders the requested level, with size defaulting to the level', () => {
    render(<DisplayHeading level={1}>Title</DisplayHeading>);
    const h = screen.getByRole('heading', { level: 1 });
    expect(h).toHaveClass('text-display-1', 'text-ink', 'font-display', 'font-light');
  });

  it('decouples outline level from visual size', () => {
    render(
      <DisplayHeading level={2} size={1}>
        Title
      </DisplayHeading>,
    );
    expect(screen.getByRole('heading', { level: 2 })).toHaveClass('text-display-1');
  });

  it('accepts a className for placement without losing its typography', () => {
    render(<DisplayHeading className="col-span-6">Title</DisplayHeading>);
    expect(screen.getByRole('heading')).toHaveClass('col-span-6', 'text-display-2', 'text-ink');
  });
});

describe('HairlineRule', () => {
  it('is a 1px gold rule', () => {
    const { container } = render(<HairlineRule className="my-8" />);
    expect(container.firstElementChild).toHaveClass('h-px', 'bg-gold', 'my-8');
  });
});
