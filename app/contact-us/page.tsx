import ContactUsHero from '@/components/layout/contact-us-hero';
import StoreLocationMap from '@/components/features/maps/store-location-map';
import ContactForm from '@/components/features/forms/contact-form';
import Footer from '@/components/layout/footer';

export default function ContactUsPage() {
  return (
    <>
      <ContactUsHero />
      <StoreLocationMap />
      <ContactForm />
      <Footer />
    </>
  );
}
