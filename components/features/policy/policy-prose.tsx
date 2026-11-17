import type { ReactNode } from 'react';
import Link from 'next/link';
import DisplayHeading from '@/components/primitives/DisplayHeading';
import HairlineRule from '@/components/primitives/HairlineRule';
import { cn } from '@/lib/utils';

/**
 * Type-setting for the two policy pages. Every word is handed in from `siteCopy`; this file
 * only decides how it sits on the page. Sections are a hairline, a display heading in the
 * left columns and a measure-capped reading column on the right.
 */

const LINK =
  'text-ink underline decoration-gold underline-offset-4 transition-colors duration-300 ' +
  'hover:decoration-ink motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 ' +
  'focus-visible:outline-offset-4 focus-visible:outline-ink';

const EMAIL = String.raw`[\w.+-]+@[\w-]+(?:\.[\w-]+)+`;
const PHONE = String.raw`\+91\d{10}`;
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Sets a string from the copy module, turning what is already inside it into marks: an
 * email address becomes a `mailto:` link, a `+91` number a `tel:` link, each phrase in
 * `strong` is emboldened and each key of `links` becomes a link to its value. A `+91` number is
 * printed as `phoneDisplay` when one is given, so a document shows its phone one way only.
 * Nothing else is added to the text, so the rendered characters are the stored characters.
 */
export function RichText({
  children,
  strong = [],
  links = {},
  phoneDisplay,
}: {
  children: string;
  strong?: string[];
  links?: Record<string, string>;
  /** How a `+91` number is printed; the number itself stays the `tel:` target. */
  phoneDisplay?: string;
}) {
  const phrases = [...strong, ...Object.keys(links)].map(escape);
  const splitter = new RegExp(`(${[...phrases, EMAIL, PHONE].join('|')})`);
  const email = new RegExp(`^${EMAIL}$`);
  const phone = new RegExp(`^${PHONE}$`);

  return (
    <>
      {children.split(splitter).map((part, index) => {
        if (index % 2 === 0) return part;
        if (strong.includes(part)) {
          return (
            <strong key={index} className="font-medium">
              {part}
            </strong>
          );
        }
        if (part in links) {
          return (
            <Link key={index} href={links[part]} className={LINK}>
              {part}
            </Link>
          );
        }
        if (email.test(part)) {
          return (
            <a key={index} href={`mailto:${part}`} className={LINK}>
              {part}
            </a>
          );
        }
        if (phone.test(part)) {
          return (
            <a key={index} href={`tel:${part}`} className={LINK}>
              {phoneDisplay ?? part}
            </a>
          );
        }
        return part;
      })}
    </>
  );
}

/** Page head: the one h1 and a short line beneath it. */
export function PolicyHeader({ heading, subheading }: { heading: string; subheading: string }) {
  return (
    <header className="grid-editorial pt-16 pb-12 md:pt-24 md:pb-16">
      <div className="col-span-12 md:col-span-9">
        <DisplayHeading level={1} size={2} className="reveal-text text-balance">
          {heading}
        </DisplayHeading>
        <p className="measure reveal-text mt-6 font-display text-body font-light text-ink-soft">
          {subheading}
        </p>
      </div>
    </header>
  );
}

/**
 * One section. With a heading it is an h2 across the left columns; without one (the
 * introduction) the reading column sits where it would, so the prose keeps one left edge.
 */
export function PolicySection({
  heading,
  children,
}: {
  heading?: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="grid-editorial">
        <HairlineRule className="col-span-12" />
      </div>
      <div className="grid-editorial gap-y-6 py-10 md:py-14">
        {heading ? (
          <DisplayHeading level={2} size={3} className="col-span-12 text-balance md:col-span-5">
            {heading}
          </DisplayHeading>
        ) : null}
        <div className="measure col-span-12 space-y-5 font-ui text-body text-ink md:col-span-6 md:col-start-7">
          {children}
        </div>
      </div>
    </section>
  );
}

export function PolicyList({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5 marker:text-gold">{children}</ul>;
}

export function PolicySteps({ children }: { children: ReactNode }) {
  return <ol className="list-decimal space-y-4 pl-6 marker:text-ink-soft">{children}</ol>;
}

/**
 * A labelled note: a gold hairline down its left edge, never a coloured box. A `note`, not an
 * `aside`: it is inline to its section, not complementary page content, and an `aside` inside
 * `main` is a landmark.
 */
export function Callout({
  emoji,
  heading,
  children,
}: {
  emoji: string;
  heading: string;
  children: ReactNode;
}) {
  return (
    <div role="note" className="border-l border-gold py-1 pl-6">
      <p className="mb-2 font-medium">
        <span aria-hidden="true">{emoji}</span> {heading}
      </p>
      <p>{children}</p>
    </div>
  );
}

/** Definition list of contact details, on the deeper paper tone. */
export function ContactCard({
  rows,
}: {
  rows: { label: string; value: ReactNode }[];
}) {
  return (
    <dl className="bg-paper-deep p-6 md:p-8">
      {rows.map((row, index) => (
        <div key={row.label} className={cn('md:flex md:gap-4', index > 0 && 'mt-4')}>
          <dt className="font-medium md:w-40 md:shrink-0">{row.label}</dt>
          {/* `min-w-0` and `break-words` together: a flex item's floor is its min-content
              width, and `divyafalthecreations@gmail.com` is one 29-character token, so at
              768 the row measured 820px against a 768px viewport and the page scrolled
              sideways. `min-w-0` lets the item shrink; `break-words` gives the address
              somewhere to break once it has. */}
          <dd className="m-0 min-w-0 break-words">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The closing line, set small beneath a hairline. */
export function PolicyFooter({ children }: { children: string }) {
  return (
    <div>
      <div className="grid-editorial">
        <HairlineRule className="col-span-12" />
      </div>
      <div className="grid-editorial py-10 md:py-14">
        <p className="col-span-12 font-ui text-caption text-ink-soft">{children}</p>
      </div>
    </div>
  );
}

/** A `tel:` link whose printed form (with its bidi marks) differs from its dialled form. */
export function PhoneLink({ dial, display }: { dial: string; display: string }) {
  return (
    <a href={`tel:${dial}`} className={LINK}>
      {display}
    </a>
  );
}
