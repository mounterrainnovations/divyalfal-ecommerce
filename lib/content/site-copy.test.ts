import { describe, it, expect } from 'vitest';
import { siteCopy } from './site-copy';
import { flattenLeaves, numericLeaves, stringLeaves } from './flatten';

describe('siteCopy', () => {
  it('preserves the About paragraph verbatim', () => {
    expect(siteCopy.home.about.body).toContain(
      'In 2010, our founder embarked on an extraordinary journey with nothing but a dream and 16 carefully curated sarees.'
    );
    expect(siteCopy.home.about.body).toContain(
      'most spectacular yet, featuring cutting-edge designs, world-class models'
    );
  });

  it('preserves both About statistics', () => {
    expect(siteCopy.home.about.stats).toEqual([
      { value: '15', label: 'Years of Excellence' },
      { value: '5000+', label: 'Happy Clients' },
    ]);
  });

  it('preserves all five testimonials verbatim and unattributed', () => {
    expect(siteCopy.home.testimonials).toHaveLength(5);
    expect(siteCopy.home.testimonials[0].quote).toBe(
      'Wearing Divyafal by Alpa Rawal was an experience not just a dress, but a story. I felt truly unique and ethereal in my lehenga.'
    );
    expect(siteCopy.home.testimonials.every(t => !('name' in t) || t.name === '')).toBe(true);
  });

  it('preserves the typographic apostrophes in the testimonials', () => {
    expect(siteCopy.home.testimonials[1].quote).toBe(
      'Alpa Rawal’s craftsmanship is unmatched. Every stitch reflects artistry, blending structure and elegance into wearable art.'
    );
    expect(siteCopy.home.testimonials[2].quote).toBe(
      'Divyafal’ lives up to its name. My outfit felt like a rare treasure timeless, personal, and heirloom-worthy.'
    );
  });

  it('preserves all six value statements', () => {
    expect(siteCopy.home.values.items).toHaveLength(6);
    expect(siteCopy.home.values.items.map(v => v.body)).toContain(
      'We pursue perfection in every stitch, every design, and every customer interaction.'
    );
    expect(siteCopy.home.values.items.map(v => v.title)).toEqual([
      'Excellence',
      'Passion',
      'Community',
      'Quality',
      'Creativity',
      'Growth',
    ]);
  });

  it('preserves the three named collection entries and the fourth fallback', () => {
    // arrayContaining ignores length, so pin the count too: a fifth entry would be
    // invented copy and a dropped one would be lost copy.
    expect(siteCopy.home.collection).toHaveLength(4);
    expect(siteCopy.home.collection.map(c => c.title)).toEqual(
      expect.arrayContaining([
        'Haldi & Kumkum Dress',
        'The Rajwadi Brocade',
        'Neelam Frill Lehenga',
        'The Royal Cascade Lehenga',
      ])
    );
  });

  it('spells the founder Alpa Rawal everywhere, including the hero byline', () => {
    // `Rawat` was the published spelling until the owner confirmed otherwise. It is asserted
    // absent rather than merely unused, because it survived in two testimonials, a seed and a
    // snapshot after the first attempt to remove it.
    expect(JSON.stringify(siteCopy)).not.toContain('Alpa Rawat');
    expect(siteCopy.home.testimonials[0].quote).toContain('Alpa Rawal');
    // The hero byline was added from a mock-up that spelled it `Rawal`. It is the most
    // prominent place her name appears on the site, so it is pinned here too: the published
    // spelling is one decision, not one per component.
    expect(siteCopy.home.hero.byline).toBe('by Alpa Rawal');
  });

  it('does not revive the commented-out founder card', () => {
    expect('founder' in siteCopy.home.about).toBe(false);
    expect(JSON.stringify(siteCopy)).not.toContain('Founder & Designer');
  });

  it('carries the real contact details, not the footer placeholders', () => {
    expect(siteCopy.footer.contact.phone).toBe('+919977057045');
    expect(siteCopy.footer.contact.email).toBe('divyafalthecreations@gmail.com');
    expect(JSON.stringify(siteCopy)).not.toContain('9876543210');
    expect(JSON.stringify(siteCopy)).not.toContain('hello@divyafal.com');
  });

  it('leaves the social collection empty until real URLs exist', () => {
    expect(siteCopy.footer.social).toEqual([]);
    expect(JSON.stringify(siteCopy)).not.toContain('"href":"#"');
  });

  it('carries the wordmark, the two media sources and the hero copy', () => {
    /*
     * This list grew. The hero had no words at all — a wordmark over a photograph — until the
     * owner supplied a mock-up with an eyebrow, a byline, a sentence, two buttons and three
     * marks. They live here rather than in the component so the Content screen can edit them,
     * which is where every other line on the shop lives.
     *
     * The list is asserted in order rather than as a set so that a key added without a thought
     * about where it belongs shows up as a failure.
     */
    expect(Object.keys(siteCopy.home.hero)).toEqual([
      'wordmark',
      'desktopImage',
      'mobileVideo',
      'eyebrow',
      'byline',
      'blurb',
      'primaryCta',
      'secondaryCta',
      'marks',
    ]);
    // Every mark names a drawing the hero maps to an icon it already imports, never a file.
    expect(siteCopy.home.hero.marks.map(mark => mark.icon)).toEqual(['needle', 'bloom', 'form']);
    // Both buttons must land on a page that exists; a hero CTA into a 404 is the worst of them.
    expect(siteCopy.home.hero.primaryCta.href).toBe('/products');
    expect(siteCopy.home.hero.secondaryCta.href).toBe('/contact-us');
    // The brand's own spelling, not an uppercased presentation of it: Task 5 applies
    // `text-transform: uppercase` and the eyebrow tracking in CSS.
    expect(siteCopy.home.hero.wordmark).toBe('Divyafal');
    // A frame from the house's own runway gallery, the set the Atelier section plays.
    expect(siteCopy.home.hero.desktopImage).toBe('/slideshow/dmw-136.jpg');
    expect(siteCopy.home.hero.mobileVideo).toBe(
      'https://duwwgyobnpuqsqdromzj.supabase.co/storage/v1/object/public/product-images/bg_video.webm'
    );
  });

  it('preserves the six category names', () => {
    expect(siteCopy.home.categories.items.map(c => c.name)).toEqual([
      'Sarees',
      'Indo-Western',
      'Lehengas',
      'Suits',
      'Kurta Pant',
      'Western',
    ]);
  });

  it('preserves the hardcoded garment names', () => {
    expect(siteCopy.home.recommended.bestSellers.map(p => p.name)).toEqual([
      'Red Velvet Saree Border with...',
      'Midnight Brown Indo Lehenga Set...',
      'White Silk Kurti with Long...',
      'Indo Western Lehenga Set...',
    ]);
    expect(siteCopy.home.recommended.freshArrivals.map(p => p.name)).toEqual([
      'Emerald Green Silk Saree...',
      'Rose Gold Lehenga Choli...',
      'Coral Silk Anarkali...',
      'Navy Blue Banarasi Saree...',
    ]);
    expect(siteCopy.home.style.items.map(p => p.name)).toEqual([
      'Raw Silk Off White Printed with Sequence Detailing',
      'Pure Cotton Block Print Ajragh Bagh',
      'Banarasi Anarkali Suit',
      'Peach and off white Banarasi Angrakha Anarkarli',
    ]);
  });

  it('preserves the section headings and calls to action', () => {
    expect(siteCopy.home.categories.heading).toBe('Shop by Category');
    expect(siteCopy.home.recommended.heading).toBe('Most Recommended');
    expect(siteCopy.home.explore.heading).toBe('Explore Our Collection');
    expect(siteCopy.home.explore.cta).toBe('View All');
    expect(siteCopy.home.style.heading).toBe('Shop By Style');
    expect(siteCopy.home.testimonialsHeading).toBe('What Our Customers Say');
    expect(siteCopy.home.about.heading).toBe('About Divyafal');
    expect(siteCopy.home.values.heading).toBe('Our Values');
    expect(siteCopy.home.academy.heading).toBe('Virasat Academy');
    expect(siteCopy.home.academy.cta).toBe('Apply Now');
  });

  it('preserves both call-to-action cards', () => {
    expect(siteCopy.home.cta.cards).toHaveLength(2);
    expect(siteCopy.home.cta.cards[0].title).toBe('Shop via Video Call');
    expect(siteCopy.home.cta.cards[0].body).toBe(
      'Get a free virtual styling session with our expert designers from the comfort of your home.'
    );
    expect(siteCopy.home.cta.cards[0].cta).toBe('Book an Appointment');
    expect(siteCopy.home.cta.cards[1].title).toBe('The Stylist Session');
    expect(siteCopy.home.cta.cards[1].cta).toBe('Visit Store');
  });

  it('preserves the footer copy', () => {
    expect(siteCopy.footer.brand.body).toBe(
      'Timeless elegance meets modern craftsmanship. Each piece is carefully designed to celebrate your unique story and style.'
    );
    expect(siteCopy.footer.contact.heading).toBe('Get in Touch');
    expect(siteCopy.footer.contact.address).toBe(
      'A-41, Bawadiya Kalan, Pallavi Nagar, Bhopal, Madhya Pradesh 462039'
    );
    expect(siteCopy.footer.quickLinks.items.map(l => l.label)).toEqual([
      'Home',
      'All Products',
      'Collections',
      'Contact Us',
    ]);
    expect(siteCopy.footer.legal.copyright).toBe('Divyafal. All rights reserved.');
  });

  it('preserves the navigation labels', () => {
    expect(siteCopy.nav.items.map(l => l.label)).toEqual([
      'Home',
      'All Products',
      'Sale',
      'Virasat Academy',
      'Contact',
    ]);
  });

  it('preserves the Virasat Academy page copy', () => {
    expect(siteCopy.academy.hero.heading).toBe('Virasat Academy');
    expect(siteCopy.academy.hero.body).toBe(
      'Embark on a journey to master the art of traditional Indian fashion design. Apply now to join our esteemed academy.'
    );
    expect(siteCopy.academy.form.heading).toBe('Application Form');
    expect(siteCopy.academy.form.subheading).toBe(
      'Fill in your details to apply for Virasat Academy'
    );
    expect(siteCopy.academy.form.submit).toBe('Submit Application');
    expect(siteCopy.academy.success.heading).toBe('Submission Successful!');
    expect(siteCopy.academy.success.body).toBe(
      'Thank you! Stay tuned while we look into your application.'
    );
  });

  it('preserves the contact page copy', () => {
    expect(siteCopy.contact.hero.heading).toBe('Contact Us');
    expect(siteCopy.contact.info.hours).toEqual(['Mon - Sat, 11:00am - 8:00pm,', 'Sunday- Closed']);
    expect(siteCopy.contact.info.phone).toBe('9977057045');
    expect(siteCopy.contact.info.email).toBe('divyafalthecreations@gmail.com');
    expect(siteCopy.contact.form.heading).toBe('Get in Touch');
    expect(siteCopy.contact.form.submit).toBe('Submit Now');
  });

  it('preserves the store-location section the contact page renders', () => {
    expect(siteCopy.contact.store.heading).toBe('Visit Our Store');
    expect(siteCopy.contact.store.body).toBe(
      "Experience our exquisite collection in person. We're here to help you find the perfect piece."
    );
    // Worded differently from contact.info.hours; both forms are on the page today.
    expect(siteCopy.contact.store.hours).toEqual(['Mon - Sat: 11:00am - 8:00pm', 'Sunday: Closed']);
    expect(siteCopy.contact.store.directionsCta).toBe('Get Directions');
  });

  it('preserves the listing page copy', () => {
    expect(siteCopy.products.loading.heading).toBe('Loading Products...');
    expect(siteCopy.products.loading.body).toBe('Please wait while we fetch the latest collection.');
    expect(siteCopy.products.empty.body).toBe('Stay Tuned! What you want might be on its way!');
    expect(siteCopy.sale.hero.subheading).toBe('Exclusive deals and discounts on premium products');
    expect(siteCopy.sale.loading.heading).toBe('Loading Sale Products...');
    expect(siteCopy.sale.loading.body).toBe('Finding the best deals for you!');
    expect(siteCopy.sale.empty.body).toBe('Check back soon for amazing deals and discounts!');
  });

  it('preserves the product-detail prose, with the entity decoded', () => {
    expect(siteCopy.product.description.heading).toBe('Description');
    expect(siteCopy.product.shipping.heading).toBe('Shipping Information');
    expect(siteCopy.product.care.heading).toBe('Care Instruction');
    expect(siteCopy.product.disclaimer.heading).toBe('Disclaimer');
    expect(siteCopy.product.related.heading).toBe('You may also like');
    expect(siteCopy.product.shipping.items).toHaveLength(4);
    expect(siteCopy.product.care.items).toHaveLength(5);
    expect(siteCopy.product.disclaimer.items).toHaveLength(5);
    expect(siteCopy.product.shipping.items).toContain(
      'Standard delivery takes 5-7 business days across India.'
    );
    expect(siteCopy.product.shipping.items).toContain(
      'Express shipping options are available at checkout for faster delivery.'
    );
    expect(siteCopy.product.care.items[0]).toBe(
      "Dry clean only to maintain the fabric's quality and embellishments."
    );
  });

  // Extracted in Task 13: the two 404 routes were the last storefront pages still carrying
  // their prose inline, which is also how they kept their grey-scale styling out of sight.
  it('preserves both not-found pages verbatim', () => {
    expect(siteCopy.notFound.code).toBe('404');
    expect(siteCopy.notFound.heading).toBe('Page Not Found');
    expect(siteCopy.notFound.body).toBe(
      "The page you're looking for doesn't exist or has been moved."
    );
    expect(siteCopy.notFound.homeCta).toBe('Go Home');
    expect(siteCopy.notFound.backCta).toBe('Go Back');
    expect(siteCopy.product.notFound.heading).toBe('Product Not Found');
    expect(siteCopy.product.notFound.body).toBe(
      "Sorry, the product you're looking for doesn't exist or has been removed from our collection."
    );
    expect(siteCopy.product.notFound.browseCta).toBe('Browse All Products');
    expect(siteCopy.product.notFound.homeCta).toBe('Go Home');
    // Straight apostrophes, as the old markup's `&apos;` rendered them -- not the U+2019 the
    // testimonials carry. The decoding rule, not a tidy-up.
    expect(siteCopy.notFound.body).not.toContain('’');
  });

  it('preserves the refund policy copy', () => {
    expect(siteCopy.refundPolicy.hero.heading).toBe('Refund Policy');
    expect(siteCopy.refundPolicy.hero.subheading).toBe('Your satisfaction is our priority');
    expect(siteCopy.refundPolicy.intro).toBe(
      'At Divyafal, we want you to be completely satisfied with your purchase. If for any reason you are not happy with your order, we offer a comprehensive refund policy to ensure your peace of mind.'
    );
    expect(siteCopy.refundPolicy.returnWindow.items).toEqual([
      'Unused and in the same condition that you received them',
      'In the original packaging with all tags attached',
      'Accompanied by the original receipt or proof of purchase',
    ]);
    expect(siteCopy.refundPolicy.process.steps).toHaveLength(5);
    expect(siteCopy.refundPolicy.process.steps[0].label).toBe('Initiate Return:');
    expect(siteCopy.refundPolicy.lastUpdated).toBe('Last updated: December 2025');
  });

  it('preserves the cancellation policy copy', () => {
    expect(siteCopy.cancellationPolicy.hero.heading).toBe('Cancellation Policy');
    expect(siteCopy.cancellationPolicy.hero.subheading).toBe(
      'Flexible options for order modifications'
    );
    expect(siteCopy.cancellationPolicy.window.tip.heading).toBe('Quick Tip');
    expect(siteCopy.cancellationPolicy.howTo.steps).toHaveLength(4);
    expect(siteCopy.cancellationPolicy.timeline.items).toHaveLength(4);
    expect(siteCopy.cancellationPolicy.lastUpdated).toBe('Last updated: December 2025');
  });

  it('decodes the HTML entities in the transcribed prose', () => {
    expect(siteCopy.home.about.body).toContain("This year's showcase");
    expect(siteCopy.refundPolicy.nonReturnable.items).toContain('Items marked as "Final Sale"');
    expect(siteCopy.cancellationPolicy.nonCancellable.items).toContain(
      'Items marked as "Made to Order"'
    );
    expect(JSON.stringify(siteCopy)).not.toContain('&apos;');
    expect(JSON.stringify(siteCopy)).not.toContain('&quot;');
  });

  // The phone number as the old markup printed it: U+202A ... U+202C bidi isolation
  // around the digits, U+00A0 between the groups. Those characters are in the shipped
  // site, so "tidying" them to a plain '+91 99770 57045' would be a content change.
  // All three sites are pinned, because all three printed the same string.
  it('keeps the bidi marks and non-breaking spaces in every displayed phone number', () => {
    expect(siteCopy.footer.contact.phoneDisplay).toBe('\u202a+91\u00a099770\u00a057045\u202c');
    expect(siteCopy.refundPolicy.questions.phoneDisplay).toBe(
      '\u202a+91\u00a099770\u00a057045\u202c'
    );
    expect(siteCopy.cancellationPolicy.help.phoneDisplay).toBe(
      '\u202a+91\u00a099770\u00a057045\u202c'
    );
  });
});

/**
 * Full-fidelity guard.
 *
 * The assertions above name the client-critical strings and document intent, but they
 * only cover part of the copy. This snapshot covers all of it: every leaf, flattened
 * to the `page.section.field` keys Phase 2's seed consumes. Reword any string, rename
 * any key, add or drop one, and the snapshot fails -- which is the whole point of the
 * module. Review the `.snap` diff as copy, and only run `-u` when the client has
 * actually approved a wording change.
 */
describe('siteCopy snapshot', () => {
  // The one shared flatten (lib/content/flatten.ts). The snapshot covers the STRING leaves.
  const all = flattenLeaves(siteCopy);
  const flat = stringLeaves(all);

  it('has not gained or lost a single leaf', () => {
    // Explicit, so an added or removed key is a loud failure rather than a quiet
    // snapshot update. Change this number only together with an approved copy change.
    expect(Object.keys(flat)).toHaveLength(388);
  });

  // The 370 above is a string count. The numeric leaves (garment prices, testimonial ratings)
  // are content the snapshot cannot hold, so they get the same loud protection here: the CMS
  // seed stores them, so the database holds 370 + 13 = 383 blocks, not 370.
  it('has not gained or lost a single numeric leaf', () => {
    expect(Object.keys(numericLeaves(all))).toHaveLength(13);
    expect(Object.keys(all)).toHaveLength(401);
  });

  it('matches the committed copy, string for string', () => {
    expect(flat).toMatchSnapshot();
  });
});
