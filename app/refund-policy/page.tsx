import Footer from '@/components/layout/footer';

export const metadata = {
  title: 'Refund Policy | Divyafal',
  description: 'Learn about our refund policy for boutique clothing and accessories.',
};

export default function RefundPolicyPage() {
  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-16 sm:py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl sm:text-5xl font-serif font-bold mb-4">Refund Policy</h1>
            <p className="text-gray-300 text-lg">Your satisfaction is our priority</p>
          </div>
        </div>

        {/* Content Section */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="prose prose-lg max-w-none">
            {/* Introduction */}
            <section className="mb-12">
              <p className="text-gray-700 leading-relaxed mb-6">
                At Divyafal, we want you to be completely satisfied with your purchase. If for any
                reason you are not happy with your order, we offer a comprehensive refund policy to
                ensure your peace of mind.
              </p>
            </section>

            {/* Return Window */}
            <section className="mb-12">
              <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">
                Return Window
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We accept returns within <strong>7 days</strong> of delivery. To be eligible for a
                return, items must be:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>Unused and in the same condition that you received them</li>
                <li>In the original packaging with all tags attached</li>
                <li>Accompanied by the original receipt or proof of purchase</li>
              </ul>
            </section>

            {/* Non-Returnable Items */}
            <section className="mb-12">
              <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">
                Non-Returnable Items
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                For hygiene and quality reasons, the following items cannot be returned:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li>Intimate apparel and undergarments</li>
                <li>Customized or personalized items</li>
                <li>Sale or clearance items (unless defective)</li>
                <li>Items marked as &quot;Final Sale&quot;</li>
              </ul>
            </section>

            {/* Refund Process */}
            <section className="mb-12">
              <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">
                Refund Process
              </h2>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
                <ol className="list-decimal pl-6 text-gray-700 space-y-3">
                  <li>
                    <strong>Initiate Return:</strong> Contact our customer service team at{' '}
                    <a
                      href="mailto:hello@divyafal.com"
                      className="text-gray-900 underline hover:text-gray-700"
                    >
                      hello@divyafal.com
                    </a>{' '}
                    with your order number and reason for return.
                  </li>
                  <li>
                    <strong>Return Authorization:</strong> We will provide you with a return
                    authorization and shipping instructions.
                  </li>
                  <li>
                    <strong>Ship Item:</strong> Securely package the item and ship it to the address
                    provided.
                  </li>
                  <li>
                    <strong>Inspection:</strong> Once we receive your return, we will inspect the
                    item and notify you of the approval or rejection of your refund.
                  </li>
                  <li>
                    <strong>Refund:</strong> If approved, your refund will be processed within 5-7
                    business days to your original payment method.
                  </li>
                </ol>
              </div>
            </section>

            {/* Exchanges */}
            <section className="mb-12">
              <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">Exchanges</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We gladly accept exchanges for size or color variations. If you need to exchange an
                item, please contact us at{' '}
                <a
                  href="mailto:hello@divyafal.com"
                  className="text-gray-900 underline hover:text-gray-700"
                >
                  hello@divyafal.com
                </a>{' '}
                and we will guide you through the process. Exchanges are subject to availability.
              </p>
            </section>

            {/* Shipping Costs */}
            <section className="mb-12">
              <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">
                Return Shipping Costs
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Return shipping costs are the responsibility of the customer unless the item
                received was defective or incorrect. In such cases, we will provide a prepaid return
                label.
              </p>
            </section>

            {/* Damaged or Defective Items */}
            <section className="mb-12">
              <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">
                Damaged or Defective Items
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you receive a damaged or defective item, please contact us immediately at{' '}
                <a
                  href="mailto:hello@divyafal.com"
                  className="text-gray-900 underline hover:text-gray-700"
                >
                  hello@divyafal.com
                </a>{' '}
                with photos of the item. We will arrange for a replacement or full refund, including
                return shipping costs.
              </p>
            </section>

            {/* Contact Information */}
            <section className="mb-12">
              <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-4">Questions?</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you have any questions about our refund policy, please don&apos;t hesitate to
                contact us:
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <p className="text-gray-700 mb-2">
                  <strong>Email:</strong>{' '}
                  <a
                    href="mailto:hello@divyafal.com"
                    className="text-gray-900 underline hover:text-gray-700"
                  >
                    hello@divyafal.com
                  </a>
                </p>
                <p className="text-gray-700 mb-2">
                  <strong>Phone:</strong>{' '}
                  <a
                    href="tel:+919876543210"
                    className="text-gray-900 underline hover:text-gray-700"
                  >
                    ‪+91 99770 57045‬
                  </a>
                </p>
                <p className="text-gray-700">
                  <strong>Address:</strong> A-41, Bawadiya Kalan, Pallavi Nagar, Bhopal, Madhya
                  Pradesh 462039
                </p>
              </div>
            </section>

            {/* Last Updated */}
            <section className="border-t border-gray-200 pt-8">
              <p className="text-sm text-gray-500 italic">Last updated: December 2025</p>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
