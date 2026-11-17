import Button from '@/components/primitives/Button';
import DisplayHeading from '@/components/primitives/DisplayHeading';
import HairlineRule from '@/components/primitives/HairlineRule';
import Reveal from '@/components/primitives/Reveal';
import { siteCopy } from '@/lib/content/site-copy';

const { cards } = siteCopy.home.cta;
const academy = siteCopy.home.academy;

/**
 * Where each of the two invitations sits on the grid. They are deliberately not mirrored:
 * the first runs wide on the left, the second is narrower, starts further right and drops
 * below it, so the pair reads as a page being turned rather than two matched tiles.
 *
 * The drop halved in the density pass (40 -> 20). Unlike Movement 4's, this one *does* add to
 * the section's height, because the two invitations are near enough the same height that the
 * offset is pure addition — 160px of bare paper in the one movement on the page that carries
 * no photograph at all.
 */
const INVITATION_PLACEMENT = [
  'col-span-12 md:col-span-5 md:col-start-2',
  'col-span-12 mt-12 md:col-span-4 md:col-start-8 md:mt-20',
] as const;

/**
 * Movement 7 — the close, the last page of the lookbook.
 *
 * Two pastel promo cards used to stand here, each with a pill button, a pale icon disc and
 * a blurred colour blob behind it. They are type now. The first half is an invitation in
 * two lines, set on the paper ground the page has been using, each under its own gold
 * hairline with a small index numeral as the only apparatus. The second half is the
 * Virasat Academy as a full-bleed band on the ink ground: the one dark moment on the page
 * after the hero, so the page ends with weight before the footer's small type takes over.
 *
 * Each invitation is a stack of three reveals — heading, body, link — staggered in the
 * spec's 60ms step, with the second invitation starting one step in. The link is the
 * last thing in each stack and carries the last delay, so nothing that closes a line
 * arrives before the words it closes. Both halves are below the fold, so this is the
 * scroll-triggered `Reveal` throughout.
 *
 * On the ink band the soft ink used elsewhere for secondary copy would fall below the
 * contrast floor, so the band's type is all paper, and the link is the same text-and-rule
 * primitive with its colours turned for the dark ground. No text here is ever dimmed with
 * an opacity utility.
 *
 * Copy and destinations are verbatim from the retired components: the first link is the
 * WhatsApp number, the second is the store map, the band is `/virasat-academy`.
 */
export default function Close() {
  return (
    <>
      <section className="section-rhythm bg-paper">
        <div className="grid-editorial">
          {cards.map((card, index) => {
            const base = index * 60;
            return (
              <div key={card.title} className={INVITATION_PLACEMENT[index]}>
                <Reveal delay={base}>
                  <HairlineRule />
                  <p
                    aria-hidden="true"
                    className="mt-6 font-ui text-eyebrow uppercase text-ink-soft"
                  >
                    {String(index + 1).padStart(2, '0')}
                  </p>
                  <DisplayHeading level={2} size={3} className="mt-6">
                    {card.title}
                  </DisplayHeading>
                </Reveal>
                <Reveal delay={base + 60}>
                  <p className="measure mt-6 font-ui text-body text-ink-soft">{card.body}</p>
                </Reveal>
                <Reveal delay={base + 120} className="mt-8">
                  <Button href={card.href}>{card.cta}</Button>
                </Reveal>
              </div>
            );
          })}
        </div>
      </section>

      <section className="section-rhythm bg-ink text-paper">
        <div className="grid-editorial">
          <Reveal className="col-span-12 md:col-span-10 md:col-start-2">
            <HairlineRule />
            <DisplayHeading level={2} size={1} className="mt-8 text-paper md:mt-10">
              {academy.heading}
            </DisplayHeading>
          </Reveal>

          <Reveal
            delay={60}
            className="col-span-12 mt-8 md:col-span-5 md:col-start-7 md:mt-12"
          >
            <p className="measure font-ui text-body text-paper">{academy.body}</p>
          </Reveal>

          <Reveal delay={120} className="col-span-12 mt-8 md:col-span-5 md:col-start-7">
            <Button
              href={academy.href}
              className="text-paper hover:border-paper focus-visible:outline-paper"
            >
              {academy.cta}
            </Button>
          </Reveal>
        </div>
      </section>
    </>
  );
}
