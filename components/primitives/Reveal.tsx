'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import type { CSSProperties, ElementType, ReactNode, Ref } from 'react';

/**
 * Runs before paint on the client and not at all on the server, so arming a block
 * never costs a visible frame and never warns during SSR.
 */
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** Vertically within the viewport — any part of it, by any amount. */
function isInViewport(node: Element) {
  const rect = node.getBoundingClientRect();
  return rect.top < window.innerHeight && rect.bottom > 0;
}

/** True when the page cannot be scrolled, so an off-screen block can never be reached. */
function pageCannotScroll() {
  const doc = document.documentElement;
  return doc.scrollHeight <= window.innerHeight + 1;
}

/**
 * Wraps a block in the spec's text fade-up (24px, 60ms stagger via `delay`) and plays it
 * when the block scrolls into view.
 *
 * **The block is never hidden unless hiding it is invisible to the viewer.** It renders
 * readable and only gets armed (`data-reveal="armed"`, the one rule that sets
 * `opacity: 0`) when all of the following hold: this component has run on the client,
 * motion is allowed, an IntersectionObserver exists, and the block is *not already in
 * the viewport*. So server HTML, a client with JS disabled, reduced motion and a missing
 * observer all leave the content visible, and a block the viewer can already see is left
 * exactly as painted rather than blinked to transparent and faded back in. Review Focus #4.
 *
 * Three nets keep an armed block from being stranded at `opacity: 0`:
 *  - `threshold: 0` with no negative `rootMargin`, so any pixel of visibility reveals it;
 *  - a first callback reporting no intersection on a page that cannot scroll reveals it,
 *    since scrolling can never bring it into view;
 *  - a 600ms timer reveals it if the observer never calls back at all.
 *
 * Above-the-fold load motion is deliberately *not* this component's job — an animation
 * applied after first paint must blink. Use the CSS-only `reveal-text` / `reveal-image`
 * utilities for that; they are styled from the first frame and cannot flash.
 *
 * `data-reveal` is set from the effect rather than rendered, so React never owns the
 * attribute and no state change is needed to animate.
 */
export default function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode;
  /** Stagger in ms; the spec's step is 60. */
  delay?: number;
  /** Placement and type live on the wrapper itself — e.g. `col-start-2 col-end-8`. */
  className?: string;
  as?: ElementType;
}) {
  const ref = useRef<HTMLElement>(null);

  useIsomorphicLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;

    const prefersReducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Reduced motion, no IntersectionObserver, or a block the viewer can already see:
    // leave it exactly as rendered. Nothing to arm, nothing to play.
    if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') return;
    if (isInViewport(node)) return;

    node.dataset.reveal = 'armed';

    const reveal = () => {
      node.dataset.reveal = 'in';
    };

    // An IntersectionObserver always calls back once soon after observe(). If this one
    // never does, it is broken or stubbed, and an armed block would stay invisible for
    // good — so reveal it instead.
    let answered = false;
    const failsafe = window.setTimeout(() => {
      if (!answered) reveal();
    }, 600);

    const observer = new IntersectionObserver(
      (entries) => {
        answered = true;
        window.clearTimeout(failsafe);
        // threshold 0 and no negative margin: intersecting means genuinely on screen.
        if (entries.some((entry) => entry.isIntersecting) || pageCannotScroll()) {
          reveal();
          observer.disconnect();
        }
      },
      { rootMargin: '0px', threshold: 0 }
    );

    observer.observe(node);

    return () => {
      window.clearTimeout(failsafe);
      observer.disconnect();
    };
  }, []);

  return (
    <Tag
      ref={ref as Ref<HTMLElement>}
      className={className}
      style={{ '--reveal-delay': `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}
