import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Close from './close';
import { siteCopy } from '@/lib/content/site-copy';

const { cards } = siteCopy.home.cta;
const academy = siteCopy.home.academy;

/** Every class token rendered anywhere inside the movement. */
const classTokens = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('[class]')).flatMap(node =>
    (node.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)
  );

describe('Close', () => {
  it('keeps the WhatsApp link and renders no gradient card', () => {
    const { container } = render(<Close />);

    const whatsapp = screen.getByRole('link', { name: cards[0].cta });
    expect(whatsapp.getAttribute('href')).toContain('wa.me/919977057045');
    expect(whatsapp).toHaveAttribute('href', 'https://wa.me/919977057045');

    const tokens = classTokens(container);
    expect(tokens.filter(token => /gradient|rose-|pink-|purple-|amber-|orange-/.test(token))).toEqual([]);
    expect(tokens.filter(token => /^rounded|blur|shadow|backdrop/.test(token))).toEqual([]);
    expect(container.innerHTML).not.toMatch(/gradient/i);
  });

  it('sets both invitation lines verbatim, each as an h2 with its link', () => {
    render(<Close />);

    for (const card of cards) {
      expect(screen.getByRole('heading', { level: 2, name: card.title })).toBeInTheDocument();
      expect(screen.getByText(card.body)).toBeInTheDocument();
    }
    expect(screen.getByRole('link', { name: cards[1].cta })).toHaveAttribute('href', cards[1].href);
    expect(cards[1].href).toBe('/contact-us#map-section');
  });

  it('links the Virasat Academy band to /virasat-academy with its copy verbatim', () => {
    render(<Close />);

    expect(screen.getByRole('heading', { level: 2, name: academy.heading })).toBeInTheDocument();
    expect(screen.getByText(academy.body)).toBeInTheDocument();

    const apply = screen.getByRole('link', { name: academy.cta });
    expect(apply).toHaveAttribute('href', '/virasat-academy');
    expect(academy.href).toBe('/virasat-academy');
  });

  it('puts the Virasat band on a full-bleed ground of its own', () => {
    render(<Close />);
    const band = screen
      .getByRole('heading', { level: 2, name: academy.heading })
      .closest('section');
    expect(band).not.toBeNull();
    expect(band!.className).toMatch(/\bbg-ink\b/);
    // Full bleed: the ground sits on the section itself, not on a boxed child.
    expect(band!.className).not.toMatch(/\bmax-w-/);
  });

  it('keeps the page h1 to the hero and never dims text with an opacity utility', () => {
    const { container } = render(<Close />);
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();

    // `text-ink-soft/70` once shipped a WCAG failure; dim imagery, never type.
    const dimmed = classTokens(container).filter(token => /(^|:)text-[\w-]+\/\d+/.test(token));
    expect(dimmed).toEqual([]);
  });

  it('uses the Button primitive for its links, so each is a text-and-rule, never a pill', () => {
    render(<Close />);
    for (const label of [cards[0].cta, cards[1].cta, academy.cta]) {
      const link = screen.getByRole('link', { name: label });
      expect(link.className).toMatch(/\bborder-b\b/);
      expect(link.className).not.toMatch(/rounded|\bbg-/);
    }
  });
});
