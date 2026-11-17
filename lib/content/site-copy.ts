/**
 * Verbatim site copy.
 *
 * Every string here was transcribed character-for-character out of the pre-revamp
 * components so that the redesign can change the presentation without changing a
 * single word. HTML entities were decoded to the characters they render as
 * (`&apos;` -> `'`, `&quot;` -> `"`); typographic apostrophes (U+2019) and the
 * non-breaking spaces / bidi marks in the phone numbers are preserved exactly.
 *
 * Keys are an interface: Phase 2's CMS seed flattens them to `page.section.field`
 * strings, so renaming a key is a breaking change. This file is data only -- no
 * functions, no formatting helpers, no derived values.
 *
 * Three deliberate corrections to the old markup, and nothing else:
 *   1. Contact details are the real ones from `contact-form.tsx`
 *      (phone `+919977057045`, email `divyafalthecreations@gmail.com`). The footer's
 *      placeholder phone and email are gone, including where the policy pages
 *      printed the placeholder email in prose. Neither placeholder is written
 *      anywhere in this file, comments included, so a raw grep gate stays green.
 *   2. The founder is spelled `Alpa Rawat`, as the live testimonials spell her. A
 *      misspelling of her surname sits in a commented-out block and is not carried
 *      at all: markup the client switched off is not published content.
 *   3. `footer.social` is empty -- the old markup had only placeholder anchors and
 *      no real profile URLs have been supplied.
 *
 * Irregular keys, so Phase 2's seed does not have to guess:
 *   - `home.testimonialsHeading` sits at page level, not under `home.testimonials`:
 *     the brief mandates `home.testimonials[]` as a bare array, so a heading cannot
 *     nest inside it.
 *   - `home.recommended` holds `bestSellers` / `freshArrivals`, not `items` -- the
 *     section has two tabbed lists, and `recommended.tabs[]` holds their titles and
 *     blurbs.
 *   - The contact details repeat, faithfully, in four places: `footer.contact`,
 *     `contact.info`, `refundPolicy.questions` and `cancellationPolicy.help`. Each
 *     is a separate string in the old markup; deduping them is a seed concern, not
 *     an extraction one.
 */
export const siteCopy = {
  nav: {
    logo: {
      src: '/DivyafalLogo.png',
      alt: 'DivyaFal Logo',
    },
    items: [
      { label: 'Home', href: '/' },
      { label: 'All Products', href: '/products' },
      { label: 'Sale', href: '/sale' },
      { label: 'Virasat Academy', href: '/virasat-academy' },
      { label: 'Contact', href: '/contact-us' },
    ],
  },

  home: {
    // The old hero rendered no text at all: its overlay was commented out. Only the
    // wordmark and the two existing media sources live here -- no tagline, no est. mark.
    hero: {
      wordmark: 'Divyafal',
      desktopImage: '/mocks/mock_hero_desktop_2.webp',
      mobileVideo:
        'https://duwwgyobnpuqsqdromzj.supabase.co/storage/v1/object/public/product-images/bg_video.webm',
    },

    categories: {
      heading: 'Shop by Category',
      items: [
        { name: 'Sarees', image: '/categories/saree.jpg' },
        { name: 'Indo-Western', image: '/categories/indo_western.jpg' },
        { name: 'Lehengas', image: '/categories/lehenge.webp' },
        { name: 'Suits', image: '/categories/suits.jpg' },
        { name: 'Kurta Pant', image: '/categories/kurta.jpg' },
        { name: 'Western', image: '/categories/western.png' },
      ],
    },

    recommended: {
      heading: 'Most Recommended',
      tabs: [
        {
          title: 'Best Sellers',
          body: 'Discover our top-selling styles, loved by customers for their elegance and quality. Shop from our most popular collections.',
        },
        {
          title: 'Fresh Arrivals',
          body: 'Explore our latest collection of stunning pieces just added to our store — featuring the newest designs and trends.',
        },
      ],
      bestSellers: [
        { name: 'Red Velvet Saree Border with...', price: 10999, image: '/mostrec/1.png' },
        { name: 'Midnight Brown Indo Lehenga Set...', price: 21999, image: '/mostrec/2.png' },
        { name: 'White Silk Kurti with Long...', price: 60000, image: '/mostrec/3.png' },
        { name: 'Indo Western Lehenga Set...', price: 12000, image: '/mostrec/4.png' },
      ],
      freshArrivals: [
        {
          name: 'Emerald Green Silk Saree...',
          price: 45999,
          image: '/mocks/mock_hero_desktop.jpg',
        },
        {
          name: 'Rose Gold Lehenga Choli...',
          price: 85000,
          image: '/mocks/mock_mostRecommended_common.jpg',
        },
        {
          name: 'Coral Silk Anarkali...',
          price: 55000,
          image: '/mocks/mock_mostRecommended_common.jpg',
        },
        {
          name: 'Navy Blue Banarasi Saree...',
          price: 72000,
          image: '/mocks/mock_mostRecommended_common.jpg',
        },
      ],
      addToCartLabel: 'Add to Cart',
      pricePrefix: 'From',
    },

    explore: {
      heading: 'Explore Our Collection',
      body: 'Discover our exquisite range of sarees, lehengas, and Indo-western pieces — designed for timeless elegance and contemporary style.',
      cta: 'View All',
      ctaHref: '/products',
    },

    collection: [
      {
        title: 'Haldi & Kumkum Dress',
        description:
          'Auspicious elegance in every thread. Draped in the sacred hues of Haldi and Kumkum',
        image: '/collection/1.png',
        backImage: '/collection/1b.png',
      },
      {
        title: 'The Rajwadi Brocade',
        description: 'Rajwadi also means Royal and Brocade highlights the magnificent woven fabric',
        image: '/collection/2.png',
        backImage: '/collection/2b.png',
      },
      {
        title: 'Neelam Frill Lehenga',
        description:
          'Neelam for the rich sapphire blue top, paired with Frill for the modern, layered skirt',
        image: '/collection/3.png',
        backImage: '/collection/3b.png',
      },
      {
        title: 'The Royal Cascade Lehenga',
        description:
          'Royal for that rich sapphire-blue choli, and Cascade to describe the beautiful, waterfall-like drape of the skirt.',
        image: '/collection/4.png',
        backImage: '/collection/4b.png',
      },
    ],

    style: {
      heading: 'Shop By Style',
      items: [
        {
          name: 'Raw Silk Off White Printed with Sequence Detailing',
          frontImage: '/shop by style/f1.png',
          backImage: '/shop by style/b1.png',
        },
        {
          name: 'Pure Cotton Block Print Ajragh Bagh',
          frontImage: '/shop by style/f2.png',
          backImage: '/shop by style/b2.png',
        },
        {
          name: 'Banarasi Anarkali Suit',
          frontImage: '/shop by style/f3.png',
          backImage: '/shop by style/b3.png',
        },
        {
          name: 'Peach and off white Banarasi Angrakha Anarkarli',
          frontImage: '/shop by style/f4.png',
          backImage: '/shop by style/b4.png',
        },
      ],
    },

    testimonialsHeading: 'What Our Customers Say',

    // Every entry was unattributed in the old markup (`name: ''`); the empty name is
    // kept so that losing the anonymity would be a visible change, not a silent one.
    testimonials: [
      {
        name: '',
        quote:
          'Wearing Divyafal by Alpa Rawat was an experience not just a dress, but a story. I felt truly unique and ethereal in my lehenga.',
        image: '/testimonials/1.png',
        rating: 5,
      },
      {
        name: '',
        quote:
          'Alpa Rawat’s craftsmanship is unmatched. Every stitch reflects artistry, blending structure and elegance into wearable art.',
        image: '/testimonials/2.png',
        rating: 5,
      },
      {
        name: '',
        quote:
          'Divyafal’ lives up to its name. My outfit felt like a rare treasure timeless, personal, and heirloom-worthy.',
        image: '/testimonials/3.png',
        rating: 5,
      },
      {
        name: '',
        quote:
          'My Divyafal engagement outfit was pure magic. Alpa captured the emotion perfectly the fit, color, and grace were flawless.',
        image: '/testimonials/4.png',
        rating: 5,
      },
      {
        name: '',
        quote:
          'Designing with Alpa was a dream. She transformed my vision into a stunning reality with her heartfelt artistry',
        image: '/testimonials/5.png',
        rating: 5,
      },
    ],

    about: {
      heading: 'About Divyafal',
      body: "In 2010, our founder embarked on an extraordinary journey with nothing but a dream and 16 carefully curated sarees. What started as a small venture has blossomed into a luxury fashion design studio that celebrates the art of personalized elegance. Today, Divyafal stands as a testament to the power of vision, creativity, and unwavering commitment to excellence. Our fashion show represents the culmination of years of artistic exploration and the celebration of individual style. This year's showcase promises to be our most spectacular yet, featuring cutting-edge designs, world-class models, and an unforgettable experience that defines luxury fashion.",
      image: '/About.jpeg',
      imageAlt: 'Divyafal Boutique',
      stats: [
        { value: '15', label: 'Years of Excellence' },
        { value: '5000+', label: 'Happy Clients' },
      ],
    },

    cta: {
      cards: [
        {
          title: 'Shop via Video Call',
          body: 'Get a free virtual styling session with our expert designers from the comfort of your home.',
          cta: 'Book an Appointment',
          href: 'https://wa.me/919977057045',
        },
        {
          title: 'The Stylist Session',
          body: 'Visit our store for the best in-person experience with personalized styling and fitting.',
          cta: 'Visit Store',
          href: '/contact-us#map-section',
        },
      ],
    },

    academy: {
      heading: 'Virasat Academy',
      body: 'Discover the art of traditional Indian fashion and design. Join our academy to learn from expert artisans and designers, preserving heritage while creating contemporary masterpieces.',
      cta: 'Apply Now',
      href: '/virasat-academy',
    },

    values: {
      heading: 'Our Values',
      items: [
        {
          title: 'Excellence',
          body: 'We pursue perfection in every stitch, every design, and every customer interaction.',
        },
        {
          title: 'Passion',
          body: 'Our love for fashion drives us to create pieces that inspire and empower our clients.',
        },
        {
          title: 'Community',
          body: 'Building lasting relationships with our customers and celebrating their unique stories.',
        },
        {
          title: 'Quality',
          body: 'Premium materials and craftsmanship that stand the test of time and trends.',
        },
        {
          title: 'Creativity',
          body: 'Pushing boundaries and embracing innovation while honoring traditional techniques.',
        },
        {
          title: 'Growth',
          body: 'Continuously evolving and adapting to meet the changing needs of modern fashion.',
        },
      ],
    },
  },

  footer: {
    brand: {
      logo: '/DivyafalLogo.png',
      logoAlt: 'Divyafal Logo',
      body: 'Timeless elegance meets modern craftsmanship. Each piece is carefully designed to celebrate your unique story and style.',
    },
    // Empty on purpose: the old markup linked both icons to `href="#"` and no real
    // Instagram / Facebook URLs have been supplied. Render nothing until they are.
    social: [] as ReadonlyArray<{ label: string; href: string }>,
    quickLinks: {
      heading: 'Quick Links',
      items: [
        { label: 'Home', href: '/' },
        { label: 'All Products', href: '/products' },
        { label: 'Collections', href: '' },
        { label: 'Contact Us', href: '/contact-us' },
      ],
    },
    contact: {
      heading: 'Get in Touch',
      address: 'A-41, Bawadiya Kalan, Pallavi Nagar, Bhopal, Madhya Pradesh 462039',
      phone: '+919977057045',
      // Deliberate: as printed in the old footer, including the U+202A/U+202C bidi
      // isolation marks and the U+00A0 between the digit groups. They are in the
      // shipped site today, so escaped here rather than tidied away.
      phoneDisplay: '\u202a+91\u00a099770\u00a057045\u202c',
      email: 'divyafalthecreations@gmail.com',
    },
    legal: {
      // Rendered after `© {currentYear} ` -- the year is computed at render time,
      // so only the words live here.
      copyright: 'Divyafal. All rights reserved.',
      items: [
        { label: 'Terms of Service', href: '' },
        { label: 'Shipping Policy', href: '' },
        { label: 'Refund Policy', href: '/refund-policy' },
        { label: 'Cancellation Policy', href: '/cancellation-policy' },
      ],
    },
  },

  contact: {
    hero: {
      breadcrumb: [
        { label: 'Home', href: '/' },
        { label: 'Contact Us', href: '' },
      ],
      heading: 'Contact Us',
    },
    info: {
      heading: 'Contact Us',
      image: '/photo.jpg',
      imageAlt: 'Contact Us',
      address: 'A-41, Bawadiya Kalan, Pallavi Nagar, Bhopal, Madhya Pradesh 462039',
      hours: ['Mon - Sat, 11:00am - 8:00pm,', 'Sunday- Closed'],
      phoneLabel: 'Phone:',
      phone: '9977057045',
      emailLabel: 'Gmail:',
      email: 'divyafalthecreations@gmail.com',
    },
    // From `components/features/maps/store-location-map.tsx`, which the contact page
    // renders between the hero and the form. Its store hours are worded differently
    // from `contact.info.hours` above; both are preserved as written.
    store: {
      heading: 'Visit Our Store',
      body: "Experience our exquisite collection in person. We're here to help you find the perfect piece.",
      mapTitle: 'Store Location Map',
      addressHeading: 'Address',
      address: 'A-41, Bawadiya Kalan, Pallavi Nagar, Bhopal, Madhya Pradesh 462039',
      hoursHeading: 'Store Hours',
      hours: ['Mon - Sat: 11:00am - 8:00pm', 'Sunday: Closed'],
      contactHeading: 'Contact',
      phone: '9977057045',
      email: 'divyafalthecreations@gmail.com',
      directionsCta: 'Get Directions',
    },
    form: {
      heading: 'Get in Touch',
      fields: [
        { label: 'Name', placeholder: 'Name' },
        { label: 'Email *', placeholder: 'Email' },
        { label: 'Phone', placeholder: 'Phone No.' },
        { label: 'Your message', placeholder: 'Your message' },
      ],
      submit: 'Submit Now',
    },
  },

  // The two listing pages, from `app/products/page.tsx` and `app/sale/page.tsx` as they stood
  // before the revamp. Only the brand-voice sentences live here; interface labels (buttons,
  // filter legends, counts) stay in the components.
  products: {
    loading: {
      heading: 'Loading Products...',
      body: 'Please wait while we fetch the latest collection.',
    },
    empty: {
      body: 'Stay Tuned! What you want might be on its way!',
    },
  },

  sale: {
    hero: {
      subheading: 'Exclusive deals and discounts on premium products',
    },
    loading: {
      heading: 'Loading Sale Products...',
      body: 'Finding the best deals for you!',
    },
    empty: {
      body: 'Check back soon for amazing deals and discounts!',
    },
  },

  // The site-wide 404, transcribed from `app/not-found.tsx` as it stood before the revamp.
  // `code` is the numeral the old page set at `text-9xl`; it is page content, not apparatus,
  // so it lives here rather than in the component.
  notFound: {
    code: '404',
    heading: 'Page Not Found',
    body: "The page you're looking for doesn't exist or has been moved.",
    homeCta: 'Go Home',
    backCta: 'Go Back',
  },

  // The product detail page, from `product-details.tsx` and `you-may-also-like.tsx` as they stood
  // before the revamp. Interface labels (image controls, size letters, the enquiry button) stay in
  // the components; these are the brand-voice sentences and the section headings above them.
  product: {
    description: {
      heading: 'Description',
    },
    shipping: {
      heading: 'Shipping Information',
      items: [
        'We offer free shipping on all orders above Rs. 5,000. Orders are typically processed within 2-3 business days.',
        'Standard delivery takes 5-7 business days across India.',
        'For international orders, shipping time varies between 10-15 business days depending on the destination.',
        'Express shipping options are available at checkout for faster delivery.',
      ],
    },
    care: {
      heading: 'Care Instruction',
      items: [
        "Dry clean only to maintain the fabric's quality and embellishments.",
        'Store in a cool, dry place away from direct sunlight.',
        'Avoid contact with perfumes, deodorants, and other chemicals.',
        'For silk sarees, wrap in a muslin cloth to prevent damage from moisture and insects.',
        'Iron on low heat with a cotton cloth between the iron and the fabric.',
      ],
    },
    disclaimer: {
      heading: 'Disclaimer',
      items: [
        'Colors may vary slightly from the images due to different screen resolutions and lighting conditions.',
        'Each piece is handcrafted, so minor variations in embroidery and weave are natural and add to the uniqueness of the product.',
        'Custom orders and Made-to-Order pieces are non-returnable and non-exchangeable.',
        'Please check the size chart carefully before placing an order. Alterations may be charged separately.',
        'We do not accept returns on sale items or final sale merchandise.',
      ],
    },
    related: {
      heading: 'You may also like',
    },
    // From `app/product/[id]/not-found.tsx`. `heading` is also the metadata title the route's
    // `generateMetadata` returns for a product that does not resolve.
    notFound: {
      heading: 'Product Not Found',
      body: "Sorry, the product you're looking for doesn't exist or has been removed from our collection.",
      browseCta: 'Browse All Products',
      homeCta: 'Go Home',
    },
  },

  academy: {
    hero: {
      heading: 'Virasat Academy',
      body: 'Embark on a journey to master the art of traditional Indian fashion design. Apply now to join our esteemed academy.',
    },
    form: {
      heading: 'Application Form',
      subheading: 'Fill in your details to apply for Virasat Academy',
      fields: [
        { label: 'Full Name', placeholder: 'Enter your full name' },
        { label: 'Date of Birth', placeholder: '' },
        { label: 'Phone Number', placeholder: '+91 XXXXX XXXXX' },
        { label: 'City', placeholder: 'Enter your city' },
        { label: 'State', placeholder: 'Enter your state' },
        { label: 'Country', placeholder: 'Country' },
        { label: 'Gender', placeholder: '' },
        {
          label: 'Additional Comments',
          placeholder: 'Tell us more about yourself and why you want to join Virasat Academy...',
        },
      ],
      defaultCountry: 'India',
      genderOptions: [
        { value: '', label: 'Select Gender' },
        { value: 'male', label: 'Male' },
        { value: 'female', label: 'Female' },
        { value: 'non-binary', label: 'Non-Binary' },
        { value: 'prefer-not-to-say', label: 'Prefer not to say' },
      ],
      submit: 'Submit Application',
    },
    success: {
      heading: 'Submission Successful!',
      body: 'Thank you! Stay tuned while we look into your application.',
    },
  },

  refundPolicy: {
    meta: {
      title: 'Refund Policy | Divyafal',
      description: 'Learn about our refund policy for boutique clothing and accessories.',
    },
    hero: {
      heading: 'Refund Policy',
      subheading: 'Your satisfaction is our priority',
    },
    intro:
      'At Divyafal, we want you to be completely satisfied with your purchase. If for any reason you are not happy with your order, we offer a comprehensive refund policy to ensure your peace of mind.',
    returnWindow: {
      heading: 'Return Window',
      body: 'We accept returns within 7 days of delivery. To be eligible for a return, items must be:',
      items: [
        'Unused and in the same condition that you received them',
        'In the original packaging with all tags attached',
        'Accompanied by the original receipt or proof of purchase',
      ],
    },
    nonReturnable: {
      heading: 'Non-Returnable Items',
      body: 'For hygiene and quality reasons, the following items cannot be returned:',
      items: [
        'Intimate apparel and undergarments',
        'Customized or personalized items',
        'Sale or clearance items (unless defective)',
        'Items marked as "Final Sale"',
      ],
    },
    process: {
      heading: 'Refund Process',
      steps: [
        {
          label: 'Initiate Return:',
          body: 'Contact our customer service team at divyafalthecreations@gmail.com with your order number and reason for return.',
        },
        {
          label: 'Return Authorization:',
          body: 'We will provide you with a return authorization and shipping instructions.',
        },
        {
          label: 'Ship Item:',
          body: 'Securely package the item and ship it to the address provided.',
        },
        {
          label: 'Inspection:',
          body: 'Once we receive your return, we will inspect the item and notify you of the approval or rejection of your refund.',
        },
        {
          label: 'Refund:',
          body: 'If approved, your refund will be processed within 5-7 business days to your original payment method.',
        },
      ],
    },
    exchanges: {
      heading: 'Exchanges',
      body: 'We gladly accept exchanges for size or color variations. If you need to exchange an item, please contact us at divyafalthecreations@gmail.com and we will guide you through the process. Exchanges are subject to availability.',
    },
    shippingCosts: {
      heading: 'Return Shipping Costs',
      body: 'Return shipping costs are the responsibility of the customer unless the item received was defective or incorrect. In such cases, we will provide a prepaid return label.',
    },
    damaged: {
      heading: 'Damaged or Defective Items',
      body: 'If you receive a damaged or defective item, please contact us immediately at divyafalthecreations@gmail.com with photos of the item. We will arrange for a replacement or full refund, including return shipping costs.',
    },
    questions: {
      heading: 'Questions?',
      body: "If you have any questions about our refund policy, please don't hesitate to contact us:",
      emailLabel: 'Email:',
      email: 'divyafalthecreations@gmail.com',
      phoneLabel: 'Phone:',
      phone: '+919977057045',
      // Deliberate: the bidi marks and non-breaking spaces are in the shipped page.
      phoneDisplay: '\u202a+91\u00a099770\u00a057045\u202c',
      addressLabel: 'Address:',
      address: 'A-41, Bawadiya Kalan, Pallavi Nagar, Bhopal, Madhya Pradesh 462039',
    },
    lastUpdated: 'Last updated: December 2025',
  },

  cancellationPolicy: {
    meta: {
      title: 'Cancellation Policy | Divyafal',
      description:
        'Learn about our order cancellation policy for boutique clothing and accessories.',
    },
    hero: {
      heading: 'Cancellation Policy',
      subheading: 'Flexible options for order modifications',
    },
    intro:
      'At Divyafal, we understand that plans can change. We strive to provide flexibility with our cancellation policy while ensuring efficient order processing and delivery.',
    window: {
      heading: 'Order Cancellation Window',
      body: 'You may cancel your order within 24 hours of placing it, provided the order has not been shipped. Once an order has been dispatched, it cannot be cancelled but may be eligible for return under our Refund Policy.',
      tip: {
        emoji: '💡',
        heading: 'Quick Tip',
        body: 'To check your order status, log into your account or contact our customer service team at divyafalthecreations@gmail.com',
      },
    },
    howTo: {
      heading: 'How to Cancel Your Order',
      body: 'To cancel an order, please follow these steps:',
      steps: [
        {
          label: 'Contact Us Immediately:',
          body: 'Email us at divyafalthecreations@gmail.com or call +919977057045',
        },
        {
          label: 'Provide Order Details:',
          body: 'Include your order number and the email address used for the purchase.',
        },
        {
          label: 'Confirmation:',
          body: 'We will verify the order status and confirm the cancellation via email within 2-4 hours.',
        },
        {
          label: 'Refund Processing:',
          body: 'If the cancellation is successful, your refund will be processed within 5-7 business days to your original payment method.',
        },
      ],
    },
    nonCancellable: {
      heading: 'Non-Cancellable Orders',
      body: 'The following types of orders cannot be cancelled once placed:',
      items: [
        'Orders that have already been shipped',
        'Customized or personalized items (production begins immediately)',
        'Special occasion orders placed less than 7 days before the event date',
        'Items marked as "Made to Order"',
      ],
      footnote:
        'For these orders, please refer to our Refund Policy for return options after delivery.',
    },
    modification: {
      heading: 'Modification of Orders',
      body: 'If you need to modify your order (change size, color, shipping address, etc.), please contact us within 12 hours of placing the order. We will do our best to accommodate your request, but modifications cannot be guaranteed once the order is being processed.',
      note: {
        emoji: '⚠️',
        heading: 'Important Note',
        body: 'Shipping address changes cannot be made once the order has been dispatched. Please ensure your shipping information is correct before completing your purchase.',
      },
    },
    timeline: {
      heading: 'Refund Timeline',
      body: 'Once your cancellation is confirmed:',
      items: [
        {
          label: 'Credit/Debit Cards:',
          body: 'Refunds typically appear within 5-7 business days',
        },
        {
          label: 'Net Banking:',
          body: 'Refunds typically appear within 5-7 business days',
        },
        {
          label: 'UPI/Wallets:',
          body: 'Refunds typically appear within 3-5 business days',
        },
        {
          label: 'Cash on Delivery:',
          body: "If you paid via COD and the order hasn't shipped, no refund is necessary",
        },
      ],
      footnote:
        'Please note that the actual time for the refund to reflect in your account may vary depending on your bank or payment provider.',
    },
    sellerInitiated: {
      heading: 'Seller-Initiated Cancellations',
      body: 'In rare cases, we may need to cancel an order due to:',
      items: [
        'Product unavailability or stock issues',
        'Pricing or product information errors',
        'Payment verification issues',
        'Inability to deliver to the specified address',
      ],
      footnote:
        'If we cancel your order, you will be notified immediately via email and phone. A full refund will be processed automatically within 5-7 business days.',
    },
    help: {
      heading: 'Need Help?',
      body: 'If you have any questions about our cancellation policy or need assistance with an order, our customer service team is here to help:',
      emailLabel: 'Email:',
      email: 'divyafalthecreations@gmail.com',
      phoneLabel: 'Phone:',
      phone: '+919977057045',
      // Deliberate: the bidi marks and non-breaking spaces are in the shipped page.
      phoneDisplay: '\u202a+91\u00a099770\u00a057045\u202c',
      hoursLabel: 'Business Hours:',
      hours: 'Monday - Saturday, 10:00 AM - 7:00 PM IST',
      addressLabel: 'Address:',
      address: 'A-41, Bawadiya Kalan, Pallavi Nagar, Bhopal, Madhya Pradesh 462039',
    },
    lastUpdated: 'Last updated: December 2025',
  },
} as const;

export type SiteCopy = typeof siteCopy;
