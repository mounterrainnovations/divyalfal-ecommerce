'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import DisplayHeading from '@/components/primitives/DisplayHeading';
import HairlineRule from '@/components/primitives/HairlineRule';
import Reveal from '@/components/primitives/Reveal';
import { CATEGORY_CONFIG } from '@/lib/common/product-interfaces';
import { siteCopy } from '@/lib/content/site-copy';
import { cn } from '@/lib/utils';

const categories = CATEGORY_CONFIG;

/**
 * Where the photograph sits, and therefore how wide it renders. Measured in Chrome at both
 * edges of every band, with the browser resolving the hint -- not derived from the class
 * names, which is the method `ProductTile` requires of every surface that renders a tile and
 * which this surface borrows because it has the same problem.
 *
 *   390 -> 137px;  767 -> 288px;  768 -> 303px;  1023 -> 410px;
 *   1024 -> 390px; 1439 -> 564px; 1440 -> 565px; 1920 -> 565px
 *
 * Two layouts, four bands, and three of the four turn at their *top* rather than at the
 * breakpoint: the gutter doubles at 1024, so 1023 is wider than 1024, and the content max
 * stops the band growing at 1440. 767 is the phone layout's widest thumbnail and 768 the
 * desktop preview's narrowest frame, which is why both edges are listed.
 *
 * (Measured figures are computed for a scrollbar-free layout viewport; headless Chrome's 15px
 * scrollbar makes every reading about 6px narrower than the figures above, and the hint should
 * be generous rather than exact.)
 */
const PREVIEW_SIZES =
  '(min-width: 1440px) 565px, (min-width: 1024px) 40vw, (min-width: 768px) 41vw, calc(40vw - 19px)';

/**
 * Movement 2 — the collections index, with a live preview.
 *
 * **What this replaces, and why.** The index before it was six names set at display-3, one per
 * line, and nothing else: 1,102px of paper carrying six words and not one photograph, on a page
 * whose complaint was that it looked empty. It was the right answer to the section it replaced
 * (six 88px avatar circles in a snap-scroller) and the wrong answer to the page's density: a
 * fashion house's contents page is a list of names *beside* a photograph, not a list of names
 * alone.
 *
 * So the names stay a vertical list, tightened, and the right half of the band is one large
 * photograph that follows the reader: pointing at a collection or tabbing to it shows it. One
 * big image doing the photographic work, rather than six thumbnails competing.
 *
 * **Keyboard and screen reader.** The rows are the same six links they always were, so the
 * interaction is the tab order: `onFocus` swaps the preview exactly as `onMouseEnter` does, and
 * there is no control to learn, nothing to press and no state a keyboard reader cannot reach.
 * The photographs are `alt=""` — a picture of the thing the link already names is decoration —
 * so nothing is announced on a swap and there is deliberately no live region: the only thing
 * that changes for a listener is which link they are on, which their reader already says. The
 * first collection is active on first paint, so the frame is never empty.
 *
 * **The phone does not pretend to have the interaction.** Hover and focus-follow do not
 * translate to touch, and a tap-to-preview would spend a tap saying what a photograph could
 * have said. Below `md` all six photographs are simply on screen, in flow, each inside its own
 * row as a two-fifths-width portrait beside the name. From `md` the same six elements become
 * one stacked frame in the right half of the band and the active one is the only one at full
 * opacity. **One element per category either way**: rendering a phone layout and a desktop
 * layout as two sets of rows would put twelve links on the homepage with six names between
 * them, which `test/control-names.test.tsx` fails on, rightly.
 *
 * **Why the stagger wraps the name and not the row.** `Reveal` animates with a `translateY`,
 * and a transformed element is the containing block for its absolutely positioned descendants.
 * A per-row `Reveal` around the whole row would have re-anchored that row's preview to the row
 * for the 700ms the animation runs: a small frame in the wrong place, snapping into position
 * when the animation ended. The reveal therefore wraps the name only, and nothing transformed
 * sits between a preview and the `relative` block it is placed against.
 *
 * Names and hrefs are unchanged and remain a contract. `CATEGORY_CONFIG` stays the source of
 * the six entries because it is also what `/products` filters against, and the href keeps the
 * plural `?categories=<display name>` form that `app/products/page.tsx` parses — a singular
 * `?category=` would silently filter nothing. The photographs are the same six paths the copy
 * module holds (a test pins the two lists equal), which is where the imagery pass should look.
 *
 * **The slot, for whoever re-curates the photographs.** Six frames, one per collection, cropped
 * by `object-cover` to a box whose shape follows the viewport — 559 x 552 (square) at 1440,
 * 383 x 450 (0.85) at 1024, 296 x 387 (0.77) at 768 — and to a 4:5 portrait thumbnail of about
 * 131 x 164 on a phone. So the subject wants to sit centred and survive every one of those;
 * nothing is overlaid on the image, so it needs no clear band for type. They are seen one at a
 * time, large, and in immediate succession as the reader moves down the list, so they want a
 * consistent treatment far more than they want individual drama. The weakest file in place today
 * is `/categories/lehenge.webp` at 368x399 — smaller than the frame it has to fill.
 */
export default function Categories() {
  const [active, setActive] = useState(0);

  return (
    <section className="section-rhythm bg-paper">
      <div className="grid-editorial">
        {/* `relative` here and nowhere nearer: this is the block every preview is placed
            against from `md`. It spans the heading as well as the index, so the photograph
            runs the full height of the movement -- level with the top of "Shop by Category"
            and with the rule that closes the list -- rather than starting at the first row.
            That is what makes the frame a portrait (about 559 x 705 at the content max)
            instead of the square it would be beside the list alone, at no cost in height. */}
        <div className="relative col-span-12 md:col-span-11 md:col-start-2">
          <div className="md:w-[46%]">
            <Reveal>
              <DisplayHeading level={2} size={2}>
                {siteCopy.home.categories.heading}
              </DisplayHeading>
            </Reveal>

            <ul className="m-0 mt-8 list-none p-0 md:mt-12">
              {categories.map((cat, index) => (
                <li key={cat.name}>
                  <HairlineRule />
                  <Link
                    href={`/products?categories=${encodeURIComponent(cat.name)}`}
                    onMouseEnter={() => setActive(index)}
                    onFocus={() => setActive(index)}
                    className="group flex items-center gap-4 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink md:gap-6 md:py-4"
                  >
                    <span
                      data-preview={index === active ? 'active' : 'idle'}
                      className={cn(
                        // Phone: an in-flow portrait thumbnail, always visible.
                        'relative aspect-[4/5] w-2/5 shrink-0 overflow-hidden bg-paper-deep',
                        // Desktop: the shared frame in the right half of the band, inert to the
                        // pointer so the stack cannot intercept a hover meant for a name.
                        'md:pointer-events-none md:absolute md:inset-y-0 md:left-[54%] md:right-0 md:aspect-auto md:w-auto',
                        'md:transition-opacity md:duration-500 md:ease-out md:motion-reduce:transition-none',
                        index === active ? 'md:opacity-100' : 'md:opacity-0'
                      )}
                    >
                      {/* Decorative: the link beside it names the collection. */}
                      <Image
                        src={cat.image}
                        alt=""
                        fill
                        sizes={PREVIEW_SIZES}
                        className="object-cover object-center"
                      />
                    </span>
                    <Reveal delay={index * 60} className="min-w-0">
                      <DisplayHeading
                        level={3}
                        size={3}
                        className="transition-transform duration-500 ease-out group-hover:translate-x-2 group-focus-visible:translate-x-2 motion-reduce:transition-none"
                      >
                        {cat.name}
                      </DisplayHeading>
                    </Reveal>
                    <span
                      aria-hidden="true"
                      className="ml-auto font-ui text-eyebrow text-ink-soft transition-colors duration-500 group-hover:text-ink group-focus-visible:text-ink motion-reduce:transition-none"
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {/* One stagger step past the last row. Unwrapped, it painted on the first frame
                while the six names above it were still armed at opacity 0 -- a hairline
                hanging on its own under the heading, closing nothing. */}
            <Reveal delay={categories.length * 60}>
              <HairlineRule />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
