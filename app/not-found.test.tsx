import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { siteCopy } from '@/lib/content/site-copy';
import NotFound from './not-found';
import ProductNotFound from './product/[id]/not-found';

afterEach(cleanup);

const BANNED_SHAPES = new RegExp(
  [
    ['rounded', 'full'].join('-'),
    ['rounded', '3xl'].join('-'),
    ['rounded', '(?:sm|md|lg|xl)'].join('-'),
    ['bg', 'gradient'].join('-'),
    ['gray', '\\d'].join('-'),
    ['shadow', '(?:xs|sm|md|lg|xl|2xl)'].join('-'),
    ['font', 'serif'].join('-'),
  ].join('|')
);

describe.each([
  ['site 404', NotFound, siteCopy.notFound],
  ['product 404', ProductNotFound, siteCopy.product.notFound],
] as const)('%s', (name, Page, copy) => {
  it('renders inside the layout main, never its own', () => {
    const { container } = render(<Page />);
    expect(container.querySelector('main')).toBeNull();
  });

  it('names the page in one h1 and skips no heading level', () => {
    const { container } = render(<Page />);
    const h1s = container.querySelectorAll('h1');
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent(copy.heading);
    // axe `heading-order`, measured at the gate: this page's only heading of its own is the
    // h1, so the footer's columns -- h3 everywhere else -- must come in at h2 here or the
    // run skips a level. `<Footer headingLevel={2} />` is what makes this pass.
    const levels = Array.from(container.querySelectorAll('h1,h2,h3,h4,h5,h6')).map((h) =>
      Number(h.tagName[1])
    );
    expect(levels[0]).toBe(1);
    levels.forEach((level, index) => {
      if (index > 0) expect(level - levels[index - 1]).toBeLessThanOrEqual(1);
    });
  });

  /**
   * A lost visitor is exactly who needs the footer: the quick links, the real contact details
   * and the way back. It was dropped once at the gate because the footer's h3 columns skipped
   * a level under this page's lone h1; `headingLevel` is the fix, not removing the footer.
   */
  it('keeps the footer, at the heading level this page can carry', () => {
    render(<Page />);
    const contentinfo = screen.getByRole('contentinfo');
    expect(contentinfo).toBeInTheDocument();
    expect(within(contentinfo).getByText(siteCopy.footer.contact.address)).toBeInTheDocument();
    const headings = Array.from(contentinfo.querySelectorAll('h1,h2,h3,h4,h5,h6'));
    expect(headings).toHaveLength(3);
    for (const heading of headings) expect(heading.tagName).toBe('H2');
  });

  it('prints its copy verbatim from the module, inventing nothing', () => {
    render(<Page />);
    expect(screen.getByText(copy.body)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: copy.homeCta })).toHaveAttribute('href', '/');
  });

  it('is built from the tokens, with none of the banned vocabulary it used to carry', () => {
    const { container } = render(<Page />);
    expect(container.innerHTML).not.toMatch(BANNED_SHAPES);
    expect(container.innerHTML).not.toMatch(/\btext-[A-Za-z0-9_-]+\/\d/);
    expect(container.querySelector('.grid-editorial')).not.toBeNull();
  });

  it('gives every way out a visible keyboard focus state', () => {
    const { container } = render(<Page />);
    const actions = Array.from(container.querySelectorAll('a, button'));
    expect(actions.length).toBeGreaterThanOrEqual(2);
    for (const action of actions) {
      expect(action.className).toMatch(/\bfocus-visible:outline\b/);
    }
  });
});

describe('site 404, specifically', () => {
  it('prints the numeral as a quiet eyebrow, not as the loudest thing on the page', () => {
    const { container } = render(<NotFound />);
    const code = screen.getByText(siteCopy.notFound.code);
    expect(code.tagName).toBe('P');
    expect(code.className).toContain('text-eyebrow');
    // The old page set it at `text-9xl` in `text-gray-900`.
    expect(container.innerHTML).not.toMatch(/text-9xl/);
  });

  it('offers Go Back as a button, because there is no href for where you came from', () => {
    const back = vi.fn();
    vi.stubGlobal('history', { ...window.history, back });
    render(<NotFound />);
    const button = screen.getByRole('button', { name: siteCopy.notFound.backCta });
    button.click();
    expect(back).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});

describe('product 404, specifically', () => {
  it('sends the visitor to the listing as well as home', () => {
    render(<ProductNotFound />);
    expect(screen.getByRole('link', { name: siteCopy.product.notFound.browseCta })).toHaveAttribute(
      'href',
      '/products'
    );
  });

  it('drops the decorative package glyph rather than restyling the circle it sat in', () => {
    const { container } = render(<ProductNotFound />);
    expect(container.querySelector('svg')).toBeNull();
  });
});
