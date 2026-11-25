'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CONTAINER, HEADING, HEADING_GAP } from '@/components/sections/section-shell';
import { useMedia } from '@/lib/hooks/useMedia';
import { cn } from '@/lib/utils';

export interface SpotlightClip {
  /** Stable across renders; the file's own name, so a clip keeps its identity if the list is reordered. */
  id: string;
  src: string;
  /**
   * A still to paint before the clip's first frame decodes. Every entry is `undefined` today
   * because no poster assets exist — see the note on `SPOTLIGHT_FOOTAGE`. The prop is here so
   * that adding one is a one-line change rather than a markup change.
   */
  poster?: string;
}

/**
 * How many clips the band will draw.
 *
 * The owner asked for the *option* of six, which is a capacity, not a quota: the band renders
 * exactly the clips that exist and six is where it stops. Four exist (below), so four are
 * drawn, and the fifth and sixth are two lines in the array away — no layout, scrolling or
 * playback code has to change to take them, which is the point of the number being here.
 */
export const SPOTLIGHT_CAPACITY = 6;

/** The bucket every storefront video already lives in; the hero's clip is the first of them. */
const FOOTAGE_BUCKET =
  'https://duwwgyobnpuqsqdromzj.supabase.co/storage/v1/object/public/product-images';

/**
 * The real footage, and only the real footage.
 *
 * These four `.webm` files are what the shop actually has: `public/` contains no video at all,
 * and `MediaAsset` holds no row with `kind = 'VIDEO'`, so there is nowhere else to look and
 * nothing to pad the list with. `sp04`/`sp05`/`sp06` were probed against the bucket and answer
 * 400 — they do not exist, and inventing them would ship four working clips and two broken
 * players. To add the fifth and sixth, upload them to the bucket and append them here.
 */
export const SPOTLIGHT_FOOTAGE: SpotlightClip[] = [
  { id: 'bg_video', src: `${FOOTAGE_BUCKET}/bg_video.webm` },
  { id: 'sp01', src: `${FOOTAGE_BUCKET}/sp01.webm` },
  { id: 'sp02', src: `${FOOTAGE_BUCKET}/sp02.webm` },
  { id: 'sp03', src: `${FOOTAGE_BUCKET}/sp03.webm` },
];

/** How much of the strip one press of a control moves: most of a screenful, never all of it. */
const PAGE_FRACTION = 0.8;

/** A clip counts as the one in view once this much of it is inside the scroller. */
const IN_VIEW_RATIO = 0.6;

interface Edges {
  /** False when every clip already fits, which is the case where controls are noise. */
  scrollable: boolean;
  atStart: boolean;
  atEnd: boolean;
}

const AT_REST: Edges = { scrollable: false, atStart: true, atEnd: true };

/**
 * Where the scroller is, in the only three terms the controls care about.
 *
 * The 1px tolerance is not defensive padding: a snapped scroll position is fractional at most
 * zoom levels and on any display with a non-integer device pixel ratio, so `scrollLeft +
 * clientWidth === scrollWidth` is false at the right-hand end about as often as it is true,
 * and the "next" control would stay enabled with nowhere to go.
 */
export function readEdges(el: {
  scrollLeft: number;
  clientWidth: number;
  scrollWidth: number;
}): Edges {
  const slack = el.scrollWidth - el.clientWidth;
  if (slack <= 1) return AT_REST;
  return {
    scrollable: true,
    atStart: el.scrollLeft <= 1,
    atEnd: el.scrollLeft >= slack - 1,
  };
}

const SpotlightCarousel = () => {
  const clips = SPOTLIGHT_FOOTAGE.slice(0, SPOTLIGHT_CAPACITY);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef(new Map<string, HTMLVideoElement>());
  const [edges, setEdges] = useState<Edges>(AT_REST);

  /*
   * Two sources of "which clip is playing", resolved in one place.
   *
   * A pointer is the explicit signal and wins. `inViewId` is what covers touch, where no
   * pointer ever enters anything: without it a phone visitor would see six still frames and
   * conclude the band was broken. Collapsing both into a single id is also what enforces the
   * one-at-a-time rule below — there is no state in which two clips are the active one.
   */
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [inViewId, setInViewId] = useState<string | null>(null);
  const activeId = hoveredId ?? inViewId;

  const reducedMotion = useMedia('(prefers-reduced-motion: reduce)');

  const syncEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (el) setEdges(readEdges(el));
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    syncEdges();
    el.addEventListener('scroll', syncEdges, { passive: true });
    window.addEventListener('resize', syncEdges);
    return () => {
      el.removeEventListener('scroll', syncEdges);
      window.removeEventListener('resize', syncEdges);
    };
  }, [syncEdges]);

  /*
   * Which clip the viewer has actually scrolled to. The scroller is its own `root`, so the
   * ratios are "how much of this clip is inside the strip", not "inside the window" — the
   * distinction matters because the whole strip can be on screen while four of six clips are
   * not. The highest ratio wins so that a 3-up desktop layout still plays one clip, not three.
   */
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const ratios = new Map<string, number>();
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.clipId;
          if (id) ratios.set(id, entry.intersectionRatio);
        }
        // Strictly greater, so a tie — which is the ordinary case, every clip in a 4-up row
        // being fully visible at once — goes to the first in reading order rather than the
        // last one the observer happened to report.
        let best: string | null = null;
        let bestRatio = 0;
        for (const [id, ratio] of ratios) {
          if (ratio >= IN_VIEW_RATIO && ratio > bestRatio) {
            best = id;
            bestRatio = ratio;
          }
        }
        setInViewId(best);
      },
      { root: el, threshold: [0, 0.25, IN_VIEW_RATIO, 0.9, 1] }
    );

    for (const item of el.querySelectorAll('[data-clip-id]')) observer.observe(item);
    return () => observer.disconnect();
  }, []);

  /*
   * Playback, driven entirely by `activeId`.
   *
   * Nothing here autoplays. Six 9:16 clips playing at once is six concurrent video decodes and
   * six open connections for a band most visitors scroll past, so at most one is ever running,
   * and under `prefers-reduced-motion` none is — a looping clip is motion the visitor has
   * asked not to be shown, and `preload="metadata"` still paints a first frame for them.
   *
   * `play()` returns a promise that rejects whenever the browser declines (a power-saving
   * mode, an unsatisfied gesture requirement), and an unhandled rejection there is a console
   * error on a decorative video. Declining is a fine outcome: the still frame stays.
   */
  useEffect(() => {
    for (const [id, video] of videoRefs.current) {
      const shouldPlay = !reducedMotion && id === activeId;
      if (shouldPlay) {
        void video.play?.()?.catch(() => {});
      } else {
        video.pause?.();
      }
    }
  }, [activeId, reducedMotion]);

  const page = (direction: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * PAGE_FRACTION, behavior: 'smooth' });
  };

  // No footage at all would be a heading over an empty strip, which reads as a broken section.
  if (clips.length === 0) return null;

  const controlClass =
    'absolute top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-2 text-gray-800 shadow-lg transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:pointer-events-none disabled:opacity-0 sm:p-3';

  return (
    <section className="bg-white py-6">
      <div className={CONTAINER}>
        <h2 className={cn(HEADING, 'text-center', HEADING_GAP)}>Our Spotlight</h2>

        {/* `min-w-0` is the fix for a bug this repo has already paid for once: a flex child
            defaults to `min-width: auto`, which refuses to shrink below its content, and a
            scroller's content is as wide as all six clips. The wrapper is a block child today,
            but it is the element a future layout would make a column of — so the guard lives
            on it now rather than after the next 69px-wide page. */}
        <div className="relative min-w-0">
          {/* `hidden` as the attribute rather than the class: when the clips all fit there is
              nothing to page through, and the attribute takes the controls out of the
              accessibility tree too instead of only off the screen. */}
          <button
            type="button"
            onClick={() => page(-1)}
            disabled={edges.atStart}
            hidden={!edges.scrollable}
            aria-label="Show previous spotlight videos"
            className={cn(controlClass, 'left-1 sm:left-2')}
          >
            <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => page(1)}
            disabled={edges.atEnd}
            hidden={!edges.scrollable}
            aria-label="Show next spotlight videos"
            className={cn(controlClass, 'right-1 sm:right-2')}
          >
            <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
          </button>

          {/*
           * The scroll container is the element with `overflow-x-auto`, so `snap-x
           * snap-mandatory` belongs here and `snap-center` on the clips inside it. The basis
           * calculations are "fit n across, minus the gaps between them" — 2 up on a phone,
           * 3 at md, 4 at xl — which is what makes six clips overflow rather than squeeze.
           */}
          <div
            ref={scrollerRef}
            role="group"
            aria-label="Spotlight videos"
            tabIndex={0}
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-4 scrollbar-hide focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 md:gap-6"
          >
            {clips.map((clip, index) => (
              <div
                key={clip.id}
                data-clip-id={clip.id}
                onPointerEnter={() => setHoveredId(clip.id)}
                onPointerLeave={() => setHoveredId(current => (current === clip.id ? null : current))}
                className="shrink-0 grow-0 basis-[calc((100%-1rem)/2)] snap-center overflow-hidden rounded-xl shadow-md md:basis-[calc((100%-3rem)/3)] xl:basis-[calc((100%-4.5rem)/4)]"
              >
                <video
                  ref={node => {
                    if (node) videoRefs.current.set(clip.id, node);
                    else videoRefs.current.delete(clip.id);
                  }}
                  src={clip.src}
                  poster={clip.poster}
                  muted
                  loop
                  playsInline
                  /* Enough of the file to paint a first frame and know its dimensions, and no
                     more. `none` would leave six grey rectangles until something was hovered. */
                  preload="metadata"
                  /* Keyboard parity with the pointer: focus is the only way a keyboard user
                     can say "this one", and it starts and stops the same single clip. */
                  tabIndex={0}
                  onFocus={() => setHoveredId(clip.id)}
                  onBlur={() => setHoveredId(current => (current === clip.id ? null : current))}
                  aria-label={`Divyafal spotlight film ${index + 1} of ${clips.length}`}
                  className="aspect-9/16 w-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SpotlightCarousel;
