import Link from 'next/link';
import Image from 'next/image';
import HairlineRule from '@/components/primitives/HairlineRule';
import Reveal from '@/components/primitives/Reveal';
import { siteCopy } from '@/lib/content/site-copy';

const { footer } = siteCopy;
const { values } = siteCopy.home;

/** Small uppercase label over a footer column. An h3: the page's h2s are the movements above. */
const COLUMN_HEADING = 'm-0 font-ui text-eyebrow font-normal uppercase text-ink-soft';

const LINK =
  'inline-block border-b border-transparent py-1 font-ui text-caption text-ink-soft ' +
  'transition-colors duration-300 hover:border-gold hover:text-ink motion-reduce:transition-none ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink';

const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

/**
 * An entry that links when it has a destination and is plain text when it does not. Some of
 * the entries carry no destination (`href: ''`): the words are kept, but a link that goes
 * nowhere is worse than no link, so they are set as text.
 */
function FooterLink({ label, href }: { label: string; href: string }) {
  if (href === '') {
    return <span className="inline-block py-1 font-ui text-caption text-ink-soft">{label}</span>;
  }
  return EXTERNAL.test(href) ? (
    <a href={href} className={LINK}>
      {label}
    </a>
  ) : (
    <Link href={href} className={LINK}>
      {label}
    </Link>
  );
}

/**
 * The footer — the last of the page's small type, and the place the six values now live.
 *
 * It has three tiers on the editorial grid, divided by gold hairlines rather than boxes:
 *
 *  1. The house: the logo and the brand line on columns 2–6, and how to reach it
 *     (address, telephone, e-mail) on columns 8–11.
 *  2. The values: all six statements, set small in a single column on columns 2–6 — title
 *     in the display family, statement beneath it in soft ink — with the quick links
 *     standing opposite them on columns 8–11. The values used to be a section of their
 *     own with a heading, an icon each and a card each; here they are a list.
 *  3. The imprint: copyright with the current year on the left, the policies on the right.
 *
 * The ground is the deeper paper so the footer separates from the ink band above it
 * without a rule. Everything is `ink` or `ink-soft` on paper — no grey, no opacity on type.
 *
 * Social links render only for URLs present in `siteCopy.footer.social`, which is empty:
 * the owner has supplied no profile addresses, and the old markup's icons pointed at `#`.
 * When there are some they are set as text links, not icons.
 *
 * Contact details are the real ones, and the telephone's display string is rendered
 * exactly as stored — its invisible characters are deliberate and pinned by a test.
 */
export default function Footer() {
  return (
    <footer className="bg-paper-deep pt-[var(--section-rhythm)] pb-10">
      <div className="grid-editorial">
        <Reveal className="col-span-12 md:col-span-5 md:col-start-2">
          <Link
            href="/"
            className="inline-block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
          >
            <Image
              src={footer.brand.logo}
              alt={footer.brand.logoAlt}
              width={180}
              height={60}
              className="h-12 w-auto"
            />
          </Link>
          <p className="measure mt-8 font-ui text-caption text-ink-soft">{footer.brand.body}</p>
        </Reveal>

        <Reveal
          delay={60}
          className="col-span-12 mt-12 md:col-span-4 md:col-start-8 md:mt-0"
        >
          <h3 className={COLUMN_HEADING}>{footer.contact.heading}</h3>
          <address className="mt-6 flex flex-col items-start gap-1 not-italic">
            <p className="m-0 font-ui text-caption text-ink-soft">{footer.contact.address}</p>
            <a href={`tel:${footer.contact.phone}`} className={LINK}>
              {footer.contact.phoneDisplay}
            </a>
            <a href={`mailto:${footer.contact.email}`} className={`${LINK} break-all`}>
              {footer.contact.email}
            </a>
          </address>
          {footer.social.length > 0 && (
            <ul aria-label="Social" className="m-0 mt-4 flex list-none gap-6 p-0">
              {footer.social.map(item => (
                <li key={item.label}>
                  <a href={item.href} className={LINK}>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Reveal>

        <div className="col-span-12 mt-16 md:col-span-10 md:col-start-2 md:mt-24">
          <HairlineRule />
        </div>

        <Reveal className="col-span-12 mt-12 md:col-span-5 md:col-start-2">
          <h3 id="footer-values" className={COLUMN_HEADING}>
            {values.heading}
          </h3>
          <ul aria-labelledby="footer-values" className="m-0 mt-8 flex list-none flex-col gap-6 p-0">
            {values.items.map(item => (
              <li key={item.title}>
                <p className="m-0 font-display text-body font-light text-ink">{item.title}</p>
                <p className="m-0 mt-1 font-ui text-caption text-ink-soft">{item.body}</p>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal
          delay={60}
          className="col-span-12 mt-12 md:col-span-4 md:col-start-8"
        >
          <h3 className={COLUMN_HEADING}>{footer.quickLinks.heading}</h3>
          <ul className="m-0 mt-6 flex list-none flex-col items-start gap-1 p-0">
            {footer.quickLinks.items.map(item => (
              <li key={item.label}>
                <FooterLink label={item.label} href={item.href} />
              </li>
            ))}
          </ul>
        </Reveal>

        <div className="col-span-12 mt-16 md:col-span-10 md:col-start-2 md:mt-24">
          <HairlineRule />
          <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-baseline md:justify-between">
            <p className="m-0 font-ui text-caption text-ink-soft">
              {`© ${new Date().getFullYear()} ${footer.legal.copyright}`}
            </p>
            <ul className="m-0 flex list-none flex-wrap gap-x-8 gap-y-1 p-0">
              {footer.legal.items.map(item => (
                <li key={item.label}>
                  <FooterLink label={item.label} href={item.href} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
