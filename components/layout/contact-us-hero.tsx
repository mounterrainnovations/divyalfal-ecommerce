import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import DisplayHeading from '@/components/primitives/DisplayHeading';
import { siteCopy } from '@/lib/content/site-copy';

const { hero } = siteCopy.contact;

const CRUMB_LINK =
  'text-ink-soft underline decoration-transparent underline-offset-4 transition-colors duration-300 ' +
  'hover:text-ink hover:decoration-gold motion-reduce:transition-none ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink';

/** Breadcrumb and the page's one h1, set at the top of the paper. */
const ContactUsHero = () => {
  return (
    <section className="grid-editorial pt-12 pb-12 md:pt-16 md:pb-16">
      <div className="col-span-12 md:col-span-9">
        <nav aria-label="Breadcrumb" className="reveal-text">
          <ol className="m-0 flex list-none items-center gap-2 p-0 font-ui text-caption text-ink-soft">
            {hero.breadcrumb.map((crumb, index) => (
              <li key={crumb.label} className="flex items-center gap-2">
                {index > 0 ? <ChevronRight aria-hidden="true" className="h-3 w-3" /> : null}
                {crumb.href ? (
                  <Link href={crumb.href} className={CRUMB_LINK}>
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="text-ink">
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <DisplayHeading level={1} size={1} className="reveal-text mt-8 text-balance">
          {hero.heading}
        </DisplayHeading>
      </div>
    </section>
  );
};

export default ContactUsHero;
