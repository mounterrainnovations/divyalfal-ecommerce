'use client';

import Image from 'next/image';
import DisplayHeading from '@/components/primitives/DisplayHeading';
import { siteCopy } from '@/lib/content/site-copy';
import { useMedia } from '@/lib/hooks/useMedia';
import { cn } from '@/lib/utils';

const { wordmark, desktopImage, mobileVideo } = siteCopy.home.hero;

/**
 * Movement 1 — the full-bleed opening frame.
 *
 * Full height, full width, no inset: the pre-revamp hero floated its photograph inside a
 * `p-6 … rounded-md` card, which read as a component on a page rather than as the page.
 * `100svh` rather than `100vh` so the mobile browser chrome cannot push the frame past the
 * fold it is meant to fill.
 *
 * The composition is one word on the editorial grid's columns 2–7. Nothing else: the only
 * hero copy that exists in the repo is the wordmark (`siteCopy.home.hero` has exactly three
 * keys), and a tagline or est. mark would be invented.
 *
 * The word is centred vertically rather than set on the baseline, and that is forced, not
 * preferred. `mock_hero_desktop_2.webp` is a 1100×550 composite with its own headline
 * ("Grace in Every Look / A Story in Every Thread") burned into the pixels, starting at
 * 74.5% of the image height. Because the image is wider than any plausible hero frame,
 * `object-cover` always scales it by height, so that burned-in headline always lands in the
 * bottom quarter of the frame at every viewport. A bottom-left wordmark collides with it
 * outright. Centring clears it by the whole middle band at every ratio, and the middle band
 * is also the one place the fixed paper navbar cannot reach: the bar is solid now, not the
 * transparent overlay this comment used to describe, and it occupies the top 64–80px.
 * Replace that asset with a clean photograph and this should move back down to the baseline.
 *
 * Legibility comes from a single flat ink wash — not a gradient (forbidden), not a black
 * scrim — and its opacity is per medium, because the two media are not equally bright:
 *
 *   - **Desktop still, 35%.** The spec's figure, and it holds: on `mock_hero_desktop_2.webp`
 *     at 1280, 1440 and 1920 wide the brightest pixel behind the wordmark still clears 3:1
 *     against paper (large-text AA), and the photograph keeps a ~6.9:1 mean.
 *   - **Mobile / portrait-tablet video, 50%.** Task 13 measured what nobody had: the same
 *     35% over `bg_video.webm`, sampled at 11 frames across its 14.9s, at 390×844 and again
 *     at portrait tablet 768×1024 where `object-cover` crops it differently. Measured under
 *     the glyph strokes rather than over the wordmark's bounding box (a bright pixel in a
 *     letter gap is behind no type), the worst stroke pixel sat at **2.15:1** at 390 and
 *     **2.28:1** at 768, and in one frame **18%** of the wordmark's strokes were under 3:1.
 *     The footage carries near-white highlights (sRGB ~253) that 35% cannot hold down. At 50%
 *     the same sampling gives a worst stroke pixel of **3.34:1** at 390 and **3.51:1** at
 *     768, with **no** stroke pixel under 3:1 in any frame, and it still reads as a wash over
 *     a photograph rather than a scrim: the stroke mean is 9.1:1 and 9.4:1. Per-frame tables
 *     are in `.superpowers/sdd/2026-11-16-storefront-revamp/task-13-report.md`.
 *
 * The opacity follows the same `useMedia` answer that picks the media, not a `md:` variant:
 * `md:` is min-width 768 while the video is max-width 768, so at exactly 768 a variant would
 * put the still's wash over the video — which is the one width this measured.
 *
 * Still unmeasured: widths between 390 and 1280 at unusual aspect ratios.
 *
 * Motion is CSS-only, because every pixel here is above the fold: `reveal-image` on the
 * media. `Reveal` is deliberately not used — it is scroll-triggered and is a no-op for
 * anything already in view.
 *
 * **The wordmark carries no reveal, and that is measured rather than preferred.** It used to
 * take `reveal-text` staggered three steps of `--stagger` behind the image. But it is also
 * the page's LCP element on mobile, and 180ms of delay plus a 700ms fade put Chrome's
 * observed LCP at 881ms — which Lighthouse's throttled model turned into 3.8s and a mobile
 * `/` performance score of 88 against a target of 90. Two controlled runs isolated it:
 * blocking all 4.6MB of remote media changed the score by **zero**, while forcing reduced
 * motion — which `globals.css` answers by disabling the fade — moved it to **95** and the
 * observed LCP to **153ms**. So the entrance is the image's alone here. Nothing else changes:
 * `reveal-text` is still correct for above-the-fold text that is not the LCP element, and
 * every staggered `Reveal` below the fold is untouched.
 *
 * The desktop/mobile media split stays `useMedia`, unchanged: a desktop still frame, a
 * portrait `webm` on a phone. The photograph carries `alt=""` and the video `aria-hidden`
 * — the wordmark is the hero's accessible content, the media is its ground. The video needs
 * no `tabIndex={-1}`: a `<video>` without `controls` is not focusable, and an `aria-hidden`
 * element that *were* focusable would be an axe `aria-hidden-focus` violation rather than
 * something to patch over.
 *
 * The wordmark's letter-spacing is `tracking-(--tracking-wordmark)`, not a magic
 * `tracking-[0.14em]`: 0.14em is declared beside `--tracking-eyebrow` in `app/globals.css`,
 * so the one piece of display type the system sets open — wider than body, tighter than the
 * eyebrow's 0.18em — cannot drift away from that scale.
 */
export default function Hero() {
  const isMobile = useMedia('(max-width: 768px)');

  return (
    <section className="relative h-[100svh] w-full overflow-hidden bg-ink">
      {isMobile ? (
        <video
          src={mobileVideo}
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
          className="reveal-image absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <Image
          src={desktopImage}
          alt=""
          fill
          preload
          sizes="100vw"
          className="reveal-image object-cover"
        />
      )}

      {/* Flat ink wash, one opacity, no gradient, no pure black. Each figure is the measured
          floor for its own medium -- 35% over the still, 50% over the video, whose near-white
          highlights leave the wordmark at 2.15:1 under a 35% wash. See the measurements in the
          component comment above; do not lower either without re-measuring. */}
      <div
        aria-hidden="true"
        className={cn('absolute inset-0', isMobile ? 'bg-ink/50' : 'bg-ink/35')}
      />

      {/* No reveal on the wordmark. It is the page's LCP element on mobile, and its 180ms
          stagger plus 700ms fade was the whole of the gap between 88 and the 90 target --
          see the component comment. The media's `reveal-image` still carries the entrance,
          and no `--reveal-delay` is set here because nothing beneath it reads one. */}
      <div className="absolute inset-0 flex items-center">
        <div className="grid-editorial">
          <DisplayHeading
            level={1}
            size={1}
            className="col-span-12 tracking-(--tracking-wordmark) text-paper uppercase md:col-span-6 md:col-start-2"
          >
            {wordmark}
          </DisplayHeading>
        </div>
      </div>
    </section>
  );
}
