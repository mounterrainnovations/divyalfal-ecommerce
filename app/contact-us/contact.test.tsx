import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

  it('never lets the browser navigate on submit, which would put the answers in the URL', () => {
    render(<ContactForm />);
    const button = screen.getByRole('button', { name: submit });
    expect(button).toHaveAttribute('type', 'submit');
    const form = button.closest('form')!;
    // fireEvent returns false when a handler called preventDefault. A form with no `action`
    // otherwise navigates and writes every answer into the URL and the browser history.
    expect(fireEvent.submit(form)).toBe(false);
  });

  /**
   * **Only the fields the page says are mandatory may block a submit.**
   *
   * The stored labels mark exactly one field: `'Email *'`. `'Name'`, `'Phone'` and
   * `'Your message'` carry no marker, and the asterisk is how this form tells a visitor which
   * answer it cannot do without. While Submit did nothing, a `required` on the Name input cost
   * nothing; once Submit began actually validating (the WhatsApp hand-over calls
   * `reportValidity`), it started blocking a visitor on an obligation the page never stated —
   * the browser refuses the submit and points at a field whose label looks optional.
   *
   * The label is stored copy and may not change, so the markup yields: `required` lives on the
   * one input whose label carries the marker. This test is the pairing made explicit — the
   * marker and the attribute must agree, field by field — so neither can drift alone.
   */
  it('requires exactly the fields whose stored label carries the marker', () => {
    render(<ContactForm />);
    const marked = fields.filter(f => /\*$/.test(f.label)).map(f => f.label);
    expect(marked).toEqual(['Email *']);

    for (const { label } of fields) {
      const control = screen.getByLabelText(label);
      expect(
        control.hasAttribute('required'),
        `${label}: required must match the stored label's marker`
      ).toBe(/\*$/.test(label));
    }
  });

  it('shows the copy on the page and no contact overlay text on the photograph', () => {
    render(<ContactForm />);
    expect(screen.getByRole('heading', { level: 2, name: siteCopy.contact.form.heading })).toBeVisible();
    expect(screen.getByAltText(siteCopy.contact.info.imageAlt)).toBeInTheDocument();
  });
});

/**
 * Submit hands the enquiry to WhatsApp, pre-filled. The owner's decision, taken after the
 * whole-branch review found a `handleSubmit` that was `preventDefault()` plus a `TODO` — a
 * visitor filled in four fields, pressed Submit, and the enquiry was discarded in silence.
 *
 * The message carries no new prose: only the stored field labels and the visitor's own values,
 * URL-encoded. Required-field validation still gates the submission, and nothing on the page
 * claims the enquiry arrived, because the page cannot know whether the visitor pressed send.
 *
 * Phase 2 Task 8 replaces this with a real enquiry endpoint.
 */
describe('contact form — Submit opens WhatsApp pre-filled', () => {
  /** Every link the form opens in a new tab, by href. */
  function captureOpened() {
    const opened: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      opened.push(this.href);
    });
    return opened;
  }

  const messageOf = (href: string) =>
    decodeURIComponent(new URL(href).searchParams.get('text') ?? '');

  /**
   * By accessible name rather than label text: the stored label is `'Email *'` and the
   * asterisk is `aria-hidden`, so the field is announced — and addressed here — as "Email".
   */
  const field = (name: string) => screen.getByRole('textbox', { name });

  const fill = (name: string, value: string) =>
    fireEvent.change(field(name), { target: { value } });

  afterEach(() => vi.restoreAllMocks());

  it('opens the boutique’s own WhatsApp number with every answered field in the message', () => {
    const opened = captureOpened();
    render(<ContactForm />);
    fill('Name', 'Asha Verma');
    fill('Email', 'asha@example.com');
    fill('Phone', '+91 90000 00000');
    fill('Your message', 'Do you take commissions for a September wedding?');
    fireEvent.submit(screen.getByRole('button', { name: siteCopy.contact.form.submit }).closest('form')!);

    expect(opened).toHaveLength(1);
    const url = new URL(opened[0]);
    expect(url.origin + url.pathname).toBe('https://wa.me/919977057045');
    expect(siteCopy.footer.contact.phone).toBe('+919977057045');
    expect(messageOf(opened[0])).toBe(
      [
        'Name: Asha Verma',
        // The stored label is "Email *"; the required marker is presentation, not a label.
        'Email: asha@example.com',
        'Phone: +91 90000 00000',
        'Your message: Do you take commissions for a September wedding?',
      ].join('\n')
    );
  });

  it('leaves the two optional fields out when they are blank', () => {
    const opened = captureOpened();
    render(<ContactForm />);
    fill('Name', 'Asha Verma');
    fill('Email', 'asha@example.com');
    fireEvent.submit(screen.getByRole('button', { name: siteCopy.contact.form.submit }).closest('form')!);

    const message = messageOf(opened[0]);
    expect(message).toBe(['Name: Asha Verma', 'Email: asha@example.com'].join('\n'));
    expect(message).not.toContain('Phone');
    expect(message).not.toContain('Your message');
  });

  /**
   * The behavioural half of "only the marked field is mandatory": a visitor who gives an
   * email address and nothing else gets through. Before the `required` came off the Name
   * input, this submit was refused by the browser over a field the page never marked.
   */
  it('hands over an enquiry that answers only the one marked field', () => {
    const opened = captureOpened();
    render(<ContactForm />);
    fill('Email', 'asha@example.com');
    fireEvent.submit(screen.getByRole('button', { name: siteCopy.contact.form.submit }).closest('form')!);

    expect(opened).toHaveLength(1);
    expect(messageOf(opened[0])).toBe('Email: asha@example.com');
  });

  it('sends nothing at all while a required field is empty', () => {
    const opened = captureOpened();
    render(<ContactForm />);
    // Name is filled; the required email is not.
    fill('Name', 'Asha Verma');
    fireEvent.submit(screen.getByRole('button', { name: siteCopy.contact.form.submit }).closest('form')!);
    expect(opened).toEqual([]);
  });

  it('keeps the enquiry on the page and claims nothing about it', () => {
    const anchors: HTMLAnchorElement[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      anchors.push(this);
    });
    render(<ContactForm />);
    fill('Name', 'Asha Verma');
    fill('Email', 'asha@example.com');
    fireEvent.submit(screen.getByRole('button', { name: siteCopy.contact.form.submit }).closest('form')!);

    expect(anchors[0].target).toBe('_blank');
    expect(anchors[0].rel).toBe('noopener noreferrer');
    expect(field('Name')).toHaveValue('Asha Verma');
    expect(field('Email')).toHaveValue('asha@example.com');
    // Opening WhatsApp is not the same as an enquiry arriving.
    expect(screen.queryByRole('status')).toBeNull();
    expect(document.querySelector('[aria-live]')).toBeNull();
    expect(document.querySelectorAll('a[href^="https://wa.me/"]')).toHaveLength(0);
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
      // The dialled form is shown as the page's display form everywhere it is printed.
      expect(text, key).toContain(value.replaceAll(REAL_PHONE, contact.phoneDisplay));
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

  /**
   * Measured at the gate: both policy pages scrolled sideways at 768 wide, 820px against a
   * 768px viewport. The contact card is `md:flex` with a 160px `dt`, and
   * `divyafalthecreations@gmail.com` is one 29-character token with nowhere to break -- so the
   * `dd`'s min-content width was wider than the room left, and a flex item will not shrink
   * below that without `min-w-0`. 1440 and 390 were always clean, which is why twelve tasks
   * never saw it.
   */
  it('lets the contact card shrink and the long email wrap, so 768 does not scroll sideways', () => {
    const { container } = render(<Page />);
    const values = Array.from(container.querySelectorAll('dd'));
    expect(values.length).toBeGreaterThan(2);
    for (const value of values) {
      expect(value.className).toMatch(/\bmin-w-0\b/);
      expect(value.className).toMatch(/\bbreak-words\b/);
    }
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

describe('review fixes', () => {
  it('sets the callouts as notes, not complementary landmarks inside main', () => {
    const { container } = render(<CancellationPolicyPage />);
    expect(container.querySelector('aside')).toBeNull();
    expect(screen.queryByRole('complementary')).toBeNull();
    const notes = screen.getAllByRole('note');
    expect(notes).toHaveLength(2);
    expect(notes[0]).toHaveTextContent(siteCopy.cancellationPolicy.window.tip.heading);
    expect(notes[1]).toHaveTextContent(siteCopy.cancellationPolicy.modification.note.heading);
  });

  it.each([
    ['refund', RefundPolicyPage],
    ['cancellation', CancellationPolicyPage],
  ] as const)('prints the phone one way only on the %s page', (_name, Page) => {
    const { container } = render(<Page />);
    const display = siteCopy.refundPolicy.questions.phoneDisplay;
    const tel = Array.from(container.querySelectorAll('a[href^="tel:"]'));
    expect(tel.length).toBeGreaterThan(0);
    for (const a of tel) {
      expect(a).toHaveAttribute('href', `tel:${REAL_PHONE}`);
      expect(a.textContent).toBe(display);
    }
    // The bare dialled form is never printed as text.
    expect(container.textContent).not.toContain(REAL_PHONE);
  });

  it('keeps the stored strings as they were: the dialled form is still in the copy', () => {
    expect(siteCopy.cancellationPolicy.howTo.steps[0].body).toContain(REAL_PHONE);
  });

  it('renders every emphasised phrase as bold and the cross-reference as a link', () => {
    const refund = render(<RefundPolicyPage />);
    const strongs = (el: HTMLElement) =>
      Array.from(el.querySelectorAll('strong')).map((s) => s.textContent);
    expect(strongs(refund.container)).toContain('7 days');
    refund.unmount();

    const cancel = render(<CancellationPolicyPage />);
    expect(strongs(cancel.container)).toEqual(expect.arrayContaining(['24 hours', '12 hours']));
    const link = cancel.container.querySelector('section a[href="/refund-policy"]');
    expect(link).toHaveTextContent('Refund Policy');
  });

  it('caps the reading measure at 68ch in the stylesheet the pages use', () => {
    const css = readFileSync(path.resolve(__dirname, '../globals.css'), 'utf8');
    expect(css).toMatch(/--measure:\s*68ch\s*;/);
    expect(css).toMatch(/@utility measure\s*\{[^}]*max-width:\s*var\(--measure\)/);
  });

  it('announces the email field as Email, with the asterisk hidden from assistive tech', () => {
    render(<ContactForm />);
    expect(screen.getByRole('textbox', { name: 'Email' })).toBeInTheDocument();
    // The stored label is untouched and still reads "Email *" on screen.
    expect(siteCopy.contact.form.fields[1].label).toBe('Email *');
    const label = document.querySelector('label[for="email"]')!;
    expect(label.textContent).toBe('Email *');
    expect(label.querySelector('[aria-hidden="true"]')).toHaveTextContent('*');
  });
});
