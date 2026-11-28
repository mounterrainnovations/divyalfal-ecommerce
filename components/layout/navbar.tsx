'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, Menu, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { siteCopy } from '@/lib/content/site-copy';
import AnnouncementBar from '@/components/layout/announcement-bar';
import NavSearch from '@/components/layout/nav-search';
import {
  NavCategoryCards,
  NavCategoryList,
  useNavCategories,
} from '@/components/layout/nav-categories';
import { cn } from '@/lib/utils';

/**
 * The storefront's navigation bar.
 *
 * WHAT WAS WRONG WITH IT. It was a wordmark and five links set at `text-xl font-semibold` in
 * the body face, with a hairline that swept in on hover — and nothing else. Nothing in it said
 * what the shop sells. A clothing shop's menu is how you find a saree; this one offered
 * "All Products" and left the visitor to the filters. That is the whole of the owner's "nav bar
 * looks basic", and the fix is mostly the second complaint: put the categories in it.
 *
 * THE BAR IS STILL THE SAME BAR. Logo left, links right, white, fixed. What changed is the
 * proportion of it: the links dropped from 20px semibold to 12px in small caps at the eyebrow
 * tracking the rest of the site sets its smallest type in. Large bold sans next to a
 * high-contrast serif wordmark is what made it read as a template; small, wide-tracked caps
 * read as a shop, and leave the wordmark the only loud thing in the bar, which is correct.
 *
 * THE HEIGHT IS LOAD-BEARING. `components/layout/site-chrome.tsx` renders
 * `<main className="pt-24">` to clear this fixed bar, and that file is not mine to edit. So the
 * bar is `h-24` (96px) at rest, exactly as it was. It condenses to 72px once the page has
 * scrolled past the first inch, which is safe precisely because the spacer is static: the 24px
 * it gives back is above a fold the visitor has already left. Were the *resting* height to
 * change, the spacer and the bar would disagree and the top of every page would sit under the
 * logo.
 *
 * THE DRAWER NOW STARTS AT `lg`, NOT `md`. The row is six items plus the wordmark, and at
 * 768px it does not fit: the first attempt put "Home" under the logo and wrapped "All Products"
 * and "Virasat Academy" onto two lines each. Stepping the type down to 10px would have bought
 * the room at the cost of the thing the bar was being fixed for. This is not a tablet losing
 * something it had — the old bar set five links at `text-xl`, which overflowed 768px by more
 * than this one does, so the drawer is what a tablet was always owed.
 */

/**
 * The menu's own label, not brand copy.
 *
 * `siteCopy` holds what the shop *says*; this is apparatus, in the same class as the existing
 * "Open menu" / "Close menu" labels below. It is the owner's own word for what the menu holds,
 * and the homepage strip is headed "Shop by Category", so the two agree.
 */
const CATEGORIES_LABEL = 'Categories';

const CATEGORIES_PANEL_ID = 'nav-categories-panel';
const CATEGORIES_DRAWER_ID = 'nav-categories-drawer';

/**
 * Whether a link is the page being viewed.
 *
 * `/` has to match exactly or it would mark itself current on every route. Everything else
 * matches its own subtree, so `/product/123` still lights "All Products" — the detail page is
 * reached from that listing, and a bar that goes blank there reads as a page outside the site.
 */
export function isCurrent(pathname: string, href: string): boolean {
  if (!href) return false;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

const NavBar = () => {
  const pathname = usePathname();
  const categories = useNavCategories();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [isDrawerCategoriesOpen, setIsDrawerCategoriesOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const categoriesTriggerRef = useRef<HTMLButtonElement>(null);

  /**
   * Whether the pointer, not a click, is what opened the dropdown.
   *
   * Hover-to-open and click-to-toggle fight each other, and the first version of this shipped
   * the fight: `pointerenter` fires before `click`, so by the time the click arrived the menu
   * was already open and the toggle closed it again. To a mouse user the trigger looked dead.
   * Remembering that the pointer did the opening lets the click that follows it be a no-op —
   * and the *next* click close, as a toggle should. Touch takes the same path (Chrome fires a
   * synthetic `pointerenter` before `click`), so the first tap opens and the second closes.
   * A keyboard never sets it, so Enter and Space toggle outright.
   */
  const openedByPointer = useRef(false);

  const closeMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
    setIsDrawerCategoriesOpen(false);
  }, []);

  /**
   * Both menus close on navigation.
   *
   * Next's client router does not unmount this component between routes, so without this the
   * drawer stays open over the page it just took you to — which on a phone looks like the tap
   * did nothing at all. The links close them on click too; this is the backstop for every
   * other way the pathname can change (back button, a link elsewhere on the page, a redirect).
   *
   * It adjusts state during render against the previous pathname rather than in an effect, as
   * React's own "storing information from previous renders" recipe does. An effect would paint
   * the new page once with the old page's menu still over it before closing it.
   */
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setIsCategoriesOpen(false);
    setIsMobileMenuOpen(false);
    setIsDrawerCategoriesOpen(false);
  }

  /**
   * Escape closes whichever menu is open — one listener for both, on the window, because the
   * drawer's trigger is not inside the drawer and focus may be anywhere while it is open.
   */
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setIsCategoriesOpen(open => {
        // Escaping out of a dropdown must return focus to what opened it, or the next Tab
        // starts again from the top of the document.
        if (open) categoriesTriggerRef.current?.focus();
        return false;
      });
      closeMenu();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [closeMenu]);

  /**
   * The condense threshold is 24px rather than 0 so the bar cannot flicker between its two
   * heights under the elastic overscroll a trackpad produces at the very top of a page.
   */
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = siteCopy.nav.items;
  const [homeLink, productsLink] = navLinks;

  const linkClasses = (current: boolean) =>
    cn(
      'group relative inline-flex items-center py-2 font-sans text-xs font-medium tracking-[0.18em] whitespace-nowrap uppercase transition-colors',
      'rounded-sm focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-4 focus-visible:outline-none',
      current ? 'text-gray-900' : 'text-gray-500 hover:text-gray-900'
    );

  /**
   * The hairline under a link.
   *
   * It sweeps in from the left on hover and simply stays put on the current page. The sweep is
   * the one piece of the old bar worth keeping — it is quiet, and it is the only motion in the
   * chrome — but it had no resting state, so there was no way to tell from the bar which page
   * you were on.
   */
  const underline = (active: boolean) => (
    <span
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-x-0 bottom-0 h-px origin-left bg-gray-900 transition-transform duration-300',
        active
          ? 'scale-x-100'
          : 'origin-right scale-x-0 group-hover:origin-left group-hover:scale-x-100'
      )}
    />
  );

  const drawerLinkClasses =
    'flex min-h-[48px] items-center -mx-2 rounded-lg px-2 font-serif text-2xl text-gray-900 transition hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:outline-none';

  return (
    <nav
      className={cn(
        'fixed top-0 right-0 left-0 z-50 bg-[var(--paper)] transition-shadow duration-300',
        isScrolled
          ? 'shadow-[0_1px_0_0_rgba(0,0,0,0.08),0_8px_24px_-20px_rgba(0,0,0,0.45)]'
          : 'border-b border-gray-100'
      )}
      /* Leaving the bar with the pointer closes the dropdown. Both the trigger and the panel
         live inside this element, so crossing from one into the other never fires it. */
      onPointerLeave={() => {
        openedByPointer.current = false;
        setIsCategoriesOpen(false);
      }}
      /* And so does tabbing out of it. `relatedTarget` is what is about to receive focus; a
         null one (a click on the page background, switching windows) counts as gone too. */
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsCategoriesOpen(false);
        }
      }}
    >
      {/*
        The announcement strip lives inside this fixed header rather than above it, because a
        bar that scrolls away while the navigation stays put leaves the navigation sitting on
        whatever was underneath. One fixed block, one height for `SiteChrome` to clear.

        It folds away on scroll — height to zero rather than `display: none`, so it animates
        with the rest of the bar — and `aria-hidden` goes with it so its two links leave the
        tab order at the same moment they leave the screen.
      */}
      <div
        aria-hidden={isScrolled}
        className={cn(
          'overflow-hidden transition-[height] duration-300 motion-reduce:transition-none',
          isScrolled ? 'h-0' : 'h-10'
        )}
      >
        <AnnouncementBar />
      </div>

      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8">
        {/* Desktop */}
        <div
          className={cn(
            'hidden items-center justify-between transition-[height] duration-300 lg:flex',
            isScrolled ? 'h-[72px]' : 'h-24'
          )}
        >
          <Link
            href="/"
            className="shrink-0 rounded-sm focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-4 focus-visible:outline-none"
          >
            <Image
              src={siteCopy.nav.logo.src}
              alt={siteCopy.nav.logo.alt}
              width={140}
              height={60}
              className={cn(
                'w-auto object-contain transition-[height] duration-300',
                isScrolled ? 'h-9' : 'h-12 xl:h-14'
              )}
              priority
            />
          </Link>

          <ul aria-label="Primary" className="flex items-center gap-x-6 xl:gap-x-8">
            {/* Home, then the categories, then the rest: the shop's own goods sit as early in
                the menu as the homepage link, which is the point of the whole change. */}
            <li>
              <Link
                href={homeLink.href}
                aria-current={isCurrent(pathname, homeLink.href) ? 'page' : undefined}
                className={linkClasses(isCurrent(pathname, homeLink.href))}
              >
                {homeLink.label}
                {underline(isCurrent(pathname, homeLink.href))}
              </Link>
            </li>

            <li>
              <button
                ref={categoriesTriggerRef}
                type="button"
                aria-expanded={isCategoriesOpen}
                aria-controls={CATEGORIES_PANEL_ID}
                onClick={() => {
                  // Read the ref before the updater, never inside it: a functional update is
                  // run by React during the render that follows, by which time the assignment
                  // below has already happened and the menu toggles itself shut again.
                  const openedByTheHoverThatPrecededThisClick = openedByPointer.current;
                  openedByPointer.current = false;
                  setIsCategoriesOpen(open =>
                    openedByTheHoverThatPrecededThisClick ? true : !open
                  );
                }}
                /* Hover opens it as well, because that is what a shop menu does — but the
                   click is the real control, so a pointer that cannot hover loses nothing. */
                onPointerEnter={() => {
                  openedByPointer.current = !isCategoriesOpen;
                  setIsCategoriesOpen(true);
                }}
                className={cn('gap-1', linkClasses(isCategoriesOpen))}
              >
                {CATEGORIES_LABEL}
                <ChevronDown
                  aria-hidden="true"
                  className={cn(
                    'h-3 w-3 transition-transform duration-300',
                    isCategoriesOpen && 'rotate-180'
                  )}
                />
                {underline(isCategoriesOpen)}
              </button>
            </li>

            {navLinks.slice(1).map(link => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  aria-current={isCurrent(pathname, link.href) ? 'page' : undefined}
                  className={linkClasses(isCurrent(pathname, link.href))}
                >
                  {link.label}
                  {underline(isCurrent(pathname, link.href))}
                </Link>
              </li>
            ))}
          </ul>

          {/* The right end. One affordance, because one of the three in the mock-up is real:
              see the comment in `nav-search.tsx` for why the heart and the bag are not here. */}
          <NavSearch className="shrink-0" />
        </div>

        {/* Mobile bar: logo centred, menu button right, as before. */}
        <div
          className={cn(
            'flex items-center justify-between transition-[height] duration-300 lg:hidden',
            isScrolled ? 'h-[72px]' : 'h-24'
          )}
        >
          <div className="absolute left-1/2 -translate-x-1/2">
            <Link href="/" className="block">
              <Image
                src={siteCopy.nav.logo.src}
                alt={siteCopy.nav.logo.alt}
                width={140}
                height={60}
                className={cn(
                  'w-auto object-contain transition-[height] duration-300',
                  isScrolled ? 'h-8' : 'h-10 sm:h-12'
                )}
                priority
              />
            </Link>
          </div>

          <button
            aria-label="Open menu"
            aria-expanded={isMobileMenuOpen}
            className="ml-auto flex min-h-[48px] min-w-[48px] items-center justify-center rounded-lg p-3 transition hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:outline-none"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu size={24} />
          </button>
        </div>
      </div>

      {/*
        The desktop mega-menu.

        Mounted only while open, so its six links are never in the tab order of a closed menu —
        the thing `visibility: hidden` would otherwise have to be trusted to do. It spans the
        bar rather than hanging off the trigger: anchored to a button this far right, a panel
        wide enough for six picture-and-name cards would run off the edge of a 768px screen,
        and a shop's menu is the one place a full-width panel is the convention anyway.
      */}
      {isCategoriesOpen && categories.length > 0 && (
        <div
          id={CATEGORIES_PANEL_ID}
          className="animate-in fade-in-0 slide-in-from-top-1 absolute inset-x-0 top-full hidden border-t border-gray-100 bg-white shadow-[0_24px_40px_-32px_rgba(0,0,0,0.5)] duration-200 motion-reduce:animate-none lg:block"
        >
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <NavCategoryCards
              categories={categories}
              onNavigate={() => setIsCategoriesOpen(false)}
            />
            <div className="mt-4 border-t border-gray-100 pt-4 text-center">
              {/* The existing "All Products" link, repeated as the panel's way out: the menu
                  should not be a dead end for someone who wants the whole catalogue. The label
                  is `siteCopy`'s own, not a second wording of the same idea. */}
              <Link
                href={productsLink.href}
                onClick={() => setIsCategoriesOpen(false)}
                className="inline-flex items-center rounded-sm font-sans text-xs font-medium tracking-[0.18em] text-gray-500 uppercase transition-colors hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-4 focus-visible:outline-none"
              >
                {productsLink.label}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/*
        The mobile drawer, still always mounted so that it can slide rather than appear.

        `aria-hidden` while closed is what keeps its second copy of every link out of the
        accessibility tree; the `invisible` class is what keeps them out of the tab order. Both
        are needed, because each does only one of those two things.
      */}
      <div
        className={cn(
          'fixed inset-0 z-50 flex overflow-hidden transition-opacity duration-300',
          isMobileMenuOpen ? 'visible opacity-100' : 'invisible opacity-0'
        )}
        aria-hidden={!isMobileMenuOpen}
      >
        <div
          className={cn(
            'h-full w-full transform bg-white shadow-lg transition-transform duration-500 ease-in-out',
            isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          )}
        >
          <div className="flex h-24 items-center justify-end px-6">
            <button
              aria-label="Close menu"
              onClick={closeMenu}
              className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-lg p-3 transition hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:outline-none"
            >
              <X size={28} />
            </button>
          </div>

          <ul
            aria-label="Menu"
            className="flex max-h-[calc(100dvh_-_6rem)] flex-col gap-1 overflow-y-auto px-8 pb-12 sm:px-10"
          >
            <li>
              <Link
                href={homeLink.href}
                onClick={closeMenu}
                aria-current={isCurrent(pathname, homeLink.href) ? 'page' : undefined}
                className={drawerLinkClasses}
              >
                {homeLink.label}
              </Link>
            </li>

            {/* Categories as a disclosure, not a link: there is no "all categories" page, and a
                group that opens in place keeps the six names one tap from the menu, not two. */}
            {categories.length > 0 && (
              <li>
                <button
                  type="button"
                  aria-expanded={isDrawerCategoriesOpen}
                  aria-controls={CATEGORIES_DRAWER_ID}
                  onClick={() => setIsDrawerCategoriesOpen(open => !open)}
                  className={cn(drawerLinkClasses, 'w-full justify-between')}
                >
                  {CATEGORIES_LABEL}
                  <ChevronDown
                    aria-hidden="true"
                    className={cn(
                      'h-5 w-5 text-gray-400 transition-transform duration-300',
                      isDrawerCategoriesOpen && 'rotate-180'
                    )}
                  />
                </button>
                {isDrawerCategoriesOpen && (
                  <div id={CATEGORIES_DRAWER_ID}>
                    <NavCategoryList categories={categories} onNavigate={closeMenu} />
                  </div>
                )}
              </li>
            )}

            {navLinks.slice(1).map(link => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  onClick={closeMenu}
                  aria-current={isCurrent(pathname, link.href) ? 'page' : undefined}
                  className={drawerLinkClasses}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
