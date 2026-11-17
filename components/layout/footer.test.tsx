import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import Footer from './footer';
import { siteCopy } from '@/lib/content/site-copy';

const { values } = siteCopy.home;
const { footer } = siteCopy;

describe('Footer', () => {
  afterEach(() => {
    vi.doUnmock('@/lib/content/site-copy');
    vi.resetModules();
  });

  it('renders all six value statements verbatim', () => {
    render(<Footer />);

    expect(values.items).toHaveLength(6);
    for (const item of values.items) {
      expect(screen.getByText(item.title)).toBeInTheDocument();
      expect(screen.getByText(item.body)).toBeInTheDocument();
    }
    expect(screen.getByText(values.heading)).toBeInTheDocument();
  });

  it('sets the values as a single column, one list item each', () => {
    render(<Footer />);
    const list = screen.getByRole('list', { name: values.heading });
    expect(within(list).getAllByRole('listitem')).toHaveLength(6);
  });

  /**
   * The column headings default to `h3`, which is right on every route whose own content is
   * an `h1` followed by `h2` movements. A page whose only heading is its `h1` -- the two 404
   * routes -- would skip a level, which axe reports as `heading-order`, so it asks for `h2`
   * instead. The default keeps all seven existing call sites unchanged.
   */
  it('sets its column headings at h3 by default', () => {
    const { container } = render(<Footer />);
    const headings = Array.from(container.querySelectorAll('h1,h2,h3,h4,h5,h6'));
    expect(headings).toHaveLength(3);
    for (const heading of headings) expect(heading.tagName).toBe('H3');
    expect(headings.map((h) => h.textContent)).toEqual([
      footer.contact.heading,
      values.heading,
      footer.quickLinks.heading,
    ]);
  });

  it('honours headingLevel, so a page with no h2 of its own skips no level', () => {
    const { container } = render(<Footer headingLevel={2} />);
    const headings = Array.from(container.querySelectorAll('h1,h2,h3,h4,h5,h6'));
    expect(headings).toHaveLength(3);
    for (const heading of headings) expect(heading.tagName).toBe('H2');
    // The values list is still labelled by its heading, whatever level that heading is.
    expect(screen.getByRole('list', { name: values.heading })).toBeInTheDocument();
  });

  it('renders the real phone and email, not the placeholders', () => {
    const { container } = render(<Footer />);

    // The display string carries deliberate invisible characters, so match the digits
    // loosely and pin the stored form separately below.
    const phone = screen.getByRole('link', { name: /99770.?57045/ });
    expect(phone).toHaveAttribute('href', 'tel:+919977057045');
    expect(screen.getByRole('link', { name: footer.contact.email })).toHaveAttribute(
      'href',
      `mailto:${footer.contact.email}`
    );

    expect(screen.queryByText(/9876543210/)).toBeNull();
    expect(screen.queryByText(/hello@divyafal\.com/)).toBeNull();
    expect(container.innerHTML).not.toMatch(/9876543210|hello@divyafal\.com/);
  });

  it('renders the phone display string exactly as stored, invisible characters included', () => {
    render(<Footer />);
    const phone = screen.getByRole('link', { name: /99770.?57045/ });
    expect(phone.textContent).toBe(footer.contact.phoneDisplay);
    expect(phone.textContent).toBe('‪+91 99770 57045‬');
  });

  it('omits social links entirely rather than linking to #', () => {
    expect(footer.social).toHaveLength(0);
    const { container } = render(<Footer />);
    expect(screen.queryByRole('link', { name: /instagram|facebook/i })).toBeNull();
    expect(container.querySelector('[aria-label="Social"]')).toBeNull();
    expect(container.querySelector('svg')).toBeNull();
  });

  it('renders no link that goes nowhere', () => {
    const { container } = render(<Footer />);
    const anchors = Array.from(container.querySelectorAll('a'));
    expect(anchors.length).toBeGreaterThan(0);
    for (const anchor of anchors) {
      const href = anchor.getAttribute('href');
      expect(href).toBeTruthy();
      expect(href).not.toBe('#');
    }
    expect(container.querySelector('a[href=""]')).toBeNull();
    expect(container.querySelector('a[href="#"]')).toBeNull();
  });

  it('keeps the words of the entries with no destination, as plain text', () => {
    render(<Footer />);
    const plain = [...footer.quickLinks.items, ...footer.legal.items].filter(item => item.href === '');
    expect(plain.map(item => item.label)).toEqual(['Collections', 'Terms of Service', 'Shipping Policy']);
    for (const item of plain) {
      expect(screen.getByText(item.label)).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: item.label })).toBeNull();
    }
  });

  it('links the entries that do have a destination', () => {
    render(<Footer />);
    const linked = [...footer.quickLinks.items, ...footer.legal.items].filter(item => item.href !== '');
    expect(linked.length).toBeGreaterThanOrEqual(5);
    for (const item of linked) {
      expect(screen.getByRole('link', { name: item.label })).toHaveAttribute('href', item.href);
    }
  });

  it('carries the brand line, the address and the copyright with the current year', () => {
    render(<Footer />);
    expect(screen.getByText(footer.brand.body)).toBeInTheDocument();
    expect(screen.getByText(footer.contact.address)).toBeInTheDocument();
    expect(
      screen.getByText(`© ${new Date().getFullYear()} ${footer.legal.copyright}`)
    ).toBeInTheDocument();
    expect(screen.getByRole('img', { name: footer.brand.logoAlt })).toBeInTheDocument();
  });

  it('is a contentinfo landmark with no flat grey, shadow, pill or gradient styling', () => {
    const { container } = render(<Footer />);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();

    const tokens = Array.from(container.querySelectorAll('[class]')).flatMap(node =>
      (node.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)
    );
    expect(tokens.filter(token => /gradient|^rounded|shadow|(^|:)(bg|text|border)-gray-/.test(token))).toEqual([]);
    // Never dim type with an opacity utility.
    expect(tokens.filter(token => /(^|:)text-[\w-]+\/\d+/.test(token))).toEqual([]);
  });

  it('renders social links as text, never icons, once the owner supplies URLs', async () => {
    vi.resetModules();
    vi.doMock('@/lib/content/site-copy', async () => {
      const actual = await vi.importActual<typeof import('@/lib/content/site-copy')>(
        '@/lib/content/site-copy'
      );
      return {
        siteCopy: {
          ...actual.siteCopy,
          footer: {
            ...actual.siteCopy.footer,
            social: [{ label: 'Instagram', href: 'https://example.com/divyafal' }],
          },
        },
      };
    });
    const { default: FooterWithSocial } = await import('./footer');
    const { container } = render(<FooterWithSocial />);

    const link = screen.getByRole('link', { name: 'Instagram' });
    expect(link).toHaveAttribute('href', 'https://example.com/divyafal');
    expect(container.querySelector('svg')).toBeNull();
  });
});
