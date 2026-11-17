'use client';

import Image from 'next/image';
import DisplayHeading from '@/components/primitives/DisplayHeading';
import { siteCopy } from '@/lib/content/site-copy';
import { useMedia } from '@/lib/hooks/useMedia';

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
 * On the desktop still the word sits on the baseline -- columns 2-7, bottom-aligned, 64px
 * clear of the frame's foot -- and on the phone video it stays vertically centred. The still
 * used to force a centred wordmark: `mock_hero_desktop_2.webp` was a 1100x550 composite with
 * its own headline burned into the bottom quarter, which a baseline wordmark landed on top
 * of. The stand-in that replaces it (`public/samples/hero/hero-black-silk-drape.webp`, a
 * placeholder -- see `public/samples/README.md`) carries no text, so the baseline is free
 * again. The video keeps its centred word because that is the position its wash was measured
 * at (below); moving it would void the 50% figure. The alignment is CSS, `max-[768px]:`,
 * the same boundary `useMedia` answers for, and not the `isMobile` state: `useMedia` is false
 * on the server and on the first client render, so a JS-driven alignment paints the phone's
 * wordmark on the baseline and then jumps it to the centre on hydration -- measured as a
 * 0.052 layout shift on mobile `/`, the page's only one.
 *
 * Legibility comes from a flat ink wash where the media needs one -- not a gradient
 * (forbidden), not a black scrim -- and whether it is needed is per medium, because the two
 * media are not equally bright:
 *
 *   - **Desktop still, none.** The old photograph was bright enough to need a flat 35%: at
 *     that wash the brightest pixel under the wordmark's glyph strokes measured 3.58:1 at
 *     1440x900 and 4.20:1 at 1920x1080. The stand-in is a black silk drape, and with no wash
 *     at all the worst stroke pixel measures **9.26:1 at 1440 and 9.55:1 at 1920** (no stroke
 *     pixel under 3:1; stroke mean ~17.9:1). 0% is therefore the lowest flat opacity that
 *     holds large-text AA, and no element is rendered. Measured on the real rendered frame
 *     (Chrome, the wordmark's own glyph strokes isolated by diffing the frame with and
 *     without the heading), at the baseline position. **This is a property of the placeholder,
 *     not of the design:** real photography will almost certainly be brighter, and the
 *     wordmark then needs a flat wash again, re-measured the same way -- 35% was the figure
 *     for the previous photograph.
 *   - **Mobile / portrait-tablet video, 50%.** Task 13 measured what nobody had: the same
 *     35% over `bg_video.webm`, sampled at 11 frames across its 14.9s, at 390x844 and again
 *     at portrait tablet 768x1024 where `object-cover` crops it differently. Measured under
 *     the glyph strokes rather than over the wordmark's bounding box (a bright pixel in a
 *     letter gap is behind no type), the worst stroke pixel sat at **2.15:1** at 390 and
 *     **2.28:1** at 768, and in one frame **18%** of the wordmark's strokes were under 3:1.
 *     The footage carries near-white highlights (sRGB ~253) that 35% cannot hold down. At 50%
 *     the same sampling gives a worst stroke pixel of **3.34:1** at 390 and **3.51:1** at
 *     768, with **no** stroke pixel under 3:1 in any of the **11 sampled** frames (per-frame
 *     worst case 3.34:1 to 5.5:1) -- sampled, not exhaustive: 11 frames of a 14.9s clip, so an
 *     unsampled frame brighter than any of them is possible, if unlikely. It still reads as a
 *     wash over a photograph rather than a scrim: the stroke mean is 9.1:1 and 9.4:1.
 *     Per-frame tables are in
 *     `.superpowers/sdd/2026-11-16-storefront-revamp/task-13-report.md`. Not re-measured
 *     since: the video and the wordmark's position over it are unchanged.
 *
 * The wash follows the same `useMedia` answer that picks the media, not a `md:` variant:
 * `md:` is min-width 768 while the video is max-width 768, so at exactly 768 a variant would
 * put the still's treatment over the video -- which is the one width this measured.
 *
 * Still unmeasured: the still at widths other than 1440 and 1920, and at unusual aspect ratios.
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

      {/* Flat ink wash over the video only, 50%, no gradient, no pure black. The desktop still
          is dark enough to need none -- see the measurements in the component comment above.
          Do not lower the video's figure, or give the still a wash, without re-measuring. */}
      {isMobile && <div aria-hidden="true" className="absolute inset-0 bg-ink/50" />}

      {/* No reveal on the wordmark. It is the page's LCP element on mobile, and its 180ms
          stagger plus 700ms fade was the whole of the gap between 88 and the 90 target --
          see the component comment. The media's `reveal-image` still carries the entrance,
          and no `--reveal-delay` is set here because nothing beneath it reads one. */}
      <div className="absolute inset-0 flex items-end pb-16 max-[768px]:items-center max-[768px]:pb-0">
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
