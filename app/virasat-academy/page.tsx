'use client';

import { useState } from 'react';
import Footer from '@/components/layout/footer';
import { FIELD_CLASS, LABEL_CLASS } from '@/components/features/forms/field-styles';
import Button from '@/components/primitives/Button';
import DisplayHeading from '@/components/primitives/DisplayHeading';
import HairlineRule from '@/components/primitives/HairlineRule';
import Reveal from '@/components/primitives/Reveal';
import { siteCopy } from '@/lib/content/site-copy';

const { hero, form, success } = siteCopy.academy;
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

  const [showSuccess, setShowSuccess] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Show success notification
    setShowSuccess(true);

    // Clear form
    setFormData(initialFormData);

    // Hide success notification after 5 seconds
    setTimeout(() => {
      setShowSuccess(false);
    }, 5000);
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

      {/* Success notification. The live region is always mounted so the message is announced. */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed right-4 bottom-4 left-4 z-50 md:right-8 md:bottom-8 md:left-auto md:max-w-md"
      >
        {showSuccess ? (
          <div className="pointer-events-auto border border-gold bg-paper p-6 font-ui text-ink">
            <p className="m-0 font-display text-display-3 font-light">{success.heading}</p>
            <p className="m-0 mt-2 text-body text-ink-soft">{success.body}</p>
          </div>
        ) : null}
      </div>

      <Footer />
    </>
  );
}
