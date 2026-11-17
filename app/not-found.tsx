'use client';

import Button from '@/components/primitives/Button';
import DisplayHeading from '@/components/primitives/DisplayHeading';
import Eyebrow from '@/components/primitives/Eyebrow';
import Footer from '@/components/layout/footer';
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
 * The footer is `headingLevel={2}`, not the default 3. Its three column labels are `h3`s on
 * every route whose own content is an `h1` followed by `h2` movements; this page's only
 * heading is its `h1`, so `h3` skipped a level and axe reported `heading-order` at 1440, 768
 * and 390. Two is the level this page can carry. The alternative tried first -- dropping the
 * footer -- also cleared the violation, but took the quick links, the real contact details
 * and the way back off the page where a lost visitor most needs them.
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

      <Footer headingLevel={2} />
    </>
  );
}
