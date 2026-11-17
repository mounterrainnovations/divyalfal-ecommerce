import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProductDetails from './product-details';
import ProductHero from './product-hero';
import YouMayAlsoLike from './you-may-also-like';
import { siteCopy } from '@/lib/content/site-copy';
import type { Product } from '@/types';

// The route imports Prisma at module scope. Tests that render the page feed it a product here.
const findUnique = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db', () => ({ prisma: { product: { findUnique } } }));

const base: Product = {
  id: 'p1',
  name: 'Midnight Silk Saree',
  price: 3500,
  image: '/mocks/mock_mostRecommended_common.jpg',
  photos: ['/a.jpg', '/b.jpg', '/c.jpg'],
  category: 'Sarees',
  specifications:
    '<p><strong>Great</strong></p><p></p><p><em>for</em></p><p>testing &amp; more</p>',
};

/** Every class token rendered anywhere inside a container. */
const classTokens = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('[class]')).flatMap(node =>
    (node.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)
  );

const BANNED =
  /^(rounded-full|rounded-3xl|shadow|shadow-.+|bg-gradient-.+|bg-linear-.+|text-gray-.+|bg-gray-.+|border-gray-.+)$/;

describe('ProductDetails', () => {
  it('renders the name as the only h1, the resolved price and the specifications', () => {
    render(<ProductDetails product={base} />);

    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent('Midnight Silk Saree');
    expect(screen.getByText('₹3,500')).toBeInTheDocument();

    // Specifications are a definition list, not a paragraph blob.
    const term = screen.getByText('Great');
    expect(term.tagName).toBe('DT');
    expect(screen.getByText('for').tagName).toBe('DD');
    expect(screen.getByText('testing & more').tagName).toBe('DD');
  });

  it('puts the section headings in order beneath the h1, from the copy module', () => {
    render(<ProductDetails product={base} />);
    const headings = screen
      .getAllByRole('heading')
      .map(h => [h.tagName, h.textContent] as const);
    expect(headings).toEqual([
      ['H1', 'Midnight Silk Saree'],
      ['H2', siteCopy.product.description.heading],
      ['H2', siteCopy.product.shipping.heading],
      ['H2', siteCopy.product.care.heading],
      ['H2', siteCopy.product.disclaimer.heading],
    ]);
  });

  it('renders the shipping, care and disclaimer prose verbatim from the copy module', () => {
    render(<ProductDetails product={base} />);
    for (const line of [
      ...siteCopy.product.shipping.items,
      ...siteCopy.product.care.items,
      ...siteCopy.product.disclaimer.items,
    ]) {
      expect(screen.getByText(line)).toBeInTheDocument();
    }
    expect(screen.getByText('Standard delivery takes 5-7 business days across India.')).toBeInTheDocument();
    expect(
      screen.getByText("Dry clean only to maintain the fabric's quality and embellishments.")
    ).toBeInTheDocument();
  });

  it('shows the sale price in the sale colour with the original struck through when the sale is real', () => {
    const { container } = render(
      <ProductDetails product={{ ...base, price: 10000, sale: true, salePrice: 6000 }} />
    );
    expect(screen.getByText('₹6,000')).toHaveClass('text-sale');
    const struck = container.querySelector('s');
    expect(struck).not.toBeNull();
    expect(struck).toHaveTextContent('₹10,000');
    expect(screen.getByText(/40% off/i)).toBeInTheDocument();
    expect(screen.getByText(/^on sale/i)).toBeInTheDocument();
  });

  it.each([
    ['null', null],
    ['zero', 0],
    ['undefined', undefined],
  ])('shows no sale badge or struck price when sale is true but salePrice is %s', (_label, salePrice) => {
    const { container } = render(
      <ProductDetails
        product={{ ...base, sale: true, salePrice: salePrice as unknown as number | undefined }}
      />
    );
    expect(container.querySelector('s')).toBeNull();
    expect(screen.queryByText(/^on sale/i)).toBeNull();
    expect(screen.queryByText(/% off/i)).toBeNull();
    expect(screen.getByText('₹3,500')).not.toHaveClass('text-sale');
  });

  it('offers a WhatsApp enquiry carrying the URL-encoded product name', () => {
    const name = 'Red & Gold "Banarasi" Saree';
    render(<ProductDetails product={{ ...base, name }} />);

    const link = screen.getByRole('link', { name: /whatsapp/i });
    const href = link.getAttribute('href') ?? '';
    expect(href.startsWith('https://wa.me/919977057045?text=')).toBe(true);
    // Encoded, so '&' and '"' cannot break out of the query string.
    expect(href).toContain(encodeURIComponent(name));
    expect(href).not.toContain('& ');
    expect(new URL(href).searchParams.get('text')).toContain(name);
  });

  it('carries a chosen size in the enquiry, and no size when none is chosen', async () => {
    const user = userEvent.setup();
    render(<ProductDetails product={base} />);
    const text = () =>
      new URL(screen.getByRole('link', { name: /whatsapp/i }).getAttribute('href') ?? '').searchParams.get(
        'text'
      ) ?? '';

    expect(text()).not.toMatch(/size/i);
    await user.click(screen.getByRole('radio', { name: 'M' }));
    expect(text()).toMatch(/size M/i);
  });

  it('lets a chosen size be cleared, so the enquiry stops naming it', async () => {
    const user = userEvent.setup();
    render(<ProductDetails product={base} />);
    const text = () =>
      new URL(screen.getByRole('link', { name: /whatsapp/i }).getAttribute('href') ?? '').searchParams.get(
        'text'
      ) ?? '';

    // Nothing to clear until a size is chosen.
    expect(screen.queryByRole('button', { name: /clear size/i })).toBeNull();

    await user.click(screen.getByRole('radio', { name: 'L' }));
    expect(text()).toMatch(/size L/i);

    await user.click(screen.getByRole('button', { name: /clear size/i }));
    expect(screen.getAllByRole('radio').every(radio => !(radio as HTMLInputElement).checked)).toBe(true);
    expect(text()).not.toMatch(/size/i);
    expect(screen.queryByRole('button', { name: /clear size/i })).toBeNull();
  });

  /**
   * "Clear size" is the only control on the page that unmounts itself on activation. Without
   * somewhere to send focus, the keyboard user who pressed it lands on `<body>` -- WCAG 2.4.3
   * Focus Order -- and has to tab in from the top of the document again. Focus goes back to
   * the control group whose state they just changed.
   */
  it('moves focus into the size group when Clear size unmounts itself', async () => {
    const user = userEvent.setup();
    render(<ProductDetails product={base} />);

    await user.click(screen.getByRole('radio', { name: 'L' }));
    const clear = screen.getByRole('button', { name: /clear size/i });
    clear.focus();
    expect(document.activeElement).toBe(clear);

    await user.click(clear);

    expect(document.activeElement).not.toBe(document.body);
    const focused = document.activeElement as HTMLInputElement;
    expect(focused.tagName).toBe('INPUT');
    expect(focused.type).toBe('radio');
    // The first of the group, which is where an unchecked radio group's tab stop is anyway.
    expect(focused.value).toBe('XS');
    expect(focused.checked).toBe(false);
  });

  it('has no quantity selector and no link that leads nowhere', () => {
    const { container } = render(<ProductDetails product={base} />);
    expect(screen.queryByLabelText(/quantity/i)).toBeNull();
    expect(container.querySelector('input[type="number"]')).toBeNull();
    expect(container.querySelector('a[href="#"]')).toBeNull();
  });

  it('never injects specification markup as HTML', () => {
    const { container } = render(
      <ProductDetails
        product={{
          ...base,
          specifications: '<p>safe</p><script>window.hacked=1</script><img src=x onerror="window.hacked=2">',
        }}
      />
    );
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container.innerHTML).not.toContain('onerror');
    expect(screen.getByText('safe')).toBeInTheDocument();
  });

  it('renders no description section when the product has no specifications', () => {
    render(<ProductDetails product={{ ...base, specifications: undefined }} />);
    expect(
      screen.queryByRole('heading', { name: siteCopy.product.description.heading })
    ).toBeNull();
  });

  it('uses no banned styling', () => {
    const { container } = render(
      <ProductDetails product={{ ...base, sale: true, salePrice: 2500 }} />
    );
    expect(classTokens(container).filter(token => BANNED.test(token))).toEqual([]);
    expect(container.innerHTML).not.toMatch(/gradient/i);
  });
});

describe('ProductHero', () => {
  it('renders every photo in the image column, each with its own accessible name', () => {
    render(<ProductHero photos={base.photos} productName={base.name} />);
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(3);
    const names = images.map(img => img.getAttribute('alt'));
    expect(new Set(names).size).toBe(3);
    expect(names.every(name => name?.includes('Midnight Silk Saree'))).toBe(true);
  });

  it('renders a labelled empty frame and no <img> at all when the product has no photos', () => {
    const { container } = render(<ProductHero photos={[]} productName={base.name} />);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText(/image coming soon/i)).toBeInTheDocument();
    // The old hero swapped in a stock garment photo here.
    expect(container.innerHTML).not.toContain('mock_mostRecommended_common');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('gives the previous and next controls distinct names, and omits them for a single photo', () => {
    const { rerender } = render(<ProductHero photos={base.photos} productName={base.name} />);
    expect(screen.getByRole('button', { name: 'Previous image' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next image' })).toBeInTheDocument();

    rerender(<ProductHero photos={['/a.jpg']} productName={base.name} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('makes the strip a tab stop only when there is something to scroll', () => {
    const { rerender } = render(<ProductHero photos={base.photos} productName={base.name} />);
    expect(screen.getByRole('region', { name: /product photographs/i })).toHaveAttribute('tabindex', '0');

    rerender(<ProductHero photos={['/a.jpg']} productName={base.name} />);
    expect(screen.getByRole('region', { name: /product photographs/i })).not.toHaveAttribute('tabindex');
  });

  it('gives the empty frame the same shape as a photograph at every width', () => {
    const { container: empty } = render(<ProductHero photos={[]} productName={base.name} />);
    const { container: full } = render(<ProductHero photos={['/a.jpg']} productName={base.name} />);
    const ratio = (container: HTMLElement) =>
      classTokens(container).filter(token => token.includes('aspect-'));
    expect(ratio(empty)).toEqual(['aspect-[3/4]']);
    expect(ratio(full)).toEqual(['aspect-[3/4]']);
  });

  it('follows rapid presses of Next to successive photos, not to the one the scroll has reached', async () => {
    const user = userEvent.setup();
    const scrollTo = vi.fn();
    const width = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(300);
    Element.prototype.scrollTo = scrollTo;
    try {
      render(<ProductHero photos={base.photos} productName={base.name} />);
      const next = screen.getByRole('button', { name: 'Next image' });
      // Two presses before any scroll event has reported progress.
      await user.click(next);
      await user.click(next);
      expect(scrollTo.mock.calls.map(call => call[0].left)).toEqual([300, 600]);

      await user.click(screen.getByRole('button', { name: 'Previous image' }));
      expect(scrollTo.mock.calls[2][0].left).toBe(300);
    } finally {
      width.mockRestore();
      delete (Element.prototype as { scrollTo?: unknown }).scrollTo;
    }
  });

  it('uses no banned styling', () => {
    const { container } = render(<ProductHero photos={base.photos} productName={base.name} />);
    expect(classTokens(container).filter(token => BANNED.test(token))).toEqual([]);
  });
});

describe('YouMayAlsoLike', () => {
  const related = [
    { ...base, id: 'p1', name: 'Current' },
    ...[2, 3, 4, 5].map(n => ({ ...base, id: `p${n}`, name: `Garment ${n}` })),
  ];

  afterEach(() => vi.unstubAllGlobals());

  it('keeps the existing request shape, leaves the current product out, and shows an honest three-up strip', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ products: related }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<YouMayAlsoLike currentProductId="p1" />);

    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: siteCopy.product.related.heading, level: 2 })
      ).toBeInTheDocument()
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/products?limit=4');

    const section = screen.getByRole('region', { name: siteCopy.product.related.heading });
    const links = within(section).getAllByRole('link');
    // limit=4 minus the current product can only ever leave three, so the row is three-up:
    // each tile spans a third of the grid and there is no blank quarter.
    expect(links).toHaveLength(3);
    expect(links.map(link => link.getAttribute('href'))).toEqual([
      '/product/p2',
      '/product/p3',
      '/product/p4',
    ]);
    expect(within(section).queryByText('Current')).toBeNull();
    // Tiles sit under the page's h2, so their names are h3.
    expect(within(section).getAllByRole('heading', { level: 3 })).toHaveLength(3);
    /**
     * The layout and the `sizes` hint have to agree, measured at every breakpoint.
     *
     * `col-span-12 lg:col-span-4` left the strip one-up all the way to 1023px: at 768 a tile
     * rendered 720px wide while `ProductTile`'s shared hint still claimed 33vw (253px), so the
     * browser fetched roughly a third of the width it was about to display and a couture
     * photograph arrived visibly upscaled. Three-up from `md` divides the twelve columns
     * exactly (no ragged row, which is why this is not `col-span-6`) and keeps one-up on
     * phones, where a third of 390px is not a photograph worth showing.
     */
    for (const link of links) {
      const cell = link.closest<HTMLElement>('[class*="col-span"]')!;
      expect(cell.className).toContain('col-span-12');
      expect(cell.className).toContain('md:col-span-4');
      // Not two-up: three tiles would fill a row of two and strand the third beside a blank.
      expect(cell.className).not.toMatch(/(?:^|\s)(?:md:|lg:)?col-span-6(?:\s|$)/);
    }

    // The stagger steps per visual column, and the strip is three-up, never four.
    const delays = Array.from(
      section.querySelectorAll<HTMLElement>('[style*="--reveal-delay"]')
    ).map((node) => node.style.getPropertyValue('--reveal-delay'));
    expect(delays).toEqual(['0ms', '60ms', '120ms']);
  });

  /**
   * The hint the browser picks a file from, matched to the widths this strip measured in a
   * real browser: 342px at 390, 224px at 768, 277px at 1024, 416px at 1440 and above (the
   * grid caps at the 1440 content max, so beyond that it is a fixed pixel width, not a vw).
   * `ProductTile`'s shared default describes a four-up grid that no surface here uses, so this
   * one is passed per surface.
   */
  it('hints the photograph at the width this strip actually renders', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ products: related }) })
    );
    const { container } = render(<YouMayAlsoLike currentProductId="p1" />);
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: siteCopy.product.related.heading, level: 2 })
      ).toBeInTheDocument()
    );

    const sizes = container.querySelector('img')?.getAttribute('sizes') ?? '';
    expect(sizes).toBe(
      '(min-width: 1440px) 416px, (min-width: 1024px) 29vw, (min-width: 768px) 31vw, calc(100vw - 48px)'
    );
    // Not `ProductTile`'s generous fallback, which this surface must never rely on.
    expect(sizes).not.toBe('calc(100vw - 48px)');
    // Not the retired shared default, which under-fetched at every one of those widths.
    expect(sizes).not.toContain('25vw');
    expect(sizes).not.toContain('33vw');
    expect(sizes).not.toContain('50vw');
  });

  it('renders nothing when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(<YouMayAlsoLike currentProductId="p1" />);
    await waitFor(() => expect(error).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
    error.mockRestore();
  });
});

describe('product route', () => {
  it('keeps force-dynamic and revalidate = 0, the deliberate production fix', async () => {
    const route = await import('@/app/product/[id]/page');
    expect(route.dynamic).toBe('force-dynamic');
    expect(route.revalidate).toBe(0);
  });

  const renderPage = async () => {
    findUnique.mockResolvedValue({
      id: 'p1',
      name: 'Midnight Silk Saree',
      price: 3500,
      sale: false,
      salePrice: null,
      photos: ['/a.jpg', '/b.jpg'],
      category: 'SAREE',
      specifications: '<p><strong>Great</strong></p><p>testing</p>',
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ products: [] }) }));
    const route = await import('@/app/product/[id]/page');
    const ui = await route.default({ params: Promise.resolve({ id: 'p1' }) });
    return render(ui);
  };

  afterEach(() => vi.unstubAllGlobals());

  it('keeps the detail column reachable: sticky, capped to the viewport, and scrollable, with a disclosure open', async () => {
    const user = userEvent.setup();
    await renderPage();

    // The wrapper that pins the details is the one that contains the h1.
    const column = screen.getByRole('heading', { level: 1 }).closest('[class*="lg:sticky"]');
    expect(column).not.toBeNull();
    const tokens = (column?.getAttribute('class') ?? '').split(/\s+/);
    expect(tokens).toContain('lg:sticky');
    // Without a cap, an opened disclosure makes the column taller than the viewport and the
    // Shipping / Care / Disclaimer prose sits below the pin, unreachable until the photos end.
    expect(tokens).toContain('lg:max-h-[calc(100vh-7rem)]');
    expect(tokens).toContain('lg:overflow-y-auto');
    expect(tokens).toContain('overscroll-contain');
    // On Windows the scrollbar is laid out, not overlaid, so it appears the moment a
    // disclosure makes the column overflow and steals ~16px from a four-column measure --
    // re-wrapping the prose under the reader's eyes. A stable gutter reserves the space.
    expect(tokens).toContain('lg:[scrollbar-gutter:stable]');

    // Open a disclosure: its prose is then inside the capped column.
    await user.click(screen.getByRole('heading', { name: siteCopy.product.shipping.heading }));
    const disclosure = screen
      .getByRole('heading', { name: siteCopy.product.shipping.heading })
      .closest('details');
    expect(disclosure).toHaveAttribute('open');
    expect(column).toContainElement(screen.getByText(siteCopy.product.shipping.items[0]));
  });

  it('never renders an empty breadcrumb link', async () => {
    await renderPage();
    const crumbs = within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getAllByRole('link');
    expect(crumbs.length).toBe(2);
    for (const crumb of crumbs) expect(crumb.textContent?.trim()).not.toBe('');
  });
});
