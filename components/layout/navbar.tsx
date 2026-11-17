'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { siteCopy } from '@/lib/content/site-copy';

/**
 * Labels and destinations come from the nav copy (`siteCopy.nav.items`). Home is dropped:
 * the wordmark is the way home. The one exception is Shop: the design brief names the shop
 * link "Shop", where the old copy says "All Products", so that single label is set here.
 */
const LABEL_OVERRIDE: Record<string, string> = { '/products': 'Shop' };

const PRIMARY_LINKS = siteCopy.nav.items
  .filter(item => item.href !== '/')
  .map(item => ({ label: LABEL_OVERRIDE[item.href] ?? item.label, href: item.href }));

/** Scroll distance after which the nav condenses (shorter row, one soft lift). */
const CONDENSE_AFTER = 32;

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The nav's resting row height, as one variable. The row, the spacer and the dialog's top
 * row all read it, so they cannot drift apart. The condensed row has its own.
 */
const NAV_HEIGHT_VARS =
  '[--nav-h:64px] md:[--nav-h:80px] [--nav-h-condensed:56px] md:[--nav-h-condensed:64px]';

/**
 * The wordmark, used in the header and again in the menu. The type scale has nothing between
 * the 11px eyebrow and the 28px display-3, so the 22/26px size is arbitrary here, once. The
 * letter-spacing is not: `--tracking-wordmark` is the same token the hero wordmark uses, so
 * the brand name is set open by the same amount wherever it appears.
 */
const WORDMARK =
  'font-display text-[22px] uppercase tracking-(--tracking-wordmark) text-ink md:text-[26px] ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold';

/** True for the link's own page and anything nested beneath it. */
function isCurrent(pathname: string | null, href: string) {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The navigation, on every page, and identical on every page: a solid paper bar with ink
 * type. Over the home hero it simply covers the top of the frame; the hero still starts at
 * the top of the viewport and fills it.
 *
 * Deliberately deferred: a transparent state over the hero. The current hero photograph is a
 * collage with pale walls and white seams in its top band, where paper type reaches only
 * about 2.1:1 (11px type needs 4.5:1), so a transparent nav would need a darkening strip
 * across the picture. That is compensating for an asset that is due to be replaced. Revisit
 * the transparent-over-hero state when the new hero asset lands; this is tracked as an owner
 * to-do.
 *
 * Scrolling condenses the row and adds the one soft shadow the design allows anywhere.
 *
 * The header is fixed, so it takes no space in the flow. On every route but home a spacer
 * as tall as the resting row holds the page clear of it; on home there is none, which is
 * what keeps the hero at the top of the viewport. The spacer lives here rather than as
 * padding in the layout so that no page needs its own top offset.
 *
 * Under 768px the links move into a full-screen dialog. It is rendered only while open, so
 * nothing sits off-canvas to widen the page and no hidden links stay in the tab order. Layout
 * between the two arrangements is CSS breakpoints; script is used only for state that has
 * to exist (open, scrolled).
 *
 * Motion is CSS and sits behind the global reduced-motion rule. The nav is above the fold,
 * so `Reveal` (scroll-triggered) is deliberately not used.
 */
export default function NavBar() {
  const pathname = usePathname();
  const isHome = pathname === '/';

  const [condensed, setCondensed] = useState(false);
  const [open, setOpen] = useState(false);

  const toggleRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Condense on scroll. Read once on mount too, so a reload part-way down starts condensed.
  useEffect(() => {
    const update = () => setCondensed(window.scrollY > CONDENSE_AFTER);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  const closeMenu = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) toggleRef.current?.focus();
  }, []);

  // While the menu is open: lock body scroll (restoring whatever was there), take focus,
  // close on Escape and keep Tab inside the dialog.
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu(true);
        return;
      }
      if (event.key !== 'Tab') return;

      const dialog = dialogRef.current;
      if (!dialog) return;
      const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (!dialog.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    // A menu left open while the window grows past the breakpoint would trap focus in a
    // panel that CSS has hidden. Close it instead.
    let media: MediaQueryList | undefined;
    const onGrow = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(false);
    };
    if (typeof window.matchMedia === 'function') {
      media = window.matchMedia('(min-width: 768px)');
      media.addEventListener('change', onGrow);
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      media?.removeEventListener('change', onGrow);
    };
  }, [open, closeMenu]);

  // Navigating elsewhere always closes the menu. Adjusting state while rendering, keyed on
  // the path, rather than in an effect, so the stale menu never paints on the new page.
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setOpen(false);
  }

  const linkClasses = (href: string) =>
    cn(
      'relative inline-flex items-center py-3 font-ui text-eyebrow font-medium uppercase tracking-[0.18em] text-ink',
      'transition-colors duration-300',
      'after:absolute after:inset-x-0 after:bottom-2 after:h-px after:origin-left after:bg-gold',
      'after:transition-transform after:duration-300',
      isCurrent(pathname, href) ? 'after:scale-x-100' : 'after:scale-x-0',
      'hover:after:scale-x-100 focus-visible:after:scale-x-100',
      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold'
    );

  return (
    <>
      <header
        data-condensed={condensed}
        className={cn(
          'fixed inset-x-0 top-0 z-50 bg-paper transition duration-300',
          NAV_HEIGHT_VARS,
          condensed && 'shadow-[0_1px_16px_rgba(20,18,16,0.08)]'
        )}
      >
        <div
          data-nav-row
          className={cn(
            'mx-auto flex w-full max-w-[var(--content-max)] items-center justify-between px-[var(--gutter)]',
            'transition-[height] duration-300',
            condensed ? 'h-(--nav-h-condensed)' : 'h-(--nav-h)'
          )}
        >
          <Link href="/" className={WORDMARK}>
            {siteCopy.home.hero.wordmark}
          </Link>

          <nav aria-label="Primary" className="hidden md:block">
            <ul className="flex items-center gap-10">
              {PRIMARY_LINKS.map(link => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={isCurrent(pathname, link.href) ? 'page' : undefined}
                    className={linkClasses(link.href)}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <button
            ref={toggleRef}
            type="button"
            aria-label="Open menu"
            aria-expanded={open}
            aria-haspopup="dialog"
            aria-controls="site-menu"
            onClick={() => setOpen(true)}
            className="-mr-3 flex h-12 w-12 items-center justify-center text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold md:hidden"
          >
            <Menu size={24} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Holds the page clear of the fixed header on every route that has no hero under it.
          As tall as the resting nav row above, from the same variable. */}
      {!isHome && (
        <div
          data-nav-spacer
          aria-hidden="true"
          className={cn(NAV_HEIGHT_VARS, 'h-(--nav-h)')}
        />
      )}

      {open && (
        <div
          id="site-menu"
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          className={cn(
            'fixed inset-0 z-[60] flex animate-in flex-col bg-paper duration-300 fade-in md:hidden',
            NAV_HEIGHT_VARS
          )}
        >
          <div className="mx-auto flex h-(--nav-h) w-full shrink-0 items-center justify-between px-[var(--gutter)]">
            <Link href="/" onClick={() => closeMenu(false)} className={WORDMARK}>
              {siteCopy.home.hero.wordmark}
            </Link>
            <button
              ref={closeRef}
              type="button"
              aria-label="Close menu"
              onClick={() => closeMenu(true)}
              className="-mr-3 flex h-12 w-12 items-center justify-center text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              <X size={24} strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>

          <nav
            aria-label="Mobile"
            className="flex flex-1 flex-col justify-center overflow-y-auto px-[var(--gutter)] pb-16"
          >
            <ul className="border-t border-gold">
              {PRIMARY_LINKS.map((link, index) => (
                <li
                  key={link.href}
                  className="reveal-text border-b border-gold"
                  style={{ '--reveal-delay': `calc(var(--stagger) * ${index + 1})` } as CSSProperties}
                >
                  <Link
                    href={link.href}
                    aria-current={isCurrent(pathname, link.href) ? 'page' : undefined}
                    onClick={() => closeMenu(false)}
                    className="block py-5 font-display text-display-3 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-gold"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </>
  );
}
