'use client';

import { useState } from 'react';
import Footer from '@/components/layout/footer';
import { FIELD_CLASS, LABEL_CLASS } from '@/components/features/forms/field-styles';
import Button from '@/components/primitives/Button';
import DisplayHeading from '@/components/primitives/DisplayHeading';
import HairlineRule from '@/components/primitives/HairlineRule';
import Reveal from '@/components/primitives/Reveal';
import { siteCopy } from '@/lib/content/site-copy';
import { handoverEnquiry } from '@/components/features/forms/whatsapp-enquiry';

// `siteCopy.academy.success` is deliberately not destructured here. Submit hands the
// application to WhatsApp (see `handleSubmit`), which is not the same as an application
// arriving -- the applicant may never press send -- so printing a confirmation would still be
// a lie. The copy stays in the module because Phase 2 Task 8 renders it on a real response
// from the enquiry endpoint.
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
   * Submit hands the application to WhatsApp, pre-filled.
   *
   * The owner's decision, taken explicitly. Before it, this handler was `preventDefault()` and
   * nothing else: an applicant filled in eight fields, including a date of birth, pressed
   * Submit, and every answer was discarded in silence. There is still no enquiry endpoint --
   * **Phase 2 Task 8 replaces this hand-over with a real one** (`POST /api/enquiries`) -- so
   * until then the application travels on the number the footer already prints.
   *
   * The message is the stored field labels and the applicant's own values, nothing else: no
   * greeting and no sign-off, because the boutique does not put words in an applicant's mouth
   * and every storefront word lives in `siteCopy`. The gender is sent as the option's visible
   * label rather than its value, so the applicant reads back what they chose. See
   * `components/features/forms/whatsapp-enquiry.ts` for the rest of the reasoning.
   *
   * What does **not** change: the markup, the `required` attributes and the browser's own
   * validation still gate the submission; the typed values stay in the fields, because the
   * hand-over opens in a new tab; and nothing on the page claims the application was received,
   * since opening WhatsApp is not the same as pressing send.
   */
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    handoverEnquiry(e, [
      { label: fullNameField.label, value: formData.fullName },
      { label: dobField.label, value: formData.dob },
      { label: phoneField.label, value: formData.phone },
      { label: cityField.label, value: formData.city },
      { label: stateField.label, value: formData.state },
      { label: countryField.label, value: formData.country },
      {
        label: genderField.label,
        // The label the applicant read, not the `value` the markup carries.
        value: form.genderOptions.find(option => option.value === formData.gender)?.label ?? '',
      },
      { label: commentsField.label, value: formData.comments },
    ]);
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

      {/* No live region. Opening WhatsApp is not an application arriving, so there is still
          nothing truthful to announce: an always-mounted `role="status"` was how the false
          confirmation reached assistive technology, and an empty one would only be waiting to
          do it again. Phase 2 Task 8's endpoint is what gives this page a real outcome to
          report. */}

      <Footer />
    </>
  );
}
