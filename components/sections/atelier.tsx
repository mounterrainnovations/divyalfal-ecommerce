'use client';

import Image from 'next/image';
import { useState } from 'react';
import Button from '@/components/primitives/Button';
import Reveal from '@/components/primitives/Reveal';
import { useSlideshowImages } from '@/lib/hooks/useSlideshowImages';

/**
 * The frame, shared by the placeholder and the live stage so the page below never jumps when
 * the request settles: 4:3 on a phone, 16:9 from `md`, never taller than the viewport.
 */
const FRAME = 'w-full aspect-[4/3] md:aspect-[16/9] md:max-h-[88svh]';

const pad = (value: number) => String(value).padStart(2, '0');

/**
 * Movement 5 — the atelier, as one full-bleed photograph at a time.
 *
 * The retired slideshow sat a boxed, corner-rounded frame on a grey ground, a thousand
 * pixels wide, and advanced itself every 3.5 seconds. This is edge to edge on the paper
 * ground, with the photograph as the whole of the movement and nothing laid over it.
 *
 * **It advances by explicit control only.** A gallery that moves on a timer needs a pause
 * control to be usable, takes the reading position away from anyone slower than the timer,
 * and is the kind of thing the spec's no-scroll-jacking rule exists to rule out. Previous
 * and Next are plain text buttons in the primitives' voice, native and so keyboard-operable
 * with a visible focus ring; the position is read out politely. There is no timer here at
 * all, so there is also nothing to subscribe to `prefers-reduced-motion` for — the frame
 * change is a CSS image reveal, which the global reduced-motion rule already flattens.
 *
 * **One frame in the DOM.** The folder holds six photographs of up to 5000px, and stacking
 * them all (as the old slideshow did) downloads all of them whether or not anyone advances.
 * Only the current frame renders, keyed so the reveal plays on each change.
 *
 * **When there is nothing to show, there is nothing on the page.** An empty list, an error
 * body, a non-OK response and a rejected fetch all end in `null` — see
 * `lib/hooks/useSlideshowImages`, which logs which one it was. The retired component fell
 * back to `fallback.jpg`, but that file sits in the same folder the route reads, so it is
 * already one of the frames whenever the folder is readable; when it is not, a lone
 * stand-in photograph would only pass for a gallery.
 *
 * A frame that fails to load is dropped from the set rather than left as a broken image, and
 * if that empties the set the movement disappears too. A single remaining frame gets no
 * controls and no counter.
 *
 * Movement 5 is below the fold, so the stagger is `Reveal` with the spec's 60ms step.
 */
export default function Atelier() {
  const { status, images } = useSlideshowImages();
  const [index, setIndex] = useState(0);
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

  // A dropped frame can leave the saved index past the end.
  const current = Math.min(index, frames.length - 1);
  const src = frames[current];
  const total = frames.length;

  const step = (by: number) => setIndex((current + by + total) % total);

  return (
    <section className="section-rhythm bg-paper-deep" aria-label="Gallery">
      <Reveal>
        <div className={`relative overflow-hidden bg-paper ${FRAME}`}>
          <div key={src} className="reveal-image absolute inset-0">
            <Image
              src={src}
              alt={`Divyafal gallery, image ${current + 1} of ${total}`}
              fill
              sizes="100vw"
              className="object-cover object-center"
              onError={() => setFailed(previous => new Set(previous).add(src))}
            />
          </div>
        </div>
      </Reveal>

      {total > 1 && (
        <div className="grid-editorial mt-8">
          <Reveal
            delay={60}
            className="col-span-12 flex items-center justify-between md:col-span-10 md:col-start-2"
          >
            <p aria-live="polite" className="font-ui text-eyebrow uppercase text-ink-soft">
              {`${pad(current + 1)} / ${pad(total)}`}
            </p>
            <div className="flex items-center gap-8">
              <Button variant="quiet" onClick={() => step(-1)}>
                Previous
              </Button>
              <Button variant="quiet" onClick={() => step(1)}>
                Next
              </Button>
            </div>
          </Reveal>
        </div>
      )}
    </section>
  );
}
