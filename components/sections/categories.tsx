'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useShowcase } from '@/lib/hooks/useShowcase';
import { CONTAINER, HEADING, HEADING_GAP, SIZES } from '@/components/sections/section-shell';
import { cn } from '@/lib/utils';

/**
 * The category strip.
 *
 * The six tiles used to be `CATEGORY_CONFIG`, a constant. They now come from `useShowcase`,
 * which starts from that same constant and swaps in whatever the owner has saved in the portal
 * — so this section renders identically on the first frame and can only ever be *changed*, not
 * emptied, by the database. Tiles the owner has hidden are filtered out here rather than in the
 * hook, because the Categories screen in the portal needs the hidden ones too.
 *
 * ## Why the padding is asymmetric, and why there are hairlines
 *
 * This band was reported as dead white space, and measuring it said why. It had the three
 * `section-shell` strings (`SECTION`, `CONTAINER`, `HEADING`) copied out as literals rather
 * than imported, so nothing connected it to the shared rhythm, and two things compounded:
 *
 * 1. The hero immediately above is `h-screen` with its image inset by its own `p-6 sm:p-8
 *    md:p-12`, so the hero's box ends 48px of white below the bottom edge of the picture. A
 *    full `SECTION` on top of that measured 128px of unbroken white at 1440px between the
 *    photograph and the word "Shop" — the largest gap anywhere on the homepage.
 * 2. `bg-gray-50` is #f9fafb. Against a white page it is not a band; it is white. So the
 *    160px of vertical padding had no visible container and read as the page having stopped.
 *
 * Hence: half a `SECTION` on top, because the hero already supplies the other half (28px +
 * the hero's 24px = 56px = `py-14` below `md`; 40px + 48px = 88px ≈ `py-20` above it), a full
 * `SECTION` underneath where the next band supplies nothing, and a hairline top and bottom so
 * the tint has edges. The air is now inside something.
 */
const Categories = () => {
  const { categories: all } = useShowcase();
  const categories = all.filter(category => category.visible);

  // Every tile hidden is a deliberate choice, and an empty strip with a heading above it reads
  // as a broken section. Draw nothing at all instead.
  if (categories.length === 0) return null;

  return (
    <section className="border-y border-gray-200 bg-gray-50 pt-7 pb-14 md:pt-10 md:pb-20">
      <div className={CONTAINER}>
        <h2 className={cn(HEADING, 'text-center', HEADING_GAP)}>Shop by Category</h2>

        {/*
         * The scroller is the element with `overflow-x-auto`, and the row inside it is
         * `mx-auto w-fit`. That pairing is the one that behaves at every width: when the six
         * tiles fit, `w-fit` shrinks the row to its contents and `mx-auto` centres it; when
         * they do not, the auto margins collapse to zero and the row starts flush left, so
         * the first tile is always reachable.
         *
         * What it replaces was `justify-around` layered on top of `space-x-10` and a stray
         * `px-2`, and the two spacing systems fought. At 1440px the tiles came out 63px apart
         * with 12px of lead-in and 19px of tail — visibly loose and visibly lopsided, which is
         * the horizontal half of the same "empty spaces" complaint. And at any width between
         * roughly 1000px and 1280px the row was 80px wider than its own scroll box while
         * `justify-around` quietly did nothing, so the sixth category was clipped with no
         * scrollbar to say so (`scrollbar-hide`). A plain `gap` makes the rhythm one number.
         */}
        <div className="snap-x snap-mandatory overflow-x-auto scrollbar-hide">
          <div className="mx-auto flex w-fit gap-6 sm:gap-8 md:gap-10">
            {categories.map(cat => (
              <Link
                key={cat.name}
                href={`/products?categories=${encodeURIComponent(cat.name)}`}
                className="flex shrink-0 snap-center flex-col items-center rounded-lg text-center transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gray-900"
              >
                {/*
                 * The sizes were not monotonic: 88px at base, then `sm:w-20` (80px) — the
                 * tiles got *smaller* on a larger screen, which both looked like an accident
                 * and left the band emptier than it needed to be on tablets. 88 → 96 → 144.
                 */}
                <div className="h-[88px] w-[88px] overflow-hidden rounded-full sm:h-24 sm:w-24 md:h-36 md:w-36">
                  <Image
                    src={cat.image}
                    /*
                     * Deliberately empty. The tile's name is right underneath it in text, so
                     * `alt={cat.name}` made the link's accessible name "Sarees Sarees" — the
                     * picture is decoration for a label that is already there.
                     */
                    alt=""
                    width={144}
                    height={144}
                    /*
                     * Without this, next/image assumes the tile fills the viewport and serves
                     * its 3840px render into a 144px circle. `SIZES.avatar` was written for
                     * this exact slot (see section-shell) and this section never adopted it.
                     */
                    sizes={SIZES.avatar}
                    className="h-full w-full object-cover"
                  />
                </div>
                <p className="mt-2 text-xs font-medium text-gray-700 sm:text-sm">{cat.name}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Categories;
