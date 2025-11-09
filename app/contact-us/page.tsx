import ContactUsHero from '@/components/layout/contact-us-hero';
import OurStory from '@/components/sections/our-story';
import OurValues from '@/components/sections/our-values';
import ContactForm from '@/components/features/forms/contact-form';
import Footer from '@/components/layout/footer';

export default function ContactUsPage() {
  return (
    <>
      <ContactUsHero />
     {/* <OurStory /> */}
      {/* <OurValues /> */}
      <ContactForm />
      <Footer />
    </>
  );
}
