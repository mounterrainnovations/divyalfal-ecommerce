import Button from '@/components/primitives/Button';
import DisplayHeading from '@/components/primitives/DisplayHeading';
import Footer from '@/components/layout/footer';
import HairlineRule from '@/components/primitives/HairlineRule';
import { siteCopy } from '@/lib/content/site-copy';

const copy = siteCopy.product.notFound;

/**
 * The product route's 404.
 *
 * The pre-revamp page opened with a `w-24 h-24 bg-gray-200 rounded-full` avatar circle around
 * a package glyph -- a pill and a flat grey, both banned -- over a `bg-gray-50` ground. The
 * glyph is gone rather than restyled: it carried no information the heading does not, and the
 * design system has no decorative-icon shape. Words are `siteCopy.product.notFound`, verbatim.
 *
 * Both actions are links, so this is a server component; nothing here needs the browser.
 *
 * The footer is `headingLevel={2}`: its columns are `h3`s on every route with `h2` movements
 * of its own, and a page whose only heading is its `h1` skips a level by rendering them (axe
 * `heading-order`, measured at the gate). The same note is on `app/not-found.tsx`.
 */
export default function ProductNotFound() {
  return (
    <>
      <header className="grid-editorial pt-16 pb-12 md:pt-24 md:pb-16">
        <div className="col-span-12 md:col-span-7 md:col-start-2">
          <DisplayHeading level={1} size={1} className="reveal-text text-balance">
            {copy.heading}
          </DisplayHeading>
          <p className="measure reveal-text mt-8 font-display text-body font-light text-ink">
            {copy.body}
          </p>
          <div className="mt-12 flex flex-wrap items-center gap-x-10 gap-y-6">
            <Button href="/products">{copy.browseCta}</Button>
            <Button variant="quiet" href="/">
              {copy.homeCta}
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
