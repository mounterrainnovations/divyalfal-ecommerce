import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProductDetails from './product-details';
import ProductHero from './product-hero';
import YouMayAlsoLike from './you-may-also-like';
import { siteCopy } from '@/lib/content/site-copy';
import type { Product } from '@/types';

// The route imports Prisma at module scope; the test only reads its exports.
vi.mock('@/lib/db', () => ({ prisma: {} }));

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

  it('keeps the existing request shape, leaves the current product out, and shows a four-up strip', async () => {
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
    expect(links).toHaveLength(4);
    expect(links.map(link => link.getAttribute('href'))).toEqual([
      '/product/p2',
      '/product/p3',
      '/product/p4',
      '/product/p5',
    ]);
    expect(within(section).queryByText('Current')).toBeNull();
    // Tiles sit under the page's h2, so their names are h3.
    expect(within(section).getAllByRole('heading', { level: 3 })).toHaveLength(4);
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
});
