'use client';

import Image from 'next/image';
import type { CSSProperties } from 'react';
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
 * The word is centred vertically rather than set on the baseline, and that is forced, not
 * preferred. `mock_hero_desktop_2.webp` is a 1100×550 composite with its own headline
 * ("Grace in Every Look / A Story in Every Thread") burned into the pixels, starting at
 * 74.5% of the image height. Because the image is wider than any plausible hero frame,
 * `object-cover` always scales it by height, so that burned-in headline always lands in the
 * bottom quarter of the frame at every viewport. A bottom-left wordmark collides with it
 * outright. Centring clears it by the whole middle band at every ratio while still leaving
 * the top clear for the transparent nav. Replace that asset with a clean photograph and
 * this should move back down to the baseline.
 *
 * Legibility comes from a single flat 35% ink wash — not a gradient (forbidden), not a
 * black scrim. That figure was measured, not guessed: at 35% the brightest pixel anywhere
 * behind the wordmark still clears 3:1 against paper (large-text AA) at 1280, 1440 and
 * 1920 wide, while the photograph keeps a ~6.9:1 mean and stays a photograph.
 *
 * Motion is CSS-only, because every pixel here is above the fold: `reveal-image` on the
 * media and `reveal-text` on the wordmark, staggered three steps of `--stagger` behind it
 * so the word settles as the image finishes. `Reveal` is deliberately not used — it is
 * scroll-triggered and is a no-op for anything already in view.
 *
 * The desktop/mobile media split stays `useMedia`, unchanged: a desktop still frame, a
 * portrait `webm` on a phone. The photograph carries `alt=""` and the video `aria-hidden`
 * — the wordmark is the hero's accessible content, the media is its ground.
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
          tabIndex={-1}
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

      {/* Flat ink wash, one opacity, no gradient, no pure black. 35% is the measured floor:
          below it the brightest pixels under the wordmark drop beneath 3:1 against paper
          (large-text AA). The photograph keeps a ~6.9:1 mean, so it is a wash, not a scrim. */}
      <div aria-hidden="true" className="absolute inset-0 bg-ink/35" />

      <div
        className="absolute inset-0 flex items-center"
        style={{ '--reveal-delay': 'calc(var(--stagger) * 3)' } as CSSProperties}
      >
        <div className="grid-editorial">
          <DisplayHeading
            level={1}
            size={1}
            className="reveal-text col-span-12 tracking-[0.14em] text-paper uppercase md:col-span-6 md:col-start-2"
          >
            {wordmark}
          </DisplayHeading>
        </div>
      </div>
    </section>
  );
}
