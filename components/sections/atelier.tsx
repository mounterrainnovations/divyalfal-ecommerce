'use client';

import Image from 'next/image';
import { useState } from 'react';
import Button from '@/components/primitives/Button';
import Reveal from '@/components/primitives/Reveal';
import { useSlideshowImages } from '@/lib/hooks/useSlideshowImages';

/** How many frames the band holds at once. */
const BAND = 3;

/**
 * The band's own shape, shared by the placeholder and the live gallery so the page below never
 * jumps when the request settles: three stacked 16:9 frames on a phone (16/27 all together),
 * one 12:5 row from `md`.
 */
const FRAME = 'w-full aspect-[16/27] md:aspect-[12/5]';

/**
 * One hint per panel, because the three columns are three different widths: 5/12, 4/12 and
 * 3/12 of the full-bleed band. Measured in Chrome at both edges of every band rather than read
 * off the class names -- the method `ProductTile` requires of every surface that renders a
 * tile, applied here because the problem is the same.
 *
 *   panel 1: 390 -> 390px;  767 -> 767px;  768 -> 320px;  1440 -> 600px
 *   panel 2: 390 -> 390px;  767 -> 767px;  768 -> 256px;  1440 -> 480px
 *   panel 3: 390 -> 390px;  767 -> 767px;  768 -> 192px;  1440 -> 360px
 *
 * Full bleed, so each panel is a flat fraction of the viewport at every width above `md` and
 * the whole viewport below it; no content max applies and no band turns at its top.
 */
const PANEL_SIZES = [
  '(min-width: 768px) 42vw, 100vw',
  '(min-width: 768px) 34vw, 100vw',
  '(min-width: 768px) 25vw, 100vw',
] as const;

const pad = (value: number) => String(value).padStart(2, '0');

/**
 * Movement 5 — the atelier, as a band of photographs.
 *
 * The retired slideshow sat a boxed, corner-rounded frame on a grey ground, a thousand pixels
 * wide, and advanced itself every 3.5 seconds. Its replacement was edge to edge on the paper
 * ground with the photograph as the whole of the movement — and showed **one** frame, 939px of
 * section carrying a single image out of the ten the folder holds, on a page whose complaint
 * was that it looked empty.
 *
 * So the movement is a band now: three frames at once in a 5/4/3 progression, full bleed, with
 * 1px gold gaps between them. The band is **shorter than the single frame was** and holds three
 * times the photography. The widths descend left to right, so it reads as a composed spread
 * rather than as a strip of equal thumbnails, and the narrowest panel is a portrait slot that
 * suits a detail shot.
 *
 * **It advances by explicit control only, and by a whole band at a time.** A gallery that moves
 * on a timer needs a pause control to be usable, takes the reading position away from anyone
 * slower than the timer, and is the kind of thing the spec's no-scroll-jacking rule exists to
 * rule out. Previous and Next are plain text buttons in the primitives' voice, native and so
 * keyboard-operable with a visible focus ring; the position is read out politely as a range.
 * Stepping by the band's own width means a reader meets every frame rather than re-reading two
 * of the three they just saw. The window wraps, so the whole gallery is reachable in either
 * direction. There is no timer here at all, so there is also nothing to subscribe to
 * `prefers-reduced-motion` for — the frame change is a CSS image reveal, which the global
 * reduced-motion rule already flattens.
 *
 * **Only the current band is in the DOM.** The folder holds photographs of up to 5000px, and
 * stacking them all (as the old slideshow did) downloads all of them whether or not anyone
 * advances. Three render, keyed so the reveal plays on each change.
 *
 * **When there is nothing to show, there is nothing on the page.** An empty list, an error
 * body, a non-OK response and a rejected fetch all end in `null` — see
 * `lib/hooks/useSlideshowImages`, which logs which one it was. The retired component fell back
 * to `fallback.jpg`, but that file sits in the same folder the route reads, so it is already
 * one of the frames whenever the folder is readable; when it is not, a lone stand-in photograph
 * would only pass for a gallery.
 *
 * A frame that fails to load is dropped from the set rather than left as a broken image, and if
 * that empties the set the movement disappears too. A gallery no larger than the band gets no
 * controls and no counter, because there is nothing to page through.
 *
 * **The slot, for whoever re-curates the photographs.** Three visible frames of roughly 600,
 * 480 and 360px wide at 1440 and about 594px tall, cropped by `object-cover`: a landscape, a
 * near-square and a portrait, side by side, read as one picture. So the set wants a consistent
 * treatment and subjects that survive three different crops — the atelier's materials, hands
 * and process rather than three full-length garments competing. On a phone each is a 16:9 band
 * at full width, which is the widest crop any of them takes.
 *
 * Movement 5 is below the fold, so the stagger is `Reveal` with the spec's 60ms step.
 */
export default function Atelier() {
  const { status, images } = useSlideshowImages();
  const [start, setStart] = useState(0);
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());

  const frames = images.filter(src => !failed.has(src));

  if (status === 'loading') {
    // Holds the height and says nothing: no pulse, no label, nothing for a reader to hear.
    return (
      <section className="section-rhythm bg-paper-deep" aria-hidden="true">
        <div className={`${FRAME} bg-paper`} />
      </section>
    );
  }

  if (frames.length === 0) return null;

  const total = frames.length;
  const size = Math.min(BAND, total);
  // A dropped frame can leave the saved start past the end.
  const first = total === 0 ? 0 : start % total;
  const window = Array.from({ length: size }, (_, offset) => (first + offset) % total);

  const step = (bands: number) => setStart((first + bands * size + total) % total);

  return (
    <section className="section-rhythm bg-paper-deep" aria-label="Gallery">
      <Reveal>
        <div className="grid w-full grid-cols-1 gap-px bg-gold md:grid-cols-[5fr_4fr_3fr] md:aspect-[12/5]">
          {window.map((frame, slot) => {
            const src = frames[frame];
            return (
              <div
                key={src}
                className="relative aspect-[16/9] w-full overflow-hidden bg-paper md:aspect-auto md:h-full"
              >
                <Image
                  src={src}
                  alt={`Divyafal gallery, image ${frame + 1} of ${total}`}
                  fill
                  sizes={PANEL_SIZES[slot]}
                  className="reveal-image object-cover object-center"
                  onError={() => setFailed(previous => new Set(previous).add(src))}
                />
              </div>
            );
          })}
        </div>
      </Reveal>

      {total > size && (
        <div className="grid-editorial mt-8">
          <Reveal
            delay={60}
            className="col-span-12 flex items-center justify-between md:col-span-10 md:col-start-2"
          >
            <p aria-live="polite" className="font-ui text-eyebrow uppercase text-ink-soft">
              {`${pad(first + 1)}–${pad(((first + size - 1) % total) + 1)} / ${pad(total)}`}
            </p>
            {/* Named for what they move, not just "Previous" / "Next". The In Her Words
                quotes have a pair of controls too, and a screen-reader user listing the
                homepage's controls met four of them under two names. Chrome, so the strings
                are inline rather than in `siteCopy`. */}
            <div className="flex items-center gap-8">
              <Button variant="quiet" onClick={() => step(-1)}>
                Previous frame
              </Button>
              <Button variant="quiet" onClick={() => step(1)}>
                Next frame
              </Button>
            </div>
          </Reveal>
        </div>
      )}
    </section>
  );
}
