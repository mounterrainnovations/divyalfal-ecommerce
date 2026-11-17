'use client';

import Button from '@/components/primitives/Button';
import DisplayHeading from '@/components/primitives/DisplayHeading';
import Eyebrow from '@/components/primitives/Eyebrow';
import HairlineRule from '@/components/primitives/HairlineRule';
import { siteCopy } from '@/lib/content/site-copy';

const copy = siteCopy.notFound;

/**
 * The site-wide 404, on the same editorial grid as every other route.
 *
 * The pre-revamp page was a centred grey card: `bg-gray-50` ground, a `text-9xl` numeral in
 * `text-gray-900`, and two `rounded-lg` filled buttons. Every one of those is in the banned
 * vocabulary `test/no-legacy-styles.test.ts` now guards, so the page is rebuilt from the
 * tokens: paper ground, the numeral as a quiet eyebrow above the heading rather than the
 * loudest thing on the page, and the two actions as `Button` text-plus-rule.
 *
 * Words are unchanged -- all five strings are `siteCopy.notFound`, transcribed verbatim.
 *
 * `'use client'` stays: "Go Back" calls `window.history.back()`, which needs the browser. It
 * is a `<button>`, not a link, because there is no href for "wherever you came from".
 *
 * No `Footer`, as before the revamp, and that is a measured decision rather than an omission.
 * The footer's three columns are `h3`s, which read correctly on every route that has `h2`
 * sections above them; this page has only its own `h1`, so a footer here skips a level and
 * axe reports `heading-order` (it did, at 1440, 768 and 390, before the footer came out).
 * There is no second heading to add without inventing copy, and the two ways out are the
 * whole job of a dead end. If the footer is ever wanted here, give it a `headingLevel` prop
 * rather than adding a heading to this page.
 */
export default function NotFound() {
  return (
    <>
      <header className="grid-editorial pt-16 pb-12 md:pt-24 md:pb-16">
        <div className="col-span-12 md:col-span-7 md:col-start-2">
          <Eyebrow className="reveal-text">{copy.code}</Eyebrow>
          <DisplayHeading level={1} size={1} className="reveal-text mt-6 text-balance">
            {copy.heading}
          </DisplayHeading>
          <p className="measure reveal-text mt-8 font-display text-body font-light text-ink">
            {copy.body}
          </p>
          <div className="mt-12 flex flex-wrap items-center gap-x-10 gap-y-6">
            <Button href="/">{copy.homeCta}</Button>
            <Button variant="quiet" onClick={() => window.history.back()}>
              {copy.backCta}
            </Button>
          </div>
        </div>
      </header>

      <div className="grid-editorial">
        <HairlineRule className="col-span-12" />
      </div>
    </>
  );
}
