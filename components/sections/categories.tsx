import Link from 'next/link';
import DisplayHeading from '@/components/primitives/DisplayHeading';
import HairlineRule from '@/components/primitives/HairlineRule';
import Reveal from '@/components/primitives/Reveal';
import { CATEGORY_CONFIG } from '@/lib/common/product-interfaces';
import { siteCopy } from '@/lib/content/site-copy';

/**
 * Movement 2 — the collections index.
 *
 * A typographic index, not a widget. The pre-revamp section was six 88px avatar circles in
 * a horizontal snap-scroller: a store's category chips. Here each collection is simply its
 * own name set at display-3, one per line, left-aligned on the grid, with a gold hairline
 * above each row and one closing the set. Gold stays what the system says it is — a
 * hairline, never a fill.
 *
 * Composition, and the language Movements 3–5 inherit: heading on columns 2–7, the index
 * on columns 2–10 below it. The right two columns stay empty on purpose, so the page has a
 * consistent asymmetry rather than a centred block. Rows are tall (not dense), the only
 * hover is an 8px rightward shift of the name, and the small index numeral is the single
 * piece of apparatus — `aria-hidden`, so it never enters a link's accessible name.
 *
 * Names and hrefs are unchanged. `CATEGORY_CONFIG` stays the source of the six entries
 * because it is also what `/products` filters against, and the href keeps the plural
 * `?categories=<display name>` form that `app/products/page.tsx` parses — a singular
 * `?category=` would silently filter nothing. A test pins both.
 *
 * Below the fold, so `Reveal` (scroll-triggered) with the spec's 60ms stagger per row.
 */
const categories = CATEGORY_CONFIG;

export default function Categories() {
  return (
    <section className="section-rhythm bg-paper">
      <div className="grid-editorial">
        <Reveal className="col-span-12 md:col-span-6 md:col-start-2">
          <DisplayHeading level={2} size={2}>
            {siteCopy.home.categories.heading}
          </DisplayHeading>
        </Reveal>

        <div className="col-span-12 mt-12 md:col-span-9 md:col-start-2 md:mt-20">
          <ul className="m-0 list-none p-0">
            {categories.map((cat, index) => (
              <Reveal as="li" key={cat.name} delay={index * 60}>
                <HairlineRule />
                <Link
                  href={`/products?categories=${encodeURIComponent(cat.name)}`}
                  className="group flex items-baseline justify-between gap-6 py-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink md:py-8"
                >
                  <DisplayHeading
                    level={3}
                    size={3}
                    className="transition-transform duration-500 ease-out group-hover:translate-x-2 group-focus-visible:translate-x-2 motion-reduce:transition-none"
                  >
                    {cat.name}
                  </DisplayHeading>
                  <span
                    aria-hidden="true"
                    className="font-ui text-eyebrow text-ink-soft transition-colors duration-500 group-hover:text-ink group-focus-visible:text-ink motion-reduce:transition-none"
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </Link>
              </Reveal>
            ))}
          </ul>
          <HairlineRule />
        </div>
      </div>
    </section>
  );
}
