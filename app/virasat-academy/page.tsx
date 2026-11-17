'use client';

import { useState } from 'react';
import Footer from '@/components/layout/footer';
import { FIELD_CLASS, LABEL_CLASS } from '@/components/features/forms/field-styles';
import Button from '@/components/primitives/Button';
import DisplayHeading from '@/components/primitives/DisplayHeading';
import HairlineRule from '@/components/primitives/HairlineRule';
import Reveal from '@/components/primitives/Reveal';
import { siteCopy } from '@/lib/content/site-copy';

// `siteCopy.academy.success` is deliberately not destructured here. The form is not wired to
// anything yet (see `handleSubmit`), so printing a confirmation would be a lie; the copy stays
// in the module because Phase 2 renders it on a real response from the enquiry endpoint.
const { hero, form } = siteCopy.academy;
const [
  fullNameField,
  dobField,
  phoneField,
  cityField,
  stateField,
  countryField,
  genderField,
  commentsField,
] = form.fields;

const initialFormData = {
  fullName: '',
  dob: '',
  phone: '',
  city: '',
  state: '',
  country: form.defaultCountry as string,
  gender: '',
  comments: '',
};

/** The label, with a visible mark for the fields the form requires. */
function FieldLabel({
  htmlFor,
  children,
  required = false,
}: {
  htmlFor: string;
  children: string;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className={LABEL_CLASS}>
      {children}
      {required ? (
        <>
          {' '}
          <span aria-hidden="true" className="text-sale">
            *
          </span>
        </>
      ) : null}
    </label>
  );
}

export default function VirasatAcademyPage() {
  const [formData, setFormData] = useState(initialFormData);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  /**
   * Inert, on purpose, and that is the honest state of this form.
   *
   * Nothing here posts anywhere: there is no enquiry endpoint yet, and Phase 2 wires this form
   * and the contact form to the same one. Until then the page must neither invent a success nor
   * invent a failure. It used to do the first -- it set a confirmation, cleared all eight fields
   * and started a 5s timer it never cleared -- which told the applicant, and told screen-reader
   * users out loud through an `aria-live` region, that an application had been received when not
   * a byte had left the browser. The typed values are kept, so that when the endpoint exists the
   * applicant's work is still on the page.
   *
   * `preventDefault` is the one thing that must happen: a form with no `action` otherwise
   * navigates on submit and writes every answer, including the date of birth and phone number,
   * into the URL and the browser history.
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <>
      <header className="grid-editorial pt-16 pb-12 md:pt-24 md:pb-16">
        <div className="col-span-12 md:col-span-9">
          <DisplayHeading level={1} size={1} className="reveal-text text-balance">
            {hero.heading}
          </DisplayHeading>
          <p className="measure reveal-text mt-8 font-display text-body font-light text-ink">
            {hero.body}
          </p>
        </div>
      </header>

      <section aria-labelledby="academy-form-heading">
        <div className="grid-editorial">
          <HairlineRule className="col-span-12" />
        </div>
        <div className="grid-editorial gap-y-10 py-12 md:py-16">
          <Reveal className="col-span-12 md:col-span-4">
            <DisplayHeading level={2} size={3} className="text-balance">
              <span id="academy-form-heading">{form.heading}</span>
            </DisplayHeading>
            <p className="mt-4 font-ui text-body text-ink-soft">{form.subheading}</p>
          </Reveal>

          <Reveal delay={60} className="col-span-12 md:col-span-6 md:col-start-7">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div>
                <FieldLabel htmlFor="fullName" required>
                  {fullNameField.label}
                </FieldLabel>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder={fullNameField.placeholder}
                  required
                  className={FIELD_CLASS}
                />
              </div>

              <div>
                <FieldLabel htmlFor="dob" required>
                  {dobField.label}
                </FieldLabel>
                <input
                  type="date"
                  id="dob"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  required
                  className={FIELD_CLASS}
                />
              </div>

              <div>
                <FieldLabel htmlFor="phone" required>
                  {phoneField.label}
                </FieldLabel>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder={phoneField.placeholder}
                  required
                  pattern="[0-9+\s-]+"
                  className={FIELD_CLASS}
                />
              </div>

              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="city" required>
                    {cityField.label}
                  </FieldLabel>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder={cityField.placeholder}
                    required
                    className={FIELD_CLASS}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="state" required>
                    {stateField.label}
                  </FieldLabel>
                  <input
                    type="text"
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    placeholder={stateField.placeholder}
                    required
                    className={FIELD_CLASS}
                  />
                </div>
              </div>

              <div>
                <FieldLabel htmlFor="country" required>
                  {countryField.label}
                </FieldLabel>
                <input
                  type="text"
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  placeholder={countryField.placeholder}
                  required
                  className={FIELD_CLASS}
                />
              </div>

              <div>
                <FieldLabel htmlFor="gender" required>
                  {genderField.label}
                </FieldLabel>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  required
                  className={FIELD_CLASS}
                >
                  {form.genderOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <FieldLabel htmlFor="comments">{commentsField.label}</FieldLabel>
                <textarea
                  id="comments"
                  name="comments"
                  value={formData.comments}
                  onChange={handleChange}
                  placeholder={commentsField.placeholder}
                  rows={5}
                  className={`${FIELD_CLASS} resize-none`}
                />
              </div>

              <div className="pt-4">
                <Button type="submit">{form.submit}</Button>
              </div>
            </form>
          </Reveal>
        </div>
      </section>

      {/* No live region. There is nothing truthful to announce until the form posts somewhere;
          an always-mounted `role="status"` was how the false confirmation reached assistive
          technology, and an empty one would only be waiting to do it again. */}

      <Footer />
    </>
  );
}
