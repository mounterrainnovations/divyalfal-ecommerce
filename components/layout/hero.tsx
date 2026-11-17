'use client';

import { getImageProps } from 'next/image';
import { useEffect, useRef } from 'react';
import DisplayHeading from '@/components/primitives/DisplayHeading';
import { siteCopy } from '@/lib/content/site-copy';

const { wordmark, desktopImage, mobileVideo } = siteCopy.home.hero;

/**
 * The one boundary in the hero: a phone and a portrait tablet get the video, everything
 * wider gets the still. `max-width: 768px` matches at exactly 768, which is the width the
 * video's 50% wash was measured at — Tailwind's `md:` is `min-width: 768px` and would hand
 * that width to the still's treatment instead, so `md:` is never used for this split.
 */
const PHONE = '(max-width: 768px)';

/**
 * The exact complement of `PHONE`, for the preload hint. `not all and (…)` rather than a
 * `min-width` a fraction above 768: there is then no viewport width, integral or fractional,
 * that matches both queries or neither.
 */
const NOT_PHONE = `not all and ${PHONE}`;

/**
 * A 1x1 transparent GIF, as the phone's candidate for the still.
 *
 * `<picture>`'s `<img>` is its mandatory fallback and loads whenever no `<source>` matches,
 * so "serve the still to desktops only" cannot be expressed by leaving the phone out — it
 * has to be expressed by giving the phone something that costs nothing. 43 bytes, inline, no
 * request, and nothing to see: the video paints over it, and the `<picture>` is `display:none`
 * at this width anyway.
 */
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/**
 * The still's `<img>` attributes, built by Next's own image pipeline rather than by hand.
 *
 * `getImageProps` is the sanctioned way to put an optimised `next/image` source inside a
 * `<picture>`: it returns the same `src`, `srcSet`, `sizes` and `style` the component would
 * have rendered, and — unlike the component — it emits no preload `<link>` of its own, which
 * is the whole point here. The hint below carries `media`, so the preload follows the medium.
 */
const { props: still } = getImageProps({
  src: desktopImage,
  alt: '',
  fill: true,
  sizes: '100vw',
  // Above the fold and the desktop LCP element: never lazy. `preload` is deliberately not
  // passed -- it is the prop that emitted the ungated hint this component used to ship.
  loading: 'eager',
  fetchPriority: 'high',
});

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
 * **Each viewport is served its own medium by the markup, with no JavaScript in the
 * decision.** This used to be `useMedia('(max-width: 768px)')`, and `useMedia` initialises
 * `false` — so the server rendered the desktop branch for *every* client, and the SSR HTML
 * carried `<link rel="preload" as="image" … imageSizes="100vw">` for the desktop still and no
 * `bg_video.webm` at all. A 390px phone fetched a landscape still at preload priority, painted
 * it, and then replaced the entire hero on hydration: a visible hero swap on every phone load,
 * on a site whose brief is "expensive at a glance". Now both media are in the server HTML and
 * the media queries pick between them:
 *
 *   - **The still** is an `<img>` inside a `<picture>` whose only `<source>` is the phone's,
 *     and that source is a 43-byte inline GIF. A phone therefore requests none of the
 *     photograph; a desktop matches no source, falls through to the `<img>`, and gets the full
 *     `next/image` `srcSet`.
 *   - **The footage** is a `<source media>` inside the `<video>`, not a `src` on it. This is
 *     the trap that cost a commit earlier on this branch: a CSS `hidden` does **not** save an
 *     autoplaying video's bytes, because `autoplay` overrides `preload="none"` in every engine
 *     that implements it, so a `display:none` video with a `src` still downloads the clip. A
 *     `media` that does not match is excluded by the resource selection algorithm before any
 *     byte is requested, which is a different mechanism and the only one that works here.
 *   - **The preload hint** carries `media={NOT_PHONE}`, so the one medium that is preloaded is
 *     the one that is about to be shown.
 *
 * CSS then hides whichever element is not in play, which is belt-and-braces: the bytes are
 * already gated above, and this only stops a transparent pixel and a sourceless element from
 * taking part in paint.
 *
 * **The media queries are not re-evaluated on resize** — neither `<picture>`'s nor
 * `<video>`'s source selection re-runs — so the effect below re-runs the video's selection
 * when the query flips. `<picture>` needs no help: the browser re-picks its candidate on
 * resize on its own. Without the effect, a desktop window dragged under 768px would show the
 * section's own ink ground rather than the footage; with it, behaviour matches what `useMedia`
 * gave, and the first paint no longer depends on JavaScript having run.
 *
 * On the desktop still the word sits on the baseline -- columns 2-7, bottom-aligned, 64px
 * clear of the frame's foot -- and on the phone video it stays vertically centred. The still
 * used to force a centred wordmark: `mock_hero_desktop_2.webp` was a 1100x550 composite with
 * its own headline burned into the bottom quarter, which a baseline wordmark landed on top
 * of. The stand-in that replaces it (`public/samples/hero/hero-black-silk-drape.webp`, a
 * placeholder -- see `public/samples/README.md`) carries no text, so the baseline is free
 * again. The video keeps its centred word because that is the position its wash was measured
 * at (below); moving it would void the 50% figure. **The alignment is CSS, `max-[768px]:`,
 * and never state** -- a JS-driven alignment painted the phone's wordmark on the baseline and
 * then jumped it to the centre, measured as a 0.052 layout shift on mobile `/`, the page's
 * only one. That is why the media split moving into the markup had to keep the wordmark in
 * CSS rather than "simplify" it back into a single branch.
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
 *     holds large-text AA, and the wash element carries no background at this width. Measured
 *     on the real rendered frame (Chrome, the wordmark's own glyph strokes isolated by diffing
 *     the frame with and without the heading), at the baseline position. **This is a property
 *     of the placeholder, not of the design:** real photography will almost certainly be
 *     brighter, and the wordmark then needs a flat wash again, re-measured the same way --
 *     35% was the figure for the previous photograph.
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
 * The wash is now a `max-[768px]:` variant on the same 768 boundary the media split uses, for
 * the same reason the alignment is: `md:` is min-width 768 while the video is max-width 768,
 * so at exactly 768 a `md:` variant would put the still's treatment over the video -- which
 * is the one width this measured.
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
 * The photograph carries `alt=""` and the video `aria-hidden` — the wordmark is the hero's
 * accessible content, the media is its ground. The video needs no `tabIndex={-1}`: a
 * `<video>` without `controls` is not focusable, and an `aria-hidden` element that *were*
 * focusable would be an axe `aria-hidden-focus` violation rather than something to patch over.
 *
 * The wordmark's letter-spacing is `tracking-(--tracking-wordmark)`, not a magic
 * `tracking-[0.14em]`: 0.14em is declared beside `--tracking-eyebrow` in `app/globals.css`,
 * so the one piece of display type the system sets open — wider than body, tighter than the
 * eyebrow's 0.18em — cannot drift away from that scale.
 */
export default function Hero() {
  const video = useRef<HTMLVideoElement>(null);

  // Source selection inside a <video> runs once and does not re-run when a media query
  // flips, so a desktop window dragged under 768px would otherwise find a <video> with no
  // chosen resource. `load()` re-runs the selection with the current viewport in hand. This
  // is the resize case only: the first paint is already correct without any JavaScript.
  useEffect(() => {
    const node = video.current;
    if (!node || typeof window.matchMedia !== 'function') return;

    const media = window.matchMedia(PHONE);
    const reselect = () => node.load();
    media.addEventListener('change', reselect);
    return () => media.removeEventListener('change', reselect);
  }, []);

  return (
    <section className="relative h-[100svh] w-full overflow-hidden bg-ink">
      {/* The preload hint the `preload` prop used to emit, with the one thing it could not
          carry: `media`. A phone requests nothing from this. */}
      <link
        rel="preload"
        as="image"
        media={NOT_PHONE}
        imageSrcSet={still.srcSet}
        imageSizes={still.sizes}
        fetchPriority="high"
      />

      <picture className="max-[768px]:hidden">
        {/* A phone's candidate for the still: 43 inline bytes, so none of the photograph is
            requested at a width that never shows it. */}
        <source media={PHONE} srcSet={BLANK} />
        {/* A plain `<img>`, which is what `<picture>` requires as its fallback child -- but
            still next/image: every attribute on it comes from `getImageProps` above. */}
        <img {...still} alt="" className="reveal-image object-cover" />
      </picture>

      {/* `media` on the source, not `src` on the video: an unmatched source is excluded
          before any byte is requested, while an autoplaying video with a `src` downloads
          even under `display:none`. */}
      <video
        ref={video}
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
        className="reveal-image absolute inset-0 hidden h-full w-full object-cover max-[768px]:block"
      >
        <source src={mobileVideo} type="video/webm" media={PHONE} />
      </video>

      {/* Flat ink wash over the video only, 50%, no gradient, no pure black. The desktop still
          is dark enough to need none, so above 768px this element carries no background at
          all -- see the measurements in the component comment above. Do not lower the video's
          figure, or give the still a wash, without re-measuring. */}
      <div aria-hidden="true" className="absolute inset-0 max-[768px]:bg-ink/50" />

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
