'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { useMedia } from '@/lib/hooks/useMedia';
import { cn } from '@/lib/utils';

/**
 * The hero's cross-fading plate.
 *
 * Split out of `hero.tsx` because the hero is now two separate decisions — *what* is shown
 * (which photographs, what sits over them) and *how* it moves — and only the second has any
 * state, any timers and anything worth testing. Keeping them in one file would have meant a
 * component whose interesting behaviour was buried under markup.
 */

export interface HeroSlide {
  /** A path under `/public`. */
  src: string;
  /** Describes the photograph. Not a caption, and never marketing copy. */
  alt: string;
  /**
   * The CSS `object-position` for this plate.
   *
   * Per slide, not per component, because these are documentary photographs of a real show
   * rather than art-directed plates: in some of them the lighting truss fills the top quarter
   * of the frame and in others the models stand near the top of it. One shared focal point
   * would decapitate half the set at the widest ratio.
   */
  position: string;
}

/** How long a plate holds before the next one begins to arrive. */
export const DEFAULT_INTERVAL_MS = 6500;

/**
 * The next index, wrapping.
 *
 * Pulled out as a function so the wrap is something a test can assert rather than something
 * you have to run a timer to observe. `step` is signed, and the modulo is written to survive a
 * negative one — `-1 % 4` is `-1` in JavaScript, not `3`, which is the classic way a carousel
 * breaks the first time someone presses "previous" on the first slide.
 */
export function advanceIndex(current: number, total: number, step = 1): number {
  if (total <= 0) return 0;
  return (((current + step) % total) + total) % total;
}

export default function HeroSlideshow({
  slides,
  label,
  intervalMs = DEFAULT_INTERVAL_MS,
  className,
  sizes = '100vw',
  children,
}: {
  slides: HeroSlide[];
  /** The accessible name of the carousel region. */
  label: string;
  intervalMs?: number;
  className?: string;
  sizes?: string;
  /** Anything that sits over the photographs — the wordmark, the scrim. */
  children?: React.ReactNode;
}) {
  const [active, setActive] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  /**
   * `prefers-reduced-motion` stops the auto-advance outright rather than merely shortening the
   * fade. A carousel that changes under you without being asked is exactly the kind of motion
   * the setting exists to refuse, and a visitor who has set it can still move through the
   * plates with the dots. The cross-fade itself is disabled in CSS (`motion-reduce:`) so that
   * it is off on the very first frame, before this hook has run its effect.
   */
  const prefersReducedMotion = useMedia('(prefers-reduced-motion: reduce)');

  const total = slides.length;

  useEffect(() => {
    if (prefersReducedMotion || isPaused || total < 2) return;
    const id = window.setInterval(() => {
      setActive(index => advanceIndex(index, total));
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [prefersReducedMotion, isPaused, total, intervalMs]);

  /**
   * The index is clamped on the way out rather than corrected in state.
   *
   * The slides are a prop, so a shorter list is a legal change, and an `active` left pointing
   * past the end of it renders a hero with no visible plate at all. Deriving the displayed
   * index means there is no render in which that is true — an effect that reset the state
   * would paint the empty hero once before fixing it.
   */
  const current = active < total ? active : 0;

  const pause = useCallback(() => setIsPaused(true), []);
  const resume = useCallback(() => setIsPaused(false), []);

  if (total === 0) return null;

  return (
    <div
      className={cn('relative h-full w-full overflow-hidden bg-gray-100', className)}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      onPointerEnter={pause}
      onPointerLeave={resume}
      /* React's onFocus/onBlur are focusin/focusout, so they fire for the dots inside. Pausing
         on focus matters more than pausing on hover: a keyboard visitor who has tabbed to the
         dots is reading them, and having the picture change underneath is disorienting. */
      onFocus={pause}
      onBlur={resume}
    >
      {slides.map((slide, index) => {
        const isActive = index === current;
        return (
          <div
            key={slide.src}
            aria-hidden={!isActive}
            className={cn(
              'absolute inset-0 transition-opacity duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
              isActive ? 'opacity-100' : 'opacity-0'
            )}
          >
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              /* Only the first plate is `priority`. All four are in the viewport from the
                 first frame, so marking them all would make the browser contend four
                 full-bleed photographs against each other and push out the one the visitor
                 actually sees — the LCP element is the first slide and nothing else. */
              priority={index === 0}
              sizes={sizes}
              style={{ objectPosition: slide.position }}
              className="object-cover"
            />
          </div>
        );
      })}

      {children}

      {total > 1 && (
        /*
          Dots only, no arrows. The hero advances on its own and the shop is not asking anyone
          to page through an offer carousel; two chevrons floating over couture photography
          would be the loudest thing on the page. The dots are real buttons with real names,
          so there is still a manual control for anyone who wants one — including the visitor
          whose reduced-motion setting has switched the auto-advance off entirely.
        */
        <div className="absolute inset-x-0 bottom-5 z-10 flex items-center justify-center gap-2.5 md:bottom-8">
          {slides.map((slide, index) => (
            <button
              key={slide.src}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Show slide ${index + 1} of ${total}`}
              aria-current={index === current ? 'true' : undefined}
              className={cn(
                'h-1.5 rounded-full transition-all duration-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/40 focus-visible:outline-none',
                index === current ? 'w-8 bg-white' : 'w-1.5 bg-white/55 hover:bg-white/85'
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
