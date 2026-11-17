'use client';

import Image from 'next/image';
import { useState } from 'react';
import Button from '@/components/primitives/Button';
import DisplayHeading from '@/components/primitives/DisplayHeading';
import Reveal from '@/components/primitives/Reveal';
import { siteCopy } from '@/lib/content/site-copy';
import { FIELD_CLASS, LABEL_CLASS } from './field-styles';
import { handoverEnquiry } from './whatsapp-enquiry';

const { info, form } = siteCopy.contact;
const [nameField, emailField, phoneField, messageField] = form.fields;

/**
 * A stored label that ends in ` *` is set with the asterisk hidden from assistive tech, so the
 * field is announced as "Email" and `required` carries the obligation. The text on screen is the
 * stored text.
 */
function LabelText({ text }: { text: string }) {
  const marked = text.match(/^(.*\S)\s*\*$/);
  if (!marked) return <>{text}</>;
  return (
    <>
      {marked[1]} <span aria-hidden="true">*</span>
    </>
  );
}

const INFO_LINK =
  'text-ink underline decoration-gold underline-offset-4 transition-colors duration-300 ' +
  'hover:decoration-ink motion-reduce:transition-none break-words ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink';

const ContactForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  /**
   * Submit hands the enquiry to WhatsApp, pre-filled.
   *
   * The owner's decision, taken explicitly. Before it this handler was `preventDefault()` plus
   * a `TODO`: a visitor filled in four fields, pressed Submit, and the enquiry was discarded
   * in silence. **Phase 2 Task 8 replaces the hand-over with a real enquiry endpoint**
   * (`POST /api/enquiries`, spec §11); until then the enquiry travels on the number the footer
   * already prints.
   *
   * The message is the stored field labels and the visitor's own values and nothing else --
   * see `whatsapp-enquiry.ts`. The markup and the `required` attributes are untouched, the
   * typed values stay in the fields, and nothing here claims the enquiry arrived: opening
   * WhatsApp is not the same as pressing send, and the page cannot know which happened.
   */
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    handoverEnquiry(e, [
      { label: nameField.label, value: formData.name },
      { label: emailField.label, value: formData.email },
      { label: phoneField.label, value: formData.phone },
      { label: messageField.label, value: formData.message },
    ]);
  };

  return (
    <section id="contact-section" className="section-rhythm">
      <div className="grid-editorial gap-y-16 md:gap-y-0">
        {/* Left: the photograph, with the address and hours set beneath it on the paper. */}
        <Reveal className="col-span-12 md:col-span-5">
          <div className="relative aspect-[4/5] w-full overflow-hidden bg-paper-deep">
            <Image
              src={info.image}
              alt={info.imageAlt}
              fill
              sizes="(min-width: 768px) 38vw, 100vw"
              className="object-cover"
              style={{ objectPosition: 'center top' }}
            />
          </div>

          <div className="mt-8 space-y-4 font-ui text-body text-ink">
            <DisplayHeading level={2} size={3} className="text-balance">
              {info.heading}
            </DisplayHeading>
            <p className="m-0">{info.address}</p>
            <p className="m-0">
              {info.hours[0]}
              <br />
              {info.hours[1]}
            </p>
            <p className="m-0">
              <span className="text-ink-soft">{info.phoneLabel}</span>{' '}
              <a href={`tel:${info.phone}`} className={INFO_LINK}>
                {info.phone}
              </a>
            </p>
            <p className="m-0">
              <span className="text-ink-soft">{info.emailLabel}</span>{' '}
              <a href={`mailto:${info.email}`} className={INFO_LINK}>
                {info.email}
              </a>
            </p>
          </div>
        </Reveal>

        {/* Right: the form. */}
        <Reveal delay={60} className="col-span-12 md:col-span-6 md:col-start-7">
          <DisplayHeading level={2} size={2} className="text-balance">
            {form.heading}
          </DisplayHeading>

          <form onSubmit={handleSubmit} className="mt-10 space-y-8">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <div>
                <label htmlFor="name" className={LABEL_CLASS}>
                  <LabelText text={nameField.label} />
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder={nameField.placeholder}
                  required
                  className={FIELD_CLASS}
                />
              </div>
              <div>
                <label htmlFor="email" className={LABEL_CLASS}>
                  <LabelText text={emailField.label} />
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder={emailField.placeholder}
                  required
                  className={FIELD_CLASS}
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className={LABEL_CLASS}>
                <LabelText text={phoneField.label} />
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder={phoneField.placeholder}
                className={FIELD_CLASS}
              />
            </div>

            <div>
              <label htmlFor="message" className={LABEL_CLASS}>
                <LabelText text={messageField.label} />
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder={messageField.placeholder}
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
  );
};

export default ContactForm;
