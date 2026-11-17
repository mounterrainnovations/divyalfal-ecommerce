'use client';

import Image from 'next/image';
import { useState } from 'react';
import Button from '@/components/primitives/Button';
import DisplayHeading from '@/components/primitives/DisplayHeading';
import HairlineRule from '@/components/primitives/HairlineRule';
import Reveal from '@/components/primitives/Reveal';
import { siteCopy } from '@/lib/content/site-copy';
import { cn } from '@/lib/utils';

/**
 * Both photographs sit in a four-column slot, so they share one set of measured widths above
 * `md` and differ only in how wide they are on a phone: the quote's partner is eight of twelve
 * columns (it is paired with the quote even when stacked), the About photograph is full width.
 * Measured in Chrome at both edges of every band rather than read off the class names:
 *
 *   quote photo:  390 -> 232px;  767 -> 455px;  768 -> 224px;  1023 -> 309px;
 *                 1024 -> 277px; 1439 -> 416px; 1440 -> 416px
 *   About photo:  390 -> 342px;  767 -> 719px;  and the same four-column figures from 768 up
 *
 * The 768-1023 band is widest at its top, not at the breakpoint: the gutter doubles at 1024,
 * so a four-column slot is narrower at 1024 than at 1023.
 */
const FOUR_COLUMNS = '(min-width: 1440px) 416px, (min-width: 1024px) 29vw, (min-width: 768px) 31vw';
const QUOTE_PHOTO_SIZES = `${FOUR_COLUMNS}, calc(67vw - 32px)`;
const ABOUT_PHOTO_SIZES = `${FOUR_COLUMNS}, calc(100vw - 48px)`;

const pad = (value: number) => String(value).padStart(2, '0');

/**
 * Movement 6 — In Her Words: one customer, large, then the house she is speaking of.
 *
 * Five testimonials and the About section used to be two sections of cards. They are one
 * movement now: a single quote set at display size 2 in Fraunces, with the customer's
 * photograph beside it, and under it the About paragraph and both figures. The quote earns
 * the claim the paragraph then makes.
 *
 * **One quote at a time, advanced by explicit control only.** No timer, no carousel
 * physics, no swipe handler: Previous and Next are native buttons (focusable, Enter and
 * Space both work, a visible focus ring from the primitive), and the quote sits in a
 * polite live region so a change is announced without stealing focus. An auto-rotating
 * quote would take reading time away from the reader, and the spec rules out anything that
 * has to be learned. The two controls wrap, so every quote is at most one press from the
 * start, and the numeral beside them says where the reader is.
 *
 * **The quotes are unattributed, so nothing is attributed.** All five entries carry
 * `name: ''` — the owner has no names to give — and a test pins that no entry gains one.
 * There is no byline, no dash-led credit and no figcaption for a name to be missing from;
 * the numeral (`01 / 05`) is the only thing under the quote, which reads as an index rather
 * than as a speaker's absence. The five identical orange star rows are gone for the same
 * reason: five out of five on every card, with no one to say it, carried no information.
 *
 * **The customer photographs are decorative (`alt=""`).** They sit beside the quote that
 * belongs to them and add nothing a listener needs: the words carry the testimonial, and
 * describing each photograph would mean inventing a description the copy does not hold. The
 * About photograph is a different case — it is not accompanied by words that describe it —
 * so it keeps the copy module's alt text.
 *
 * Only the current quote and its photograph are in the DOM, keyed so each change replays the
 * CSS reveal. That reveal is applied only after the reader has pressed a control, never on
 * the first render, where `Reveal` already owns the block's entrance.
 *
 * Both headings are `h2`; the page's `h1` is the hero wordmark. The prose stays at full
 * strength — `text-ink-soft` is ~5.5:1 on paper and any opacity utility on it would break
 * AA — and the stats are plain figures with a gold hairline above each, not floating cards.
 */
export default function InHerWords() {
  const quotes = siteCopy.home.testimonials;
  const { about } = siteCopy.home;
  const [index, setIndex] = useState(0);
  const [advanced, setAdvanced] = useState(false);

  const total = quotes.length;
  const entry = quotes[index];

  const step = (by: number) => {
    setIndex(current => (current + by + total) % total);
    setAdvanced(true);
  };

  return (
    <section className="section-rhythm bg-paper">
      <div className="grid-editorial">
        <Reveal className="col-span-12 md:col-span-6 md:col-start-2">
          <DisplayHeading level={2} size={3}>
            {siteCopy.home.testimonialsHeading}
          </DisplayHeading>
        </Reveal>
      </div>

      <div className="grid-editorial mt-10 md:mt-12">
        <Reveal delay={60} className="col-span-12 md:col-span-7 md:col-start-2">
          <HairlineRule className="w-16" />
          <div aria-live="polite" aria-atomic="true" className="mt-8 md:mt-12">
            <figure key={index} className={cn('m-0', advanced && 'reveal-text')}>
              <blockquote className="m-0 font-display text-display-2 font-light text-ink leading-[1.15]">
                {entry.quote}
              </blockquote>
            </figure>
          </div>

          <div className="mt-10 flex items-center gap-8 md:mt-14">
            <p className="font-ui text-eyebrow uppercase text-ink-soft">
              {`${pad(index + 1)} / ${pad(total)}`}
            </p>
            {/* Named for what they move. The Atelier gallery above has its own pair, and
                "Previous" / "Next" twice on one page left a screen-reader user listing the
                controls unable to tell the photographs from the quotes. Chrome, so inline. */}
            <Button variant="quiet" onClick={() => step(-1)}>
              Previous quote
            </Button>
            <Button variant="quiet" onClick={() => step(1)}>
              Next quote
            </Button>
          </div>
        </Reveal>

        <Reveal
          delay={120}
          className="col-span-8 col-start-5 mt-10 md:col-span-4 md:col-start-9 md:mt-0"
        >
          <div
            key={index}
            className={cn(
              'relative aspect-[2/3] w-full overflow-hidden bg-paper-deep',
              advanced && 'reveal-image'
            )}
          >
            {/* Decorative: the quote beside it is the whole of the testimonial. */}
            <Image
              src={entry.image}
              alt=""
              fill
              sizes={QUOTE_PHOTO_SIZES}
              className="object-cover"
            />
          </div>
        </Reveal>
      </div>

      <Reveal className="grid-editorial mt-16 md:mt-16">
        <HairlineRule className="col-span-12 md:col-span-10 md:col-start-2" />
      </Reveal>

      <div className="grid-editorial mt-12 items-end gap-y-10 md:mt-14 md:gap-y-0">
        <Reveal className="col-span-12 md:col-span-4 md:col-start-2">
          <div className="relative aspect-[2/3] w-full overflow-hidden bg-paper-deep">
            <Image
              src={about.image}
              alt={about.imageAlt}
              fill
              sizes={ABOUT_PHOTO_SIZES}
              className="object-cover"
            />
          </div>
        </Reveal>

        <Reveal delay={60} className="col-span-12 md:col-span-5 md:col-start-7">
          <DisplayHeading level={2} size={3}>
            {about.heading}
          </DisplayHeading>
          <p className="measure mt-8 font-ui text-body text-ink-soft">{about.body}</p>

          <div className="mt-14 grid grid-cols-2 gap-8">
            {about.stats.map(stat => (
              <div key={stat.label} className="border-t border-gold pt-5">
                <p className="font-display text-display-3 font-light text-ink">{stat.value}</p>
                <p className="mt-2 font-ui text-caption text-ink-soft">{stat.label}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
