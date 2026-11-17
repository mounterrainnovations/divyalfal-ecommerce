'use client';

import Image from 'next/image';
import { useState } from 'react';
import Button from '@/components/primitives/Button';
import DisplayHeading from '@/components/primitives/DisplayHeading';
import Reveal from '@/components/primitives/Reveal';
import { siteCopy } from '@/lib/content/site-copy';
import { postEnquiry, transcript, type Answer } from '@/lib/enquiries/submit';
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
   * Submit hands the enquiry to WhatsApp, pre-filled, **and** posts the same answers to
   * `/api/enquiries`.
   *
   * WhatsApp stays the visible action — the owner's decision, taken explicitly, and the enquiry
   * still travels on the number the footer already prints. What is new is that it is also
   * stored, so an enquiry is no longer lost when the visitor closes the WhatsApp tab without
   * pressing send. The POST is invisible: it is not awaited, it cannot block the hand-over, and
   * it prints nothing, because opening WhatsApp is still not the same as an enquiry arriving and
   * the page still cannot know which happened.
   *
   * The message is the stored field labels and the visitor's own values and nothing else --
   * see `whatsapp-enquiry.ts`. The one `required` attribute left is the Email field's, the only
   * label the copy marks with an asterisk; the typed values stay in the fields.
   */
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const answers: Answer[] = [
      { label: nameField.label, value: formData.name },
      { label: emailField.label, value: formData.email },
      { label: phoneField.label, value: formData.phone },
      { label: messageField.label, value: formData.message },
    ];

    // Read before the hand-over: `checkValidity` reports without showing the browser's own
    // bubble, which `handoverEnquiry` is about to do once. Only a form the browser would have
    // let through is stored.
    const valid = e.currentTarget.checkValidity();

    handoverEnquiry(e, answers);
    if (!valid) return;

    void postEnquiry({
      // Only the Email field is `required` here, because only its stored label carries the
      // asterisk. So the two columns the endpoint cannot do without are filled from what the
      // form actually guarantees: the email address stands in for an unanswered name, and the
      // message is the whole labelled transcript rather than the message field alone, which is
      // optional on this form. Nothing is invented and nothing is dropped.
      name: formData.name.trim() || formData.email.trim(),
      email: formData.email,
      phone: formData.phone,
      message: transcript(answers),
      source: 'contact',
    });
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
                  /* No `required`: the stored label is plain `'Name'`. Only `'Email *'` carries
                     the marker, and the marker is how this form tells a visitor which answer it
                     cannot do without. While Submit did nothing the attribute cost nothing;
                     since the WhatsApp hand-over began calling `reportValidity`, it blocked a
                     visitor on an obligation the page never stated. The label is stored copy
                     and cannot change, so the markup is what yields. */
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
