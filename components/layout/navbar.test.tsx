// The navigation bar's two new mechanisms: the categories menu (desktop dropdown and drawer
// group) and the active-route marking.
//
// The thing worth the most here is the href. A category link is `?categories=<display name>`
// and the display name is what `CATEGORY_MAPPING` turns back into a `ProductType` — so a
// hand-written slug does not throw, it renders an empty listing with no error anywhere. The
// hrefs are asserted character for character for that reason.
//
// The second is that the list is the *stored* one. `useShowcase` seeds from the hard-coded six
// and swaps in whatever the owner saved, so a test that only ever sees the defaults cannot
// tell a nav wired to the hook from one wired to `CATEGORY_CONFIG`.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import NavBar, { isCurrent } from './navbar';
import { siteCopy } from '@/lib/content/site-copy';

let pathname = '/';

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
}));

/** `useShowcase` fetches on mount; nothing here wants a real request. */
function stubShowcase(body?: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      if (body === undefined) return new Response('{}', { status: 404 });
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    })
  );
}

const DEFAULT_CATEGORY_NAMES = [
  'Sarees',
  'Indo-Western',
  'Lehengas',
  'Suits',
  'Kurta Pant',
  'Western',
];

/** The desktop row. The drawer holds a second copy of every link. */
const desktop = () => within(screen.getByRole('list', { name: 'Primary' }));
const drawer = () => within(screen.getByRole('list', { name: 'Menu' }));

function openDropdown() {
  fireEvent.click(screen.getByRole('button', { name: /categories/i }));
}

/**
 * These tests click real anchors, and jsdom answers a click on an `href` by trying to navigate
 * and logging "Not implemented" to stderr. Swallowing the default keeps the run's output about
 * the tests.
 */
const swallowNavigation = (event: MouseEvent) => event.preventDefault();

beforeEach(() => {
  pathname = '/';
  stubShowcase();
  document.addEventListener('click', swallowNavigation);
});

afterEach(() => {
  document.removeEventListener('click', swallowNavigation);
  cleanup();
  vi.unstubAllGlobals();
});

describe('isCurrent', () => {
  // `/` would otherwise match every route by prefix and "Home" would be marked current on the
  // contact page.
  it('matches the home link exactly and everything else by subtree', () => {
    expect(isCurrent('/', '/')).toBe(true);
    expect(isCurrent('/products', '/')).toBe(false);
    expect(isCurrent('/products', '/products')).toBe(true);
    expect(isCurrent('/products/anything', '/products')).toBe(true);
    expect(isCurrent('/sale', '/products')).toBe(false);
    // `footer.quickLinks` carries empty hrefs for pages that do not exist yet; an empty
    // string must not read as "every route".
    expect(isCurrent('/sale', '')).toBe(false);
  });
});

describe('NavBar', () => {
  it('keeps every existing link, and adds the categories menu beside them', () => {
    render(<NavBar />);

    for (const item of siteCopy.nav.items) {
      expect(desktop().getByRole('link', { name: item.label })).toHaveAttribute(
        'href',
        item.href
      );
    }
    expect(screen.getByRole('button', { name: /categories/i })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });

  it('marks the route being viewed, and only it', () => {
    pathname = '/sale';
    render(<NavBar />);

    expect(desktop().getByRole('link', { name: 'Sale' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(desktop().getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current');
  });

  it('keeps the dropdown shut until it is asked for', () => {
    render(<NavBar />);
    expect(screen.queryByRole('link', { name: 'Sarees' })).toBeNull();
  });

  it('opens on click and links each category by its display name', () => {
    render(<NavBar />);
    openDropdown();

    expect(screen.getByRole('button', { name: /categories/i })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(screen.getByRole('link', { name: 'Sarees' })).toHaveAttribute(
      'href',
      '/products?categories=Sarees'
    );
    // The two names a slug would have mangled.
    expect(screen.getByRole('link', { name: 'Indo-Western' })).toHaveAttribute(
      'href',
      '/products?categories=Indo-Western'
    );
    expect(screen.getByRole('link', { name: 'Kurta Pant' })).toHaveAttribute(
      'href',
      '/products?categories=Kurta%20Pant'
    );
  });

  it('shows all six categories and a way through to the full catalogue', () => {
    render(<NavBar />);
    openDropdown();

    for (const name of DEFAULT_CATEGORY_NAMES) {
      expect(screen.getByRole('link', { name })).toBeInTheDocument();
    }
    // The panel's own escape hatch reuses the existing "All Products" label rather than
    // inventing a second wording for it.
    expect(screen.getAllByRole('link', { name: siteCopy.nav.items[1].label }).length).toBe(2);
  });

  // The regression this exists for: `pointerenter` fires before `click`, so a trigger that
  // opens on hover and toggles on click opened and then immediately closed itself, and to a
  // mouse user the menu looked like it did nothing at all.
  it('survives the click that follows the hover which opened it, and closes on the next one', () => {
    render(<NavBar />);
    const trigger = screen.getByRole('button', { name: /categories/i });

    fireEvent.pointerEnter(trigger);
    expect(screen.getByRole('link', { name: 'Sarees' })).toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.getByRole('link', { name: 'Sarees' })).toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.queryByRole('link', { name: 'Sarees' })).toBeNull();
  });

  it('closes when the pointer leaves the bar', () => {
    render(<NavBar />);
    const trigger = screen.getByRole('button', { name: /categories/i });
    fireEvent.pointerEnter(trigger);

    fireEvent.pointerLeave(trigger.closest('nav')!);

    expect(screen.queryByRole('link', { name: 'Sarees' })).toBeNull();
  });

  it('closes on Escape and hands focus back to the trigger', () => {
    render(<NavBar />);
    const trigger = screen.getByRole('button', { name: /categories/i });
    openDropdown();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByRole('link', { name: 'Sarees' })).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('closes when a category is chosen', () => {
    render(<NavBar />);
    openDropdown();

    fireEvent.click(screen.getByRole('link', { name: 'Lehengas' }));

    expect(screen.queryByRole('link', { name: 'Lehengas' })).toBeNull();
  });

  // The client router does not unmount the bar between routes, so without this the panel
  // stays open on top of the page it just navigated to.
  it('closes when the route changes under it', () => {
    const { rerender } = render(<NavBar />);
    openDropdown();
    expect(screen.getByRole('link', { name: 'Suits' })).toBeInTheDocument();

    pathname = '/products';
    rerender(<NavBar />);

    expect(screen.queryByRole('link', { name: 'Suits' })).toBeNull();
  });

  it('takes its categories from the stored list, not the constant', async () => {
    stubShowcase({
      categories: [
        { name: 'Lehengas', image: '/categories/lehenga.png', visible: true },
        { name: 'Sarees', image: '/categories/saree.jpg', visible: false },
      ],
    });
    render(<NavBar />);
    openDropdown();

    // Hidden in the portal means absent from the menu, exactly as it is absent from the
    // homepage strip.
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Sarees' })).toBeNull());
    expect(screen.getByRole('link', { name: 'Lehengas' })).toBeInTheDocument();
    // The ones the stored list never mentioned keep their defaults rather than vanishing.
    expect(screen.getByRole('link', { name: 'Western' })).toBeInTheDocument();
  });
});

describe('NavBar mobile drawer', () => {
  // Closed, the drawer still holds a copy of every link; `aria-hidden` is what keeps that copy
  // out of the accessibility tree, and this is the assertion that says so.
  it('is out of the accessibility tree until it is opened', () => {
    render(<NavBar />);
    expect(screen.queryByRole('list', { name: 'Menu' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));

    expect(drawer().getByRole('link', { name: 'Contact' })).toHaveAttribute(
      'href',
      '/contact-us'
    );
  });

  it('expands the categories group in place and links them the same way', () => {
    render(<NavBar />);
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));

    const group = drawer().getByRole('button', { name: /categories/i });
    expect(group).toHaveAttribute('aria-expanded', 'false');
    expect(drawer().queryByRole('link', { name: 'Sarees' })).toBeNull();

    fireEvent.click(group);

    expect(group).toHaveAttribute('aria-expanded', 'true');
    expect(drawer().getByRole('link', { name: 'Kurta Pant' })).toHaveAttribute(
      'href',
      '/products?categories=Kurta%20Pant'
    );
  });

  it('closes the whole drawer when a category is tapped', () => {
    render(<NavBar />);
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    fireEvent.click(drawer().getByRole('button', { name: /categories/i }));

    fireEvent.click(drawer().getByRole('link', { name: 'Suits' }));

    expect(screen.queryByRole('list', { name: 'Menu' })).toBeNull();
  });

  it('closes on Escape and on the close button', () => {
    render(<NavBar />);

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('list', { name: 'Menu' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close menu' }));
    expect(screen.queryByRole('list', { name: 'Menu' })).toBeNull();
  });
});
