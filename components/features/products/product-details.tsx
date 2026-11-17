'use client';

import { useId, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';
import Button from '@/components/primitives/Button';
import DisplayHeading from '@/components/primitives/DisplayHeading';
import Eyebrow from '@/components/primitives/Eyebrow';
import { siteCopy } from '@/lib/content/site-copy';
import { discountPercent, resolvePrice } from '@/lib/utils/price';
import { parseSpecifications } from '@/lib/utils/specifications';
import type { SpecBlock } from '@/lib/utils/specifications';
import type { Product } from '@/types';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL'];

/** The boutique's WhatsApp number, from the same contact details the footer prints. */
const WHATSAPP_NUMBER = siteCopy.footer.contact.phone.replace(/\D/g, '');

const FOCUS =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink';

/**
 * The enquiry the primary action opens. The product's name is always in it; a size only when
 * the visitor chose one, because the page must not put a size in their mouth.
 */
function enquiryHref(name: string, size: string | null): string {
  const about = size ? `"${name.trim()}" in size ${size}` : `"${name.trim()}"`;
  const message = `Hello, I would like to enquire about ${about}.`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

/** A native disclosure: no script, keyboard and screen-reader behaviour for free. */
function Disclosure({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <details className="group border-t border-gold last:border-b">
      <summary
        className={`flex cursor-pointer list-none items-center justify-between gap-4 py-4 [&::-webkit-details-marker]:hidden ${FOCUS}`}
      >
        <h2 className="font-display text-body font-light text-ink">{heading}</h2>
        <Plus
          size={16}
          strokeWidth={1.5}
          aria-hidden="true"
          className="shrink-0 text-ink transition-transform duration-300 group-open:rotate-45 motion-reduce:transition-none"
        />
      </summary>
      <div className="flex flex-col gap-3 pb-6 font-ui text-caption text-ink-soft">{children}</div>
    </details>
  );
}

/**
 * The specifications as a definition list. Consecutive term/detail groups share one `<dl>`;
 * prose with no term above it stays a paragraph. Everything is a React text node, so nothing
 * the editor stored can be interpreted as markup.
 */
function Specifications({ blocks }: { blocks: SpecBlock[] }) {
  const out: ReactNode[] = [];
  let groups: Extract<SpecBlock, { type: 'group' }>[] = [];

  const flushGroups = (key: string) => {
    if (groups.length === 0) return;
    out.push(
      <dl key={key} className="flex flex-col gap-5">
        {groups.map((group, g) => (
          <div key={g} className="flex flex-col gap-1">
            <dt className="font-ui text-eyebrow font-normal uppercase text-ink">{group.term}</dt>
            {group.details.map((detail, d) => (
              <dd key={d} className="m-0 font-ui text-caption text-ink-soft">
                {detail}
              </dd>
            ))}
          </div>
        ))}
      </dl>
    );
    groups = [];
  };

  blocks.forEach((block, index) => {
    if (block.type === 'group') {
      groups.push(block);
      return;
    }
    flushGroups(`dl-${index}`);
    out.push(
      <p key={`p-${index}`} className="font-ui text-caption text-ink-soft">
        {block.text}
      </p>
    );
  });
  flushGroups('dl-end');

  return <div className="flex flex-col gap-5">{out}</div>;
}

interface ProductDetailsProps {
  product: Product;
}

const ProductDetails = ({ product }: ProductDetailsProps) => {
  const [size, setSize] = useState<string | null>(null);
  const sizeGroup = useId();
  const sizeOptionsRef = useRef<HTMLDivElement>(null);
  const { display, compareAt, onSale } = resolvePrice(product);
  const percent = discountPercent(product);
  const blocks = useMemo(() => parseSpecifications(product.specifications), [product.specifications]);
  const copy = siteCopy.product;

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-4">
        <Eyebrow>{product.category}</Eyebrow>
        <DisplayHeading level={1} size={3}>
          {product.name}
        </DisplayHeading>
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-ui text-body">
          <span className={onSale ? 'text-sale' : 'text-ink'}>{display}</span>
          {compareAt ? (
            <s className="text-ink-soft">
              <span className="sr-only">Original price </span>
              {compareAt}
            </s>
          ) : null}
          {onSale ? (
            <span className="font-ui text-eyebrow uppercase text-sale">
              On sale · {percent}% off
            </span>
          ) : null}
        </p>
      </header>

      <div className="flex flex-col gap-8">
        <fieldset className="relative m-0 min-w-0 border-0 p-0">
          <legend className="mb-3 p-0 font-ui text-eyebrow font-normal uppercase text-ink-soft">
            Size
          </legend>
          <div ref={sizeOptionsRef} className="flex flex-wrap gap-x-2 gap-y-1">
            {SIZES.map(option => (
              <label key={option} className="relative cursor-pointer">
                <input
                  type="radio"
                  name={sizeGroup}
                  value={option}
                  checked={size === option}
                  onChange={() => setSize(option)}
                  className="peer sr-only"
                />
                <span className="flex min-h-11 min-w-11 items-center justify-center border-b border-transparent px-2 font-ui text-caption text-ink-soft transition-colors duration-300 hover:text-ink peer-checked:border-gold peer-checked:text-ink peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink motion-reduce:transition-none">
                  {option}
                </span>
              </label>
            ))}
          </div>
          {/* Radios cannot be unselected, so a chosen size needs its own way back. Positioned
              over the legend row so it appearing never moves the controls below.

              This is the one control on the page that unmounts itself when activated, so it
              has to hand focus somewhere first: without this, a keyboard or screen-reader user
              who clears the size is dropped on `<body>` and has to tab in from the top of the
              document again (WCAG 2.4.3). Focus goes to the first radio -- where an unchecked
              group's tab stop sits anyway -- and `.focus()` runs before `setSize`, so the
              focused element is already elsewhere by the time this button is removed. */}
          {size ? (
            <Button
              variant="quiet"
              onClick={() => {
                sizeOptionsRef.current?.querySelector<HTMLInputElement>('input[type="radio"]')?.focus();
                setSize(null);
              }}
              className="absolute right-0 top-0"
            >
              Clear size
            </Button>
          ) : null}
        </fieldset>

        <Button href={enquiryHref(product.name, size)} className="self-start">
          Enquire on WhatsApp
        </Button>
      </div>

      {blocks.length > 0 ? (
        <section className="flex flex-col gap-5">
          <h2 className="font-display text-body font-light text-ink">{copy.description.heading}</h2>
          <Specifications blocks={blocks} />
        </section>
      ) : null}

      <div>
        {[copy.shipping, copy.care, copy.disclaimer].map(section => (
          <Disclosure key={section.heading} heading={section.heading}>
            {section.items.map(line => (
              <p key={line}>{line}</p>
            ))}
          </Disclosure>
        ))}
      </div>
    </div>
  );
};

export default ProductDetails;
