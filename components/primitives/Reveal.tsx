'use client';

import { useEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';

/**
 * Wraps a block in the spec's text fade-up (24px, 60ms stagger via `delay`).
 *
 * The block renders readable and stays readable. Only once this component has run on
 * the client and confirmed that motion is allowed does it arm the block — set
 * `data-reveal="armed"`, which hides it — and hand it to an IntersectionObserver that
 * plays the reveal when the block scrolls into view. Server HTML, a client with JS
 * disabled, reduced motion, a missing IntersectionObserver and an observer that never
 * calls back all leave the content visible, never permanently invisible. Review Focus #4.
 *
 * `data-reveal` is set from the effect rather than rendered, so React never owns the
 * attribute and no state change is needed to animate.
 */
export default function Reveal({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const prefersReducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Reduced motion, or an environment with no IntersectionObserver: leave the
    // block exactly as rendered. Nothing to arm, nothing to play.
    if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') return;

    node.dataset.reveal = 'armed';

    // An IntersectionObserver always calls back once soon after observe(). If this
    // one never does, it is broken or stubbed, and an armed block would stay
    // invisible for good — so reveal it instead.
    let answered = false;
    const failsafe = window.setTimeout(() => {
      if (!answered) node.dataset.reveal = 'in';
    }, 600);

    const observer = new IntersectionObserver(
      (entries) => {
        answered = true;
        window.clearTimeout(failsafe);
        if (entries.some((entry) => entry.isIntersecting)) {
          node.dataset.reveal = 'in';
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 }
    );

    observer.observe(node);

    return () => {
      window.clearTimeout(failsafe);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={ref} style={{ '--reveal-delay': `${delay}ms` } as CSSProperties}>
      {children}
    </div>
  );
}
