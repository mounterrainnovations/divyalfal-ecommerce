import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import type { ReactElement } from 'react';

/**
 * Both listing pages read `?categories=` through `useSearchParams`, and the navbar reads
 * `usePathname`. Neither needs a real router here; this sweep only cares what reaches the DOM.
 */
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(''),
  usePathname: () => '/',
}));

// The product route imports Prisma at module scope; nothing here renders that route.
vi.mock('@/lib/db', () => ({ prisma: { product: { findUnique: vi.fn() } } }));

import { siteCopy } from '@/lib/content/site-copy';
import type { Product } from '@/types';

import Home from '@/app/page';
import ProductsPage from '@/app/products/page';
import SalePage from '@/app/sale/page';
import ContactUsPage from '@/app/contact-us/page';
import RefundPolicyPage, { metadata as refundMetadata } from '@/app/refund-policy/page';
import CancellationPolicyPage, {
  metadata as cancellationMetadata,
} from '@/app/cancellation-policy/page';
import { metadata as rootMetadata } from '@/app/layout';
import VirasatAcademyPage from '@/app/virasat-academy/page';
import NotFound from '@/app/not-found';
import ProductNotFound from '@/app/product/[id]/not-found';
import NavBar from '@/components/layout/navbar';
import ProductDetails from '@/components/features/products/product-details';
import ProductHero from '@/components/features/products/product-hero';
import YouMayAlsoLike from '@/components/features/products/you-may-also-like';

/* -------------------------------------------------------------------------- */
/* Flattening, the same way `lib/content/site-copy.test.ts` does it            */
/* -------------------------------------------------------------------------- */

const flatten = (node: unknown, key: string, out: Record<string, string>) => {
  if (typeof node === 'string') {
    out[key] = node;
  } else if (Array.isArray(node)) {
    node.forEach((v, i) => flatten(v, `${key}[${i}]`, out));
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) flatten(v, key ? `${key}.${k}` : k, out);
  }
};

const LEAVES: Record<string, string> = {};
flatten(siteCopy, '', LEAVES);

/* -------------------------------------------------------------------------- */
/* The allowlist: every leaf this sweep does not require on a page, and why    */
/* -------------------------------------------------------------------------- */

/**
 * A conditional leaf, with the condition. One line each, so an exemption is visible rather
 * than silent — the whole point of this file. A pattern ending in `.` matches that key and
 * everything under it.
 *
 * Nothing goes in here because it is inconvenient to render. If a leaf is exempt, the reason
 * has to name the state that shows it or the decision that keeps it off the page.
 */
const ALLOWED: ReadonlyArray<readonly [prefix: string, reason: string]> = [
  // --- Imagery the revamp retired as imagery. The words are on the page; the pictures are
  // not, and that is the design rather than an omission. Both stay in the module because
  // Phase 2's CMS seed consumes these keys.
  ['nav.logo', 'the navbar sets the brand as type, not as the logo image (spec §7)'],
  [
    'home.categories.items[0].image',
    'Movement 2 is a type index: the six avatar circles are gone (spec §8)',
  ],
  [
    'home.categories.items[1].image',
    'Movement 2 is a type index: the six avatar circles are gone (spec §8)',
  ],
  [
    'home.categories.items[2].image',
    'Movement 2 is a type index: the six avatar circles are gone (spec §8)',
  ],
  [
    'home.categories.items[3].image',
    'Movement 2 is a type index: the six avatar circles are gone (spec §8)',
  ],
  [
    'home.categories.items[4].image',
    'Movement 2 is a type index: the six avatar circles are gone (spec §8)',
  ],
  [
    'home.categories.items[5].image',
    'Movement 2 is a type index: the six avatar circles are gone (spec §8)',
  ],

  // --- The fallback tiers. Owner's call (spec §5a.1): they render only when the catalogue
  // has no photographed garment, which the sweep's real-stock surfaces deliberately do not
  // simulate. `components/sections/collection.test.tsx` and `shop-by-style.test.tsx` both
  // render that state and assert every one of these strings.
  ['home.collection', 'fallback tier: renders only when no photographed product exists'],
  ['home.style.items', 'fallback tier: renders only when no photographed product exists'],

  // --- The retired Most Recommended rail's hardcoded garments and its cart apparatus.
  [
    'home.recommended.bestSellers',
    'retired rail: invented garment names/prices, never promoted to stock (spec §5a.1)',
  ],
  [
    'home.recommended.freshArrivals',
    'retired rail: invented garment names/prices, never promoted to stock (spec §5a.1)',
  ],
  ['home.recommended.addToCartLabel', 'retired cart string: no cart exists (spec §3)'],
  ['home.recommended.pricePrefix', 'retired cart string: prices come from resolvePrice'],

  // --- Testimonials beyond the first. One quote is on screen at a time by design.
  ['home.testimonials[1]', 'quote 2 of 5: shown only after the reader advances'],
  ['home.testimonials[2]', 'quote 3 of 5: shown only after the reader advances'],
  ['home.testimonials[3]', 'quote 4 of 5: shown only after the reader advances'],
  ['home.testimonials[4]', 'quote 5 of 5: shown only after the reader advances'],

  // --- The academy's confirmation. Deliberately unrendered: nothing posts anywhere yet, so
  // printing it would be a lie. Phase 2 Task 8 renders it on a real response.
  ['academy.success', 'deliberately unrendered: no enquiry endpoint yet, so no confirmation'],

  // --- Empty and loading states, which are states rather than content.
  ['products.empty', 'empty state: renders only when a filtered listing has no results'],
  ['products.loading', 'loading state: renders only while the first request is in flight'],
  ['sale.empty', 'empty state: renders only when a filtered listing has no results'],
  ['sale.loading', 'loading state: renders only while the first request is in flight'],
];

/**
 * The one presentation transform the storefront applies to a stored string.
 *
 * `policy-prose`'s `RichText` linkifies a `+91…` number inside a sentence and prints it as
 * the display form — the bidi-isolated, non-breaking-spaced string the shipped site has always
 * printed. So `cancellationPolicy.howTo.steps[0].body` reaches the page with every word intact
 * and the digits set as the site sets them. The words are what this sweep is about, so the
 * same substitution is applied before looking for the sentence.
 */
const asPresented = (value: string) =>
  value.replace(siteCopy.footer.contact.phone, siteCopy.footer.contact.phoneDisplay);

const allowance = (key: string) =>
  ALLOWED.find(([prefix]) => key === prefix || key.startsWith(`${prefix}.`) || key.startsWith(`${prefix}[`));

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                   */
/* -------------------------------------------------------------------------- */

const photographed: Product = {
  id: 'p1',
  name: 'Midnight Silk Saree',
  price: 45000,
  sale: false,
  image: '/a.jpg',
  photos: ['/a.jpg', '/b.jpg'],
  category: 'Sarees',
  specifications: '<p><strong>Fabric</strong></p><p>Silk</p>',
};

const onSale: Product = {
  id: 'p2',
  name: 'Ivory Anarkali Suit',
  price: 20000,
  sale: true,
  salePrice: 15000,
  image: '/s.jpg',
  photos: ['/s.jpg'],
  category: 'Suits',
};

/**
 * One stub for every endpoint the storefront calls. `/api/products` serves the listings and
 * the related strip, `/api/homepage-sections` the two home product movements, `/api/slideshow`
 * the gallery.
 */
function stubFetch(products: Product[]) {
  const spy = vi.fn((input: unknown) => {
    const url = String(input);
    let body: unknown;
    if (url.includes('slideshow')) {
      body = { images: ['/slideshow/a.jpg', '/slideshow/b.jpg', '/slideshow/c.jpg'] };
    } else if (url.includes('homepage-sections')) {
      body = { freshArrivals: products, shopByStyle: products };
    } else {
      body = { products, total: products.length, page: 1, limit: 50, totalPages: 1 };
    }
    return Promise.resolve({ ok: true, status: 200, statusText: 'OK', json: async () => body });
  });
  vi.stubGlobal('fetch', spy);
  return spy;
}

/* -------------------------------------------------------------------------- */
/* Harvesting what actually reached the DOM                                   */
/* -------------------------------------------------------------------------- */

/**
 * Everything a visitor can read or a browser can act on: the rendered text, plus every
 * attribute value, decoded — `next/image` rewrites a `src` to `/_next/image?url=%2Fsamples…`,
 * so an image path only shows up percent-encoded. Raw values rather than `innerHTML`, so the
 * em dashes and curly apostrophes the copy carries are compared as themselves and not as HTML
 * entities.
 */
function harvest(container: HTMLElement): string {
  const parts: string[] = [container.textContent ?? ''];
  for (const node of Array.from(container.querySelectorAll('*'))) {
    for (const attribute of Array.from(node.attributes)) {
      parts.push(attribute.value);
      if (attribute.value.includes('%')) {
        try {
          parts.push(decodeURIComponent(attribute.value));
        } catch {
          // Not percent-encoded after all; the raw value is already in.
        }
      }
    }
  }
  return parts.join('\n');
}

/**
 * Every surface of the storefront, rendered in the state a visitor meets first.
 *
 * `/product/[id]` is not here as a route: it is a server component that reads Prisma, so its
 * three components are rendered directly instead, which is what the route composes.
 */
async function harvestEverything(): Promise<string> {
  // Factories rather than elements: an array of JSX elements is an array React would want
  // keys for, and these are rendered one at a time rather than as a list.
  const surfaces: ReadonlyArray<readonly [string, () => ReactElement]> = [
    ['home', () => <Home />],
    ['navbar', () => <NavBar />],
    ['products', () => <ProductsPage />],
    ['sale', () => <SalePage />],
    ['contact', () => <ContactUsPage />],
    ['refund policy', () => <RefundPolicyPage />],
    ['cancellation policy', () => <CancellationPolicyPage />],
    ['virasat academy', () => <VirasatAcademyPage />],
    ['404', () => <NotFound />],
    ['product 404', () => <ProductNotFound />],
    ['product detail', () => <ProductDetails product={photographed} />],
    [
      'product hero',
      () => <ProductHero photos={photographed.photos} productName={photographed.name} />,
    ],
    ['related strip', () => <YouMayAlsoLike currentProductId="other" />],
  ];

  // Route metadata reaches the document head rather than the component tree, so the exported
  // objects are harvested directly. Without this the four `*.meta.*` leaves would have to be
  // exempted, and a page that lost its title would go unnoticed.
  let harvested = [rootMetadata, refundMetadata, cancellationMetadata]
    .map(metadata => JSON.stringify(metadata))
    .join('\n');

  for (const [, surface] of surfaces) {
    const { container } = render(surface());
    // Let every in-flight request settle before reading the DOM. Two turns of the
    // microtask queue: one for the fetch, one for the state it sets.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    harvested += `\n${harvest(container)}`;
    cleanup();
  }
  return harvested;
}

/* -------------------------------------------------------------------------- */
/* The guard                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Rendered coverage: every word in the copy module reaches a page.
 *
 * `lib/content/site-copy.test.ts` guards the module with a committed snapshot and an explicit
 * leaf count, so no string can be reworded, renamed, added or dropped unnoticed. But a test
 * that reads the module can only prove the module is complete — it cannot see that a string
 * is in the module, in the snapshot, and on no page at all. Two sentences were in exactly
 * that state: `home.recommended.tabs[0].body` and `tabs[1].body` were preserved, snapshotted
 * and rendered by nothing, because when three product rails collapsed into Movement 3 only
 * one of the four tab leaves survived into the markup. A whole-branch review found them with
 * an ad-hoc sweep; this is that sweep, made permanent.
 *
 * The rule: render every surface and require each leaf's text somewhere in the output.
 * Conditional leaves — a fallback tier, a quote the reader has not advanced to, an empty
 * state, copy deliberately held back — are exempt only through `ALLOWED`, one reason each,
 * so the exemptions are a list someone can read rather than an absence nobody notices.
 *
 * It is a presence check, not a placement check: it cannot say a sentence is in the right
 * movement, only that it is on a page. The per-section tests say where.
 */
describe('rendered coverage of the copy module', () => {
  let harvested: string;

  beforeEach(() => {
    // jsdom ships no matchMedia; the spotlight band and the product hero both ask for one.
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    // The data hooks log their failure modes; nothing here fails, but keep the output clean.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    stubFetch([photographed, onSale]);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders every non-conditional leaf of siteCopy somewhere on a page', async () => {
    harvested = await harvestEverything();

    const missing: string[] = [];
    for (const [key, value] of Object.entries(LEAVES)) {
      if (value === '') continue; // An empty string cannot be looked for.
      if (allowance(key)) continue;
      if (harvested.includes(value) || harvested.includes(asPresented(value))) continue;
      missing.push(`${key} = ${JSON.stringify(value)}`);
    }

    // The message carries the whole list: a truncated diff is useless for a sweep this wide.
    expect(
      missing,
      `copy in the module that reaches no page:\n  ${missing.join('\n  ')}\n\n` +
        'Render it, or add it to ALLOWED with the condition that shows it.'
    ).toEqual([]);
  });

  it('checks a meaningful share of the module, so it cannot pass vacuously', async () => {
    const total = Object.keys(LEAVES).length;
    const exempt = Object.keys(LEAVES).filter(key => allowance(key) || LEAVES[key] === '').length;
    // The module's own guard pins the total at 370; this one pins how much of it is required.
    expect(total).toBe(370);
    expect(total - exempt).toBeGreaterThan(220);
    // Printed so the figure in the commit message and the report cannot drift from the code.
    expect({ total, exempt, required: total - exempt }).toMatchSnapshot();
  });

  it('gives every allowlist entry a reason and keeps every entry live', () => {
    for (const [prefix, reason] of ALLOWED) {
      expect(reason.length, `${prefix} needs a reason`).toBeGreaterThan(20);
      // An entry that matches no leaf is stale: the key was renamed or the copy was deleted,
      // and leaving it behind would silently exempt whatever takes that name next.
      const matched = Object.keys(LEAVES).filter(
        key => key === prefix || key.startsWith(`${prefix}.`) || key.startsWith(`${prefix}[`)
      );
      expect(matched.length, `${prefix} matches no leaf`).toBeGreaterThan(0);
    }
  });
});
