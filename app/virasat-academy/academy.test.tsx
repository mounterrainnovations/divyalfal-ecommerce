import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { siteCopy } from '@/lib/content/site-copy';
import VirasatAcademyPage from './page';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
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
