import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { siteCopy } from '@/lib/content/site-copy';
import ContactUsPage from './page';
import ContactForm from '@/components/features/forms/contact-form';
import RefundPolicyPage from '../refund-policy/page';
import CancellationPolicyPage from '../cancellation-policy/page';

afterEach(cleanup);

// Banned vocabulary, assembled from fragments so this file's own source never spells one.
const BANNED_SHAPES = new RegExp(
  [
    ['rounded', 'full'].join('-'),
    ['rounded', '3xl'].join('-'),
    ['bg', 'gradient'].join('-'),
    ['from', 'amber'].join('-'),
    ['gray', '\\d'].join('-'),
    ['shadow', '(?:sm|md|lg|xl|2xl)'].join('-'),
    ['text', 'muted', 'foreground'].join('-'),
  ].join('|')
);

// Two placeholders that reached nobody: the old policy pages printed them.
const PLACEHOLDER_EMAIL = ['hello', 'divyafal.com'].join('@');
const PLACEHOLDER_PHONE = '98765' + '43210';

const REAL_EMAIL = 'divyafalthecreations@gmail.com';
const REAL_PHONE = '+919977057045';

/** Every string leaf under a copy subtree, keyed by its path. */
const leaves = (node: unknown, key = '', out: [string, string][] = []): [string, string][] => {
  if (typeof node === 'string') out.push([key, node]);
  else if (Array.isArray(node)) node.forEach((v, i) => leaves(v, `${key}[${i}]`, out));
  else if (node && typeof node === 'object')
    for (const [k, v] of Object.entries(node)) leaves(v, key ? `${key}.${k}` : k, out);
  return out;
};

describe('contact form', () => {
  const { fields, submit } = siteCopy.contact.form;

  it('renders every field with an associated, visible label', () => {
    render(<ContactForm />);
    for (const { label, placeholder } of fields) {
      const control = screen.getByLabelText(label);
      expect(control).toBeInTheDocument();
      expect(control).toHaveAttribute('placeholder', placeholder);
      // The label is a real <label for>, not an aria-label: it must be on screen.
      const labelEl = document.querySelector(`label[for="${control.id}"]`);
      expect(labelEl).not.toBeNull();
      expect(labelEl).toHaveTextContent(label);
      expect(labelEl).not.toHaveClass('sr-only');
    }
  });

  it('gives every field a visible focus state', () => {
    render(<ContactForm />);
    for (const { label } of fields) {
      expect(screen.getByLabelText(label).className).toMatch(/focus-visible:outline/);
    }
  });

  it('keeps the submit behaviour untouched: it still just swallows the event', () => {
    render(<ContactForm />);
    const button = screen.getByRole('button', { name: submit });
    expect(button).toHaveAttribute('type', 'submit');
    const form = button.closest('form')!;
    // fireEvent returns false when a handler called preventDefault.
    expect(fireEvent.submit(form)).toBe(false);
  });

  it('shows the copy on the page and no contact overlay text on the photograph', () => {
    render(<ContactForm />);
    expect(screen.getByRole('heading', { level: 2, name: siteCopy.contact.form.heading })).toBeVisible();
    expect(screen.getByAltText(siteCopy.contact.info.imageAlt)).toBeInTheDocument();
  });
});

describe('contact page', () => {
  const { info, store, hero } = siteCopy.contact;

  it('renders the real contact details from siteCopy', () => {
    const { container } = render(<ContactUsPage />);
    const text = container.textContent ?? '';

    expect(text).toContain(store.address);
    expect(text).toContain(store.phone);
    expect(text).toContain(store.email);
    expect(text).toContain(info.address);
    expect(text).toContain(info.phone);
    expect(text).toContain(info.email);

    const mail = container.querySelectorAll(`a[href="mailto:${REAL_EMAIL}"]`);
    expect(mail.length).toBeGreaterThan(0);
    expect(container.querySelector(`a[href="tel:${store.phone}"]`)).not.toBeNull();
    expect(text).not.toContain(PLACEHOLDER_EMAIL);
    expect(text).not.toContain(PLACEHOLDER_PHONE);
  });

  it('keeps both store-hours wordings, distinct and as written', () => {
    const { container } = render(<ContactUsPage />);
    const text = container.textContent ?? '';

    expect(store.hours).toEqual(['Mon - Sat: 11:00am - 8:00pm', 'Sunday: Closed']);
    expect(info.hours).toEqual(['Mon - Sat, 11:00am - 8:00pm,', 'Sunday- Closed']);
    for (const line of [...store.hours, ...info.hours]) expect(text).toContain(line);
    // Distinct renderings: neither was normalised into the other.
    expect(text.split('Mon - Sat: 11:00am - 8:00pm').length - 1).toBe(1);
    expect(text.split('Mon - Sat, 11:00am - 8:00pm,').length - 1).toBe(1);
  });

  it('renders every store string and the directions link', () => {
    render(<ContactUsPage />);
    expect(screen.getByRole('heading', { level: 2, name: store.heading })).toBeInTheDocument();
    expect(screen.getByText(store.body)).toBeInTheDocument();
    expect(screen.getByTitle(store.mapTitle)).toBeInTheDocument();
    const directions = screen.getByRole('link', { name: store.directionsCta });
    expect(directions).toHaveAttribute('href', expect.stringContaining('google.com/maps/search'));
    expect(directions).toHaveAttribute('rel', expect.stringContaining('noopener'));
    for (const heading of [store.addressHeading, store.hoursHeading, store.contactHeading]) {
      expect(screen.getByText(heading)).toBeInTheDocument();
    }
  });

  it('has one h1, then h2s, and never a nested <main>', () => {
    const { container } = render(<ContactUsPage />);
    const h1s = container.querySelectorAll('h1');
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent(hero.heading);
    expect(container.querySelectorAll('h2').length).toBeGreaterThanOrEqual(2);
    expect(container.querySelector('main')).toBeNull();
    // Document order: the h1 comes before every h2.
    const order = Array.from(container.querySelectorAll('h1, h2')).map((h) => h.tagName);
    expect(order[0]).toBe('H1');
  });

  it('sets the breadcrumb in Atelier tokens, with the current page marked', () => {
    render(<ContactUsPage />);
    const nav = screen.getByRole('navigation', { name: /breadcrumb/i });
    expect(within(nav).getByRole('link', { name: hero.breadcrumb[0].label })).toHaveAttribute(
      'href',
      hero.breadcrumb[0].href
    );
    const current = within(nav).getByText(hero.breadcrumb[1].label);
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(nav.innerHTML).not.toMatch(/muted/);
    expect(current.className).toMatch(/text-ink/);
  });

  it('uses no banned utility anywhere on the page', () => {
    const { container } = render(<ContactUsPage />);
    expect(container.innerHTML).not.toMatch(BANNED_SHAPES);
  });
});

describe.each([
  ['refund policy', RefundPolicyPage, siteCopy.refundPolicy, siteCopy.refundPolicy.questions],
  [
    'cancellation policy',
    CancellationPolicyPage,
    siteCopy.cancellationPolicy,
    siteCopy.cancellationPolicy.help,
  ],
] as const)('%s page', (_name, Page, copy, contact) => {
  it('no longer publishes a placeholder contact detail', () => {
    const { container } = render(<Page />);
    const everything = `${container.innerHTML}\n${container.textContent}`;
    expect(everything).not.toContain(PLACEHOLDER_EMAIL);
    expect(everything).not.toContain(PLACEHOLDER_PHONE);
  });

  it('links the real email and phone, rendered from siteCopy', () => {
    const { container } = render(<Page />);
    const mail = container.querySelectorAll('a[href^="mailto:"]');
    expect(mail.length).toBeGreaterThanOrEqual(2);
    for (const a of Array.from(mail)) expect(a).toHaveAttribute('href', `mailto:${REAL_EMAIL}`);

    const tel = container.querySelectorAll('a[href^="tel:"]');
    expect(tel.length).toBeGreaterThanOrEqual(1);
    for (const a of Array.from(tel)) expect(a).toHaveAttribute('href', `tel:${REAL_PHONE}`);

    // The contact card prints the display form exactly as stored: bidi marks and
    // non-breaking spaces included.
    expect(container.textContent).toContain(contact.phoneDisplay);
    expect(contact.phoneDisplay).toBe('‪+91 99770 57045‬');
    expect(container.textContent).toContain(contact.address);
    expect(container.textContent).toContain(contact.email);
  });

  it('prints every sentence of the policy exactly as the module holds it', () => {
    const { container } = render(<Page />);
    const text = container.textContent ?? '';
    // `phone` is an href, never printed on its own; `meta` is <head> data.
    const printed = leaves(copy).filter(
      ([key]) => !key.startsWith('meta.') && !key.endsWith('.phone')
    );
    expect(printed.length).toBeGreaterThan(25);
    for (const [key, value] of printed) {
      expect(text, key).toContain(value);
    }
  });

  it('typesets the prose at a readable measure', () => {
    const { container } = render(<Page />);
    const measured = container.querySelectorAll('.measure');
    expect(measured.length).toBeGreaterThan(5);
    for (const section of Array.from(container.querySelectorAll('section'))) {
      // Every section's reading column is measure-capped.
      if (section.querySelector('p')) expect(section.querySelector('.measure')).not.toBeNull();
    }
  });

  it('has one h1, then h2 sections, with no skipped heading level', () => {
    const { container } = render(<Page />);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelector('h1')).toHaveTextContent(copy.hero.heading);
    const levels = Array.from(container.querySelectorAll('h1,h2,h3,h4')).map((h) =>
      Number(h.tagName[1])
    );
    expect(levels[0]).toBe(1);
    expect(levels.filter((l) => l === 2).length).toBeGreaterThanOrEqual(6);
    levels.forEach((l, i) => {
      if (i > 0) expect(l - levels[i - 1]).toBeLessThanOrEqual(1);
    });
  });

  it('uses no banned utility and no opacity-wrapped text', () => {
    const { container } = render(<Page />);
    expect(container.innerHTML).not.toMatch(BANNED_SHAPES);
    expect(container.innerHTML).not.toMatch(/\btext-(?:ink|ink-soft|gold|paper)\/\d+/);
    expect(container.innerHTML).not.toMatch(/\bopacity-\d+/);
  });
});

describe('policy pages, individually', () => {
  it('cancellation keeps the two callouts, emoji and all, as written', () => {
    const { container } = render(<CancellationPolicyPage />);
    const { tip, note } = {
      tip: siteCopy.cancellationPolicy.window.tip,
      note: siteCopy.cancellationPolicy.modification.note,
    };
    expect(note.emoji).toBe('⚠️');
    expect(container.textContent).toContain(tip.emoji);
    expect(container.textContent).toContain(note.emoji);
    expect(container.textContent).toContain(tip.heading);
    expect(container.textContent).toContain(note.heading);
  });

  it('cancellation links its refund-policy cross-reference', () => {
    const { container } = render(<CancellationPolicyPage />);
    // The footer links the same page; the cross-reference is the one inside a policy section.
    const link = container.querySelector('section a[href="/refund-policy"]');
    expect(link).not.toBeNull();
    expect(link).toHaveTextContent('Refund Policy');
    expect(link!.closest('p')).toHaveTextContent(siteCopy.cancellationPolicy.nonCancellable.footnote);
  });

  it('refund policy numbers its five steps', () => {
    render(<RefundPolicyPage />);
    const list = screen.getAllByRole('list').find((l) => l.tagName === 'OL')!;
    expect(within(list).getAllByRole('listitem')).toHaveLength(
      siteCopy.refundPolicy.process.steps.length
    );
  });
});
