import HeroSlideshow, { type HeroSlide } from '@/components/layout/hero-slideshow';
import { siteCopy } from '@/lib/content/site-copy';

/**
 * The homepage hero.
 *
 * ## What was wrong with the sizing
 *
 * The box was `h-screen` with its own `p-6 sm:p-8 md:p-12`, and the photographs in
 * `/public/slideshow` are all 1400x1120 — 5:4, landscape, a documentary frame of a real show
 * with the models spread across the full width of it. On a 390x844 phone the inner box came
 * out 342 wide by 700 tall: a 0.49 ratio asked of a 1.25 picture, so `object-cover` threw away
 * 61% of every photograph's width and showed the middle third of a five-model line-up. That is
 * "hero picture hai vo size nahi hai" exactly — not the file, the box around it.
 *
 * So the box is now a ratio rather than a viewport height, and the ratio is chosen to stay near
 * the source's own 1.25 and to widen only as the viewport gives it the width to widen with:
 * square on a phone (a 20% crop off the sides, which every one of these frames survives),
 * 4:3 on a tablet (within a few percent of the source, so essentially the whole photograph),
 * 16:9 on a desktop, capped so the hero and the navigation together still clear the fold on a
 * laptop. Because every one of those is a ratio and not a measurement, the space is reserved
 * before the first byte of the image arrives and nothing shifts as it loads.
 *
 * The outer padding stays. It is what gives `components/sections/categories.tsx` the half of
 * its top rhythm that it deliberately does not supply itself — see the comment there.
 *
 * ## Why the mobile-only video is gone
 *
 * The hero used to render a remote Supabase `.webm` below 768px and the photograph above it,
 * decided by `useMedia`, which starts `false` on the server and corrects itself in an effect —
 * so a phone painted the desktop photograph and then swapped it for a video, and the brief's
 * "3-4 images that slide" would never once have been seen on the device most visitors use.
 * One hero at every width is the point of the change. The video's URL is still in
 * `siteCopy.home.hero.mobileVideo`, so nothing has been lost, only unrendered.
 */

/**
 * The four plates.
 *
 * All four are Divyafal's own runway photography, already in the repository, from the same
 * gallery the Atelier section plays; the first is the one the hero shows today, kept first and
 * read from `siteCopy` so that the hero's canonical image stays canonical. The other two files
 * in that folder are not here on purpose: `dmw-17.jpg` is the lamp-lighting ceremony (an event
 * photograph, not a garment one) and `dmw-326.jpg` is a thirty-person company call with an
 * empty runway filling its lower third, which is the first thing a 16:9 crop would keep.
 *
 * `position` is tuned per plate, and all of it is vertical: the two walking shots were taken
 * with the hall's lighting truss in the top quarter of the frame, so their focal point sits
 * low enough that the widest crop drops the rig rather than the hems.
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

const Hero = () => {
  return (
    <section className="relative w-full p-6 sm:p-8 md:p-12">
      <div className="relative aspect-square w-full overflow-hidden rounded-md sm:aspect-4/3 lg:aspect-video lg:max-h-[calc(100svh_-_9rem)]">
        <HeroSlideshow
          slides={HERO_SLIDES}
          /* Named for what it is rather than "carousel", which a screen reader already says
             via `aria-roledescription`. */
          label={`${siteCopy.home.hero.wordmark} runway photographs`}
          /* The hero is the full width of the viewport at every breakpoint, minus its own
             padding. Without this, next/image assumes the same thing but cannot prove it, and
             serves its largest render to a phone. */
          sizes="100vw"
        >
          {/*
            The scrim.

            It is a gradient and not a flat wash because these photographs are lit from above
            and already dark along the bottom edge; a uniform veil would take the colour out of
            the garments, which are the only reason the picture is there. This darkens only
            where the wordmark sits.
          */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent"
          />

          {/*
            The wordmark, and the page's `h1`.

            The old hero had its overlay commented out, so the homepage shipped with no
            first-level heading at all — the document outline began at the "Shop by Category"
            `h2`. The brand name is the honest thing to put there: it is already in `siteCopy`,
            it is what the shop is called, and it needs no new sentence invented for it.
          */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center px-6 pb-14 md:pb-20">
            <h1 className="font-serif text-4xl font-normal tracking-[0.14em] text-white uppercase drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)] sm:text-5xl lg:text-6xl">
              {siteCopy.home.hero.wordmark}
            </h1>
          </div>
        </HeroSlideshow>
      </div>
    </section>
  );
};

export default Hero;
