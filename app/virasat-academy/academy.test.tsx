import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { siteCopy } from '@/lib/content/site-copy';
import VirasatAcademyPage from './page';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const BANNED_SHAPES = new RegExp(
  [
    ['rounded', 'full'].join('-'),
    ['rounded', '3xl'].join('-'),
    ['bg', 'gradient'].join('-'),
    ['from', 'amber'].join('-'),
    ['gray', '\\d'].join('-'),
    ['shadow', '(?:sm|md|lg|xl|2xl)'].join('-'),
  ].join('|')
);

const { hero, form, success } = siteCopy.academy;

describe('Virasat Academy page', () => {
  it('renders inside the layout main, never its own', () => {
    const { container } = render(<VirasatAcademyPage />);
    expect(container.querySelector('main')).toBeNull();
  });

  it('has one h1, then the form heading as an h2', () => {
    const { container } = render(<VirasatAcademyPage />);
    const h1s = container.querySelectorAll('h1');
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent(hero.heading);
    expect(screen.getByRole('heading', { level: 2, name: form.heading })).toBeInTheDocument();
    const order = Array.from(container.querySelectorAll('h1,h2,h3')).map((h) => h.tagName);
    expect(order[0]).toBe('H1');
    expect(order[1]).toBe('H2');
  });

  it('prints the hero and form copy verbatim', () => {
    render(<VirasatAcademyPage />);
    expect(screen.getByText(hero.body)).toBeInTheDocument();
    expect(screen.getByText(form.subheading)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: form.submit })).toBeInTheDocument();
  });

  it('gives every field a visible label, a placeholder and a focus state', () => {
    render(<VirasatAcademyPage />);
    for (const { label, placeholder } of form.fields) {
      const control = screen.getByLabelText(new RegExp(`^${label}`));
      const labelEl = document.querySelector(`label[for="${control.id}"]`);
      expect(labelEl).not.toBeNull();
      expect(labelEl).not.toHaveClass('sr-only');
      if (placeholder) expect(control).toHaveAttribute('placeholder', placeholder);
      expect(control.className).toMatch(/focus-visible:outline/);
    }
    expect(screen.getByLabelText(/^Country/)).toHaveValue(form.defaultCountry);
  });

  it('offers the gender options in order', () => {
    render(<VirasatAcademyPage />);
    const select = screen.getByLabelText(/^Gender/) as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => [o.value, o.textContent])).toEqual(
      form.genderOptions.map((o) => [o.value, o.label])
    );
  });

  /**
   * The form sends nothing anywhere. Until Phase 2 wires it to the enquiry endpoint it must
   * not say otherwise: the old `handleSubmit` unconditionally announced
   * `academy.success` into a live region, so a screen-reader user was told in as many words
   * that their application had been received. `siteCopy.academy.success` is still in the copy
   * module -- it is a faithful extraction and Phase 2 will render it on a real response --
   * so the guard is that the page does not print it.
   */
  it('never claims the application was received, because nothing is sent', () => {
    vi.useFakeTimers();
    render(<VirasatAcademyPage />);
    const name = screen.getByLabelText(/^Full Name/) as HTMLInputElement;
    fireEvent.change(name, { target: { value: 'Asha' } });

    fireEvent.submit(name.closest('form')!);

    expect(screen.queryByText(success.heading)).toBeNull();
    expect(screen.queryByText(success.body)).toBeNull();
    // No empty live region left behind to announce something later, either.
    expect(screen.queryByRole('status')).toBeNull();

    // And no deferred message on a timer: the old code set a 5s one it never cleared.
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(screen.queryByText(success.heading)).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps every typed field after a submit, so nothing the applicant wrote is lost', () => {
    render(<VirasatAcademyPage />);
    const name = screen.getByLabelText(/^Full Name/) as HTMLInputElement;
    const city = screen.getByLabelText(/^City/) as HTMLInputElement;
    const comments = screen.getByLabelText(/^Additional Comments/) as HTMLTextAreaElement;
    fireEvent.change(name, { target: { value: 'Asha' } });
    fireEvent.change(city, { target: { value: 'Bhopal' } });
    fireEvent.change(comments, { target: { value: 'I have sewn since I was nine.' } });

    fireEvent.submit(name.closest('form')!);

    expect(name.value).toBe('Asha');
    expect(city.value).toBe('Bhopal');
    expect(comments.value).toBe('I have sewn since I was nine.');
    expect(screen.getByLabelText(/^Country/)).toHaveValue(form.defaultCountry);
  });

  it('uses no banned utility', () => {
    const { container } = render(<VirasatAcademyPage />);
    expect(container.innerHTML).not.toMatch(BANNED_SHAPES);
    expect(container.innerHTML).not.toMatch(/\btext-(?:ink|ink-soft|gold|paper)\/\d+/);
  });
});

/* -------------------------------------------------------------------------- */

/**
 * Every link the page opens in a new tab, by href.
 *
 * The enquiry is handed over by clicking a real anchor rather than by calling `window.open`,
 * so the spy goes on the anchor.
 */
function captureOpened() {
  const opened: string[] = [];
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement
  ) {
    opened.push(this.href);
  });
  return opened;
}

/** The `text=` parameter of a `wa.me` link, decoded. */
const messageOf = (href: string) =>
  decodeURIComponent(new URL(href).searchParams.get('text') ?? '');

const fill = (label: RegExp, value: string) => {
  const control = screen.getByLabelText(label) as HTMLInputElement;
  fireEvent.change(control, { target: { value } });
  return control;
};

/** Everything the form requires, so a submit is not blocked by validation. */
function fillRequired() {
  fill(/^Full Name/, 'Asha Verma');
  fill(/^Date of Birth/, '1999-04-02');
  fill(/^Phone Number/, '+91 90000 00000');
  fill(/^City/, 'Bhopal');
  fill(/^State/, 'Madhya Pradesh');
  fireEvent.change(screen.getByLabelText(/^Gender/), { target: { value: 'female' } });
}

/**
 * Submit hands the application to WhatsApp, pre-filled. The owner's decision, made explicitly
 * after the whole-branch review found a `handleSubmit` that was `preventDefault()` and nothing
 * else — an applicant filled eight fields, including a date of birth, pressed Submit, and the
 * data was discarded in silence.
 *
 * The constraints the decision came with, each of which is a test below: the message carries
 * no new prose, only the stored field labels and the applicant's own values; required-field
 * validation still gates the submission; the fields are not cleared; and nothing on the page
 * claims the application was received, because the page cannot know that.
 *
 * Phase 2 Task 8 replaces this with a real enquiry endpoint.
 */
describe('Virasat Academy — Submit opens WhatsApp pre-filled', () => {
  it('opens the boutique’s own WhatsApp number from the copy module', () => {
    const opened = captureOpened();
    render(<VirasatAcademyPage />);
    fillRequired();
    fireEvent.submit(screen.getByLabelText(/^Full Name/).closest('form')!);

    expect(opened).toHaveLength(1);
    const url = new URL(opened[0]);
    expect(url.origin + url.pathname).toBe('https://wa.me/919977057045');
    expect(siteCopy.footer.contact.phone).toBe('+919977057045');
  });

  it('carries every answered field as its stored label and the applicant’s own value', () => {
    const opened = captureOpened();
    render(<VirasatAcademyPage />);
    fillRequired();
    fill(/^Additional Comments/, 'I have sewn since I was nine.');
    fireEvent.submit(screen.getByLabelText(/^Full Name/).closest('form')!);

    const message = messageOf(opened[0]);
    expect(message).toBe(
      [
        'Full Name: Asha Verma',
        'Date of Birth: 1999-04-02',
        'Phone Number: +91 90000 00000',
        'City: Bhopal',
        'State: Madhya Pradesh',
        'Country: India',
        'Gender: Female',
        'Additional Comments: I have sewn since I was nine.',
      ].join('\n')
    );

    // No new prose: every word before a colon is a stored label, and every word after one is
    // the applicant's. Nothing greets, explains or apologises on the boutique's behalf.
    for (const line of message.split('\n')) {
      const label = line.slice(0, line.indexOf(':'));
      expect(form.fields.map(f => f.label)).toContain(label);
    }
  });

  it('sends the gender the applicant can read, not the option value', () => {
    const opened = captureOpened();
    render(<VirasatAcademyPage />);
    fillRequired();
    fireEvent.submit(screen.getByLabelText(/^Full Name/).closest('form')!);

    expect(messageOf(opened[0])).toContain('Gender: Female');
    expect(messageOf(opened[0])).not.toContain('female');
  });

  it('leaves an unanswered optional field out rather than sending an empty line', () => {
    const opened = captureOpened();
    render(<VirasatAcademyPage />);
    fillRequired();
    fireEvent.submit(screen.getByLabelText(/^Full Name/).closest('form')!);

    const message = messageOf(opened[0]);
    expect(message).not.toContain('Additional Comments');
    expect(message.split('\n').every(line => line.trim() !== '')).toBe(true);
  });

  it('url-encodes the message, so a newline or a + survives the hand-over', () => {
    const opened = captureOpened();
    render(<VirasatAcademyPage />);
    fillRequired();
    fireEvent.submit(screen.getByLabelText(/^Full Name/).closest('form')!);

    const raw = opened[0].slice(opened[0].indexOf('text=') + 'text='.length);
    expect(raw).not.toContain('\n');
    expect(raw).not.toContain(' ');
    // `+91` must arrive as `+91`, which means the `+` is percent-encoded rather than left to
    // be read back as a space.
    expect(raw).toContain('%2B91');
    expect(messageOf(opened[0])).toContain('+91 90000 00000');
  });

  it('sends nothing at all while a required field is empty', () => {
    const opened = captureOpened();
    render(<VirasatAcademyPage />);
    // Only the name: seven required fields are still blank.
    fill(/^Full Name/, 'Asha Verma');
    fireEvent.submit(screen.getByLabelText(/^Full Name/).closest('form')!);

    expect(opened).toEqual([]);
  });

  it('opens the hand-over in a new tab, so the filled form stays on the page', () => {
    const anchors: HTMLAnchorElement[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      anchors.push(this);
    });
    render(<VirasatAcademyPage />);
    fillRequired();
    fill(/^Additional Comments/, 'I have sewn since I was nine.');
    fireEvent.submit(screen.getByLabelText(/^Full Name/).closest('form')!);

    expect(anchors).toHaveLength(1);
    expect(anchors[0].target).toBe('_blank');
    expect(anchors[0].rel).toBe('noopener noreferrer');
    // And the application is still in the fields, as it was before the hand-over.
    expect(screen.getByLabelText(/^Full Name/)).toHaveValue('Asha Verma');
    expect(screen.getByLabelText(/^Additional Comments/)).toHaveValue(
      'I have sewn since I was nine.'
    );
    // No anchor is left behind in the document.
    expect(document.querySelectorAll('a[href^="https://wa.me/"]')).toHaveLength(0);
  });

  it('still claims nothing: no confirmation, no live region, even once it has opened', () => {
    captureOpened();
    render(<VirasatAcademyPage />);
    fillRequired();
    fireEvent.submit(screen.getByLabelText(/^Full Name/).closest('form')!);

    // Opening WhatsApp is not the same as an application arriving, and the page cannot know
    // whether the applicant pressed send.
    expect(screen.queryByText(success.heading)).toBeNull();
    expect(screen.queryByText(success.body)).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
    expect(document.querySelector('[aria-live]')).toBeNull();
  });
});
