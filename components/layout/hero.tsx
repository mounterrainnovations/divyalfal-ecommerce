import Link from 'next/link';
import { ArrowRight, Flower2, Shirt, Sparkles, type LucideIcon } from 'lucide-react';
import HeroSlideshow, { type HeroSlide } from '@/components/layout/hero-slideshow';
import { siteCopy } from '@/lib/content/site-copy';

/**
 * The homepage hero.
 *
 * ## Full bleed, and what that cost
 *
 * The hero used to be an inset ratio box: `p-6 sm:p-8 md:p-12` around a rounded picture. The
 * owner's mock-up is edge to edge with the words lying on the photograph, so the padding and
 * the rounding are gone and the plate runs to the viewport on all four sides.
 *
 * That padding was load-bearing. `components/sections/categories.tsx` deliberately takes half
 * a `SECTION` on top because the hero below it was supplying 24-48px of white — it says so in
 * its own comment. Removing the padding here without restoring that section's full top padding
 * would have closed the seam to 28px and made the band look stuck to the photograph. Both
 * files changed together; neither is correct alone.
 *
 * ## Why a viewport height is right here and was wrong before
 *
 * The previous hero was `h-screen` and that was the bug: a 0.49 ratio asked of a 1.25
 * photograph threw away 61% of every frame on a phone. The fix was ratios. This hero is tall
 * again — but it is tall because it now has to hold five stacked things (eyebrow, wordmark,
 * byline, sentence, two buttons, three marks) and a photograph behind them, and those have a
 * real minimum height. So the box is `min-h` plus a ratio: the ratio governs on a wide screen
 * where it is generous, and the minimum governs on a narrow one where the content is what
 * decides. `svh` rather than `vh` so a phone's collapsing address bar does not resize it
 * mid-scroll.
 *
 * On a phone the content sits over a square-ish crop rather than beside the picture, because
 * the alternative at 390px is four words per line.
 */

/**
 * The four plates.
 *
 * All four are Divyafal's own runway photography, already in the repository, from the same
 * gallery the Atelier section plays; the first is the one the hero has always shown, kept
 * first and read from `siteCopy` so the canonical image stays canonical. The other two files
 * in that folder are excluded on purpose: `dmw-17.jpg` is the lamp-lighting ceremony (an event
 * photograph, not a garment one) and `dmw-326.jpg` is a thirty-person company call whose lower
 * third is empty runway, which is the first thing a wide crop keeps.
 *
 * `position` is tuned per plate, and all of it is vertical: these were shot with the hall's
 * lighting truss in the top quarter, so the focal point sits low enough that the widest crop
 * drops the rig rather than the hems.
 */
const HERO_SLIDES: HeroSlide[] = [
  {
    src: siteCopy.home.hero.desktopImage,
    alt: 'Five models in Divyafal couture on the Couture Saga runway',
    position: '50% 55%',
  },
  {
    src: '/slideshow/dmw-311.jpg',
    alt: 'Two models walking the runway in a white cotton saree and a red Indo-western drape',
    position: '50% 50%',
  },
  {
    src: '/slideshow/dmw-76.jpg',
    alt: 'Models walking the runway in a white saree and a black velvet gown',
    position: '50% 64%',
  },
  {
    src: '/slideshow/dmw-26.jpg',
    alt: 'A model in a blush draped gown at the head of the runway',
    position: '50% 62%',
  },
];

/**
 * The three marks, by name.
 *
 * `siteCopy` names a drawing rather than a file so that editing the copy can never point at an
 * asset that does not exist. An unknown name falls back to the sparkle rather than rendering
 * nothing, because a missing icon beside a present label reads as a broken image.
 */
const MARK_ICONS: Record<string, LucideIcon> = {
  needle: Sparkles,
  bloom: Flower2,
  form: Shirt,
};

const Hero = () => {
  const { hero } = siteCopy.home;

  return (
    <section className="relative w-full">
      <div className="relative min-h-[34rem] w-full sm:min-h-[36rem] lg:aspect-[21/9] lg:min-h-[38rem] lg:max-h-[calc(100svh_-_7.5rem)]">
        <HeroSlideshow
          slides={HERO_SLIDES}
          /* Named for what it is rather than "carousel", which a screen reader already says
             via `aria-roledescription`. */
          label={`${hero.wordmark} runway photographs`}
          /* Edge to edge at every width, so the hint is exact and next/image stops serving its
             largest render to a phone. */
          sizes="100vw"
        >
          {/*
            The scrim, and it is two gradients rather than one.

            Left to right is what makes the words legible: these photographs are bright through
            the middle, and the text column sits on the left third. Bottom to top is what keeps
            the dots and the marks readable where the runway floor is palest. A single flat veil
            would do both and take the colour out of the garments, which are the only reason
            the photograph is there at all.
          */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/10"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"
          />

          <div className="absolute inset-0 z-10 flex items-center">
            <div className="mx-auto w-full max-w-[1600px] px-6 pb-16 sm:px-8 lg:px-14 lg:pb-12">
              <div className="max-w-xl">
                <p className="text-[11px] tracking-[0.34em] text-white/75 uppercase sm:text-xs">
                  {hero.eyebrow}
                </p>

                {/*
                  The page's `h1`. The old hero had its overlay commented out, so the homepage
                  shipped with no first-level heading at all and the document outline began at
                  the "Shop by Category" `h2`.
                */}
                <h1 className="mt-4 font-serif text-5xl leading-[0.95] font-normal tracking-[0.1em] text-white uppercase sm:text-6xl lg:text-7xl">
                  {hero.wordmark}
                </h1>

                {/* The byline between two rules, as the mock-up has it. The rules are
                    decoration and are hidden from the reader; the words are not. */}
                <p className="mt-5 flex items-center gap-4 text-[11px] tracking-[0.28em] text-white/80 uppercase sm:text-xs">
                  <span aria-hidden="true" className="h-px w-10 bg-white/35 sm:w-14" />
                  {hero.byline}
                  <span aria-hidden="true" className="h-px w-10 bg-white/35 sm:w-14" />
                </p>

                <p className="mt-6 max-w-md text-base leading-relaxed text-white/90 sm:text-lg">
                  {hero.blurb}
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-3 sm:gap-4">
                  <Link
                    href={hero.primaryCta.href}
                    className="group inline-flex items-center gap-2.5 bg-[var(--accent-sale)] px-6 py-3.5 text-[13px] tracking-[0.08em] text-white transition-colors duration-200 hover:bg-[#751f1f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none sm:px-7"
                  >
                    {hero.primaryCta.label}
                    <ArrowRight
                      size={16}
                      strokeWidth={1.75}
                      aria-hidden="true"
                      className="transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                    />
                  </Link>

                  <Link
                    href={hero.secondaryCta.href}
                    className="inline-flex items-center border border-white/70 px-6 py-3.5 text-[13px] tracking-[0.08em] text-white transition-colors duration-200 hover:bg-white hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none sm:px-7"
                  >
                    {hero.secondaryCta.label}
                  </Link>
                </div>

                {/*
                  The three marks. A list, because that is what it is, and the separators are
                  borders on the items rather than characters between them — a pipe typed into
                  the markup is read aloud.
                */}
                <ul className="mt-10 flex flex-wrap items-stretch gap-x-5 gap-y-4 sm:gap-x-7 lg:mt-12">
                  {hero.marks.map((mark, index) => {
                    const Icon = MARK_ICONS[mark.icon] ?? Sparkles;
                    return (
                      <li
                        key={mark.label}
                        className={
                          index === 0
                            ? 'flex items-center gap-2.5'
                            : 'flex items-center gap-2.5 border-l border-white/25 pl-5 sm:pl-7'
                        }
                      >
                        <Icon
                          size={18}
                          strokeWidth={1.4}
                          aria-hidden="true"
                          className="shrink-0 text-white/70"
                        />
                        <span className="max-w-[7rem] text-[11px] leading-tight tracking-[0.1em] text-white/85 uppercase sm:text-xs">
                          {mark.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        </HeroSlideshow>
      </div>
    </section>
  );
};

export default Hero;
